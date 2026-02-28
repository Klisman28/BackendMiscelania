const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models } = require('../../libs/sequelize');

class EnterprisesService {
    async find(query, companyId) {
        const { limit, offset, search, sortColumn, sortDirection } = query;

        const options = {
            where: { companyId },
            order: [(sortColumn) ? [sortColumn, sortDirection] : ['id', 'DESC']]
        }
        const optionsCount = { where: { companyId } };

        if (limit && offset) {
            options.limit = parseInt(limit);
            options.offset = parseInt(offset);
        }

        if (search) {
            options.where = {
                ...options.where,
                name: {
                    [Op.like]: `%${search}%`
                }
            }

            optionsCount.where = {
                ...optionsCount.where,
                name: {
                    [Op.like]: `%${search}%`
                }
            }
        }

        const enterprises = await models.Enterprise.findAll(options);
        const total = await models.Enterprise.count(optionsCount);

        return { enterprises, total };
    }

    async create(data, companyId) {
        const { companyId: _c, company_id: _ci, ...safe } = data;
        const enterprise = await models.Enterprise.create({ ...safe, companyId });
        return enterprise;
    }

    async findOne(id, companyId) {
        const enterprise = await models.Enterprise.findOne({ where: { id, companyId } });
        if (!enterprise) {
            throw boom.notFound('No se encontro ninguna empresa');
        }
        return enterprise;
    }

    async update(id, changes, companyId) {
        let enterprises = await this.findOne(id, companyId);
        enterprises = await enterprises.update(changes);
        return enterprises;
    }

    async delete(id, companyId) {
        const enterprise = await this.findOne(id, companyId);
        await enterprise.destroy();
        return { id };
    }
}

module.exports = EnterprisesService;