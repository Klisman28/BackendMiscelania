const boom = require('@hapi/boom');
const { models } = require('../../libs/sequelize');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

class UsersService {
    async find(query, companyId) {
        const { limit, offset, search, sortColumn, sortDirection } = query;

        const baseWhere = companyId ? { companyId } : {};

        const options = {
            order: [(sortColumn) ? [sortColumn, sortDirection] : ['id', 'DESC']],
            where: { ...baseWhere },
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

        const optionsCount = {
            where: { ...baseWhere }
        };

        if (limit && offset) {
            options.limit = parseInt(limit);
            options.offset = parseInt(offset);
        }

        if (search) {
            const searchCondition = {
                [Op.or]: [
                    { username: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } }
                ]
            };
            options.where = { ...options.where, ...searchCondition };
            optionsCount.where = { ...optionsCount.where, ...searchCondition };
        }

        const users = await models.User.findAll(options);
        const totalUsers = await models.User.count(optionsCount);

        return { users, totalUsers };
    }

    async findRoles() {
        const roles = await models.Role.findAll();
        return roles;
    }

    async create(data, companyId) {
        // Ignorar el companyId si el cliente intenta un spoofing, forzar el del token
        const safeData = { ...data, companyId };
        const isActive = safeData.status !== false; // Default true si undefined
        if (isActive && companyId) {
            await this._checkSeatsLimit(companyId);
        }

        const hash = await bcrypt.hash(safeData.password, 10);
        const userData = {
            ...safeData,
            password: hash,
            userableId: safeData.userableId ?? null,
            userableType: safeData.userableType ?? null
        };

        const user = await models.User.create(userData);

        if (safeData.roles && safeData.roles.length > 0) {
            for (const id of safeData.roles) {
                const role = await models.Role.findByPk(id);
                if (role) await user.addRole(role);
            }
        }

        // Crear Mebresía
        if (companyId) {
            await models.CompanyUser.create({
                companyId,
                userId: user.id,
                role: 'staff', // o el rol que proceda dentro del tenant si se pasara en data
                status: isActive ? 'active' : 'suspended'
            });
        }

        delete user.dataValues.password;
        return user;
    }


    async addRole(data) {
        const res = await models.RoleUser.create(data);
        return res;
    }

    async findOne(id, companyId) {
        const options = {
            attributes: {
                exclude: ['password', 'createdAt', 'updatedAt']
            },
            include: [
                {
                    model: models.Role,
                    as: 'roles',
                    through: { attributes: [] }
                },
                {
                    model: models.Employee,
                    as: 'employee',
                    attributes: ['fullname', 'dni', 'id']
                }
            ]
        };

        if (companyId) {
            options.include.push({
                model: models.CompanyUser,
                as: 'memberships',
                where: { companyId },
                required: true
            });
        }

        const user = await models.User.findByPk(id, options);
        if (!user) {
            throw boom.notFound('No se encontro ningún usuario (o no tienes permiso en este tenant)');
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

    async update(id, changes, companyId) {
        let user = await this.findOne(id, companyId);

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

    async updatePassword(id, changes, companyId) {
        let user = await this.findOne(id, companyId);
        const hash = await bcrypt.hash(changes.password, 10);

        user = await user.update({
            password: hash
        });

        delete user.dataValues.password;
        delete user.dataValues.roles;

        return user;
    }

    async delete(id, companyId) {
        let user = await this.findOne(id, companyId);

        // Soft delete de la membresía en vez de destruir al usuario globalmente
        if (companyId) {
            await models.CompanyUser.destroy({ where: { userId: user.id, companyId } });
        } else {
            await user.destroy(); // Caso superadmin (companyId null)
        }

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