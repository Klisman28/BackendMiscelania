const boom = require('@hapi/boom');
const { models } = require('../../libs/sequelize');

class ConfigsService {

    async findFirst(companyId) {
        const config = await models.Config.findOne({
            where: { companyId }
        });
        if (!config) {
            throw boom.notFound('No se encontró ninguna configuración');
        }
        return config;
    }

    async create(data, companyId) {
        const { companyId: _c, company_id: _ci, ...safe } = data;
        const config = await models.Config.create({ ...safe, companyId });
        return config;
    }

    async findOne(id, companyId) {
        const config = await models.Config.findOne({
            where: { id, companyId }
        });
        if (!config) {
            throw boom.notFound('No se encontró ninguna configuración');
        }
        return config;
    }

    async update(id, changes, companyId) {
        let config = await this.findOne(id, companyId);
        config = await config.update(changes);
        return config;
    }

    async delete(id, companyId) {
        const config = await this.findOne(id, companyId);
        await config.destroy();
        return { id };
    }
}

module.exports = ConfigsService;