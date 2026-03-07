const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models } = require('../../libs/sequelize');

class CategoriesService {
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

        const categories = await models.Category.findAll(options);
        const total = await models.Category.count(optionsCount);

        return { categories, total };
    }

    async create(data, companyId) {
        const { companyId: _c, company_id: _ci, ...safe } = data;
        const category = await models.Category.create({ ...safe, companyId });
        return category;
    }

    async findOne(id, companyId) {
        const category = await models.Category.findOne({
            where: { id, companyId }
        });
        if (!category) {
            throw boom.notFound('No se encontro ninguna categoria');
        }
        return category;
    }

    async update(id, changes, companyId) {
        let category = await this.findOne(id, companyId);
        const { companyId: _c, company_id: _ci, ...safe } = changes;
        category = await category.update(safe);
        return category;
    }

    async delete(id, companyId) {
        const category = await this.findOne(id, companyId);
        await category.destroy();
        return { id };
    }
}

module.exports = CategoriesService;