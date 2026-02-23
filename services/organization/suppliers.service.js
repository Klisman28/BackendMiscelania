const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models } = require('../../libs/sequelize');

class SuppliersService {
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

        const suppliers = await models.Supplier.findAll(options);
        const total = await models.Supplier.count(optionsCount);

        return { suppliers, total };
    }

    async create(data, companyId) {
        const { companyId: _c, company_id: _ci, ...safe } = data;
        const supplier = await models.Supplier.create({ ...safe, companyId });
        return supplier;
    }

    async findOne(id, companyId) {
        const supplier = await models.Supplier.findOne({
            where: { id, companyId }
        });
        if (!supplier) {
            throw boom.notFound('No se encontro ningún proveedor');
        }
        return supplier;
    }

    async update(id, changes, companyId) {
        let suppliers = await this.findOne(id, companyId);
        suppliers = await suppliers.update(changes);
        return suppliers;
    }

    async delete(id, companyId) {
        const supplier = await this.findOne(id, companyId);
        await supplier.destroy();
        return { id };
    }
}

module.exports = SuppliersService;