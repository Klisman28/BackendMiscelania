const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models } = require('../../libs/sequelize');

class CashiersService {
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

        const cashiers = await models.Cashier.findAll(options);
        const total = await models.Cashier.count(optionsCount);

        return { cashiers, total };
    }

    async create(data, companyId) {
        const { companyId: _c, company_id: _ci, ...safe } = data;
        const cashier = await models.Cashier.create({ ...safe, companyId });
        return cashier;
    }

    async findOne(id, companyId) {
        const cashier = await models.Cashier.findOne({
            where: { id, companyId }
        });
        if (!cashier) {
            throw boom.notFound('No se encontró ninguna caja');
        }
        return cashier;
    }

    async findByStatus(companyId) {
        const cashiers = await models.Cashier.findAll({
            where: {
                status: 0,
                companyId
            }
        });
        if (!cashiers) {
            throw boom.notFound('No se encontró ninguna caja disponible');
        }
        return cashiers;
    }

    async update(id, changes, companyId) {
        let cashier = await this.findOne(id, companyId);
        cashier = await cashier.update(changes);
        return cashier;
    }

    async delete(id, companyId) {
        const cashier = await this.findOne(id, companyId);
        await cashier.destroy();
        return { id };
    }
}

module.exports = CashiersService;