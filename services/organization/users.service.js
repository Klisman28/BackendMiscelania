const boom = require('@hapi/boom');
const { models } = require('../../libs/sequelize');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

class UsersService {
    async find(query) {
        const { limit, offset, search, sortColumn, sortDirection } = query;

        const options = {
            order: [(sortColumn) ? [sortColumn, sortDirection] : ['id', 'DESC']],
            attributes: {
                exclude: ['password', 'createdAt', 'updatedAt']
            },
            include: [
                {
                    model: models.Role,
                    as: 'roles',
                    attributes: ['name', 'id'],
                    through: {
                        attributes: []
                    }
                },
                'employee'
            ]
        }
        const optionsCount = {};

        if (limit && offset) {
            options.limit = parseInt(limit);
            options.offset = parseInt(offset);
        }

        if (search) {
            options.where = {
                [Op.or]: [
                    { username: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } }
                ]
            }

            optionsCount.where = {
                [Op.or]: [
                    { username: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } }
                ]
            }
        }

        const users = await models.User.findAll(options);
        const totalUsers = await models.User.count(optionsCount);

        return { users, totalUsers };
    }

    async findRoles() {
        const roles = await models.Role.findAll();
        return roles;
    }

    async create(data) {
        // Validación de Seats SaaS
        // Si se crea activo, validar límite
        const isActive = data.status !== false; // Default true si undefined
        if (isActive && data.companyId) {
            await this._checkSeatsLimit(data.companyId);
        }

        const hash = await bcrypt.hash(data.password, 10);
        const userData = {
            ...data,
            password: hash,
            userableId: data.userableId ?? null,
            userableType: data.userableType ?? null
        };

        const user = await models.User.create(userData);

        if (data.roles && data.roles.length > 0) {
            for (const id of data.roles) {
                const role = await models.Role.findByPk(id);
                await user.addRole(role);
            }
        }

        delete user.dataValues.password;
        return user;
    }


    async addRole(data) {
        const res = await models.RoleUser.create(data);
        return res;
    }

    async findOne(id) {
        const user = await models.User.findByPk(id, {
            attributes: {
                exclude: ['password', 'createdAt', 'updatedAt']
            },
            include: [
                {
                    model: models.Role,
                    as: 'roles',
                    through: {
                        attributes: []
                    }
                },
                {
                    model: models.Employee,
                    as: 'employee',
                    attributes: ['fullname', 'dni', 'id']
                }
            ]
        });
        if (!user) {
            throw boom.notFound('No se encontro ningún usuario');
        }
        return user;
    }

    async findByUsername(username) {
        const user = await models.User.findOne({
            where: { username },
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            },
            include: [
                {
                    model: models.Role,
                    as: 'roles',
                    attributes: ['name'],
                    through: {
                        attributes: []
                    }
                }, {
                    model: models.Employee,
                    as: 'employee',
                    attributes: ['fullname', 'id']
                }
            ]
        });
        return user;
    }

    async update(id, changes) {
        let user = await this.findOne(id);

        // Validación de Seats SaaS al activar
        if (changes.status === true && user.status !== true && user.companyId) {
            await this._checkSeatsLimit(user.companyId);
        }

        user = await user.update(changes);

        if (changes.roles && changes.roles.length > 0) {
            await models.RoleUser.destroy({
                where: {
                    userId: id
                }
            });
            changes.roles.forEach(async (id) => {
                const role = await models.Role.findByPk(id);
                await user.addRole(role);
            });
        }

        delete user.dataValues.password;
        delete user.dataValues.roles;

        return user;
    }

    async updatePassword(id, changes) {
        let user = await this.findOne(id);
        const hash = await bcrypt.hash(changes.password, 10);

        user = await user.update({
            password: hash
        });

        delete user.dataValues.password;
        delete user.dataValues.roles;

        return user;
    }

    async delete(id) {
        const user = await this.findOne(id);
        await user.destroy();
        return { id };
    }
    async _checkSeatsLimit(companyId) {
        const company = await models.Company.findByPk(companyId);
        if (!company) return; // Si no hay company, no aplicamos regla

        // Contar usuarios activos
        const activeUsers = await models.User.count({
            where: {
                companyId,
                status: true
            }
        });

        // NOTA: Si estamos creando uno nuevo activo, activeUsers aún no lo incluye.
        // Si estamos updateando uno inactivo a activo, activeUsers tampoco lo incluye (status=false en DB).
        // Por tanto, la validación lógica es: Si tenemos X usuarios y el límite es X, NO podemos agregar otro.
        // Si activeUsers < company.seats, podemos crear uno más.
        // Si activeUsers >= company.seats, NO podemos.

        if (activeUsers >= company.seats) {
            throw boom.conflict(`Límite de usuarios alcanzado (${company.seats}). Actualiza tu plan para agregar más.`);
        }
    }
}

module.exports = UsersService;