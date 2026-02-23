const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models } = require('../../libs/sequelize');

class BrandsService {
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

        const brands = await models.Brand.findAll(options);
        const total = await models.Brand.count(optionsCount);

        return { brands, total };
    }

    async create(data, companyId) {
        const { companyId: _c, company_id: _ci, ...safe } = data;
        const brand = await models.Brand.create({ ...safe, companyId });
        return brand;
    }

    async findOne(id, companyId) {
        const brand = await models.Brand.findOne({
            where: { id, companyId }
        });
        if (!brand) {
            throw boom.notFound('No se encontro ninguna marca');
        }
        return brand;
    }

    async update(id, changes, companyId) {
        let brand = await this.findOne(id, companyId);
        brand = await brand.update(changes);
        return brand;
    }

    async delete(id, companyId) {
        const brand = await this.findOne(id, companyId);
        await brand.destroy();
        return { id };
    }
}

module.exports = BrandsService;