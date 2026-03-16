const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models } = require('../../libs/sequelize');

class SubcategoriesService {
    async find(query, companyId) {
        const { limit, offset, search, sortColumn, sortDirection, categoryId } = query;
        const options = {
            where: { companyId },
            include: ['category'],
            order: [(sortColumn) ? [sortColumn, sortDirection] : ['id', 'DESC']]
        }
        const optionsCount = { where: { companyId } };

        if (categoryId) {
            options.where.categoryId = parseInt(categoryId);
            optionsCount.where.categoryId = parseInt(categoryId);
        }

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

        const subcategories = await models.Subcategory.findAll(options);
        const total = await models.Subcategory.count(optionsCount);

        return { subcategories, total };
    }

    async create(data, companyId) {
        const { companyId: _c, company_id: _ci, ...safe } = data;
        const subcategory = await models.Subcategory.create({ ...safe, companyId });
        return subcategory;
    }

    async findOne(id, companyId) {
        const subcategory = await models.Subcategory.findOne({
            where: { id, companyId },
            include: [
                {
                    model: models.Category,
                    as: 'category',
                }
            ]
        });
        if (!subcategory) {
            throw boom.notFound('No se encontro ninguna subcategoria');
        }
        return subcategory;
    }

    async update(id, changes, companyId) {
        let subcategory = await this.findOne(id, companyId);
        subcategory = await subcategory.update(changes);
        return subcategory;
    }

    async delete(id, companyId) {
        const subcategory = await this.findOne(id, companyId);
        await subcategory.destroy();
        return { id };
    }
}

module.exports = SubcategoriesService;