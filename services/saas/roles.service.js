const boom = require('@hapi/boom');
const { models } = require('../../libs/sequelize');

class RolesService {
    async find() {
        const roles = await models.Role.findAll({
            order: [['id', 'DESC']]
        });
        return roles;
    }

    async findOne(id) {
        const role = await models.Role.findByPk(id);
        if (!role) {
            throw boom.notFound('Rol no encontrado');
        }
        return role;
    }

    async create(data) {
        const existingRole = await models.Role.findOne({ where: { name: data.name } });
        if (existingRole) {
            throw boom.conflict('El nombre del rol ya existe');
        }
        const newRole = await models.Role.create(data);
        return newRole;
    }

    async update(id, changes) {
        const role = await this.findOne(id);

        if (changes.name && changes.name !== role.name) {
            const existingRole = await models.Role.findOne({ where: { name: changes.name } });
            if (existingRole) {
                throw boom.conflict('El nombre del rol ya está en uso');
            }
        }

        const updatedRole = await role.update(changes);
        return updatedRole;
    }

    async delete(id) {
        const role = await this.findOne(id);

        // Check if role is assigned to any user
        const usersWithRole = await models.RoleUser.count({
            where: { roleId: id }
        });

        if (usersWithRole > 0) {
            throw boom.conflict(`No se puede eliminar el rol porque está asignado a ${usersWithRole} usuario(s)`);
        }

        await role.destroy();
        return { id };
    }
}

module.exports = RolesService;
