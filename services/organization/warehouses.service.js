const boom = require('@hapi/boom');
const { models } = require('../../libs/sequelize');

class WarehouseService {
    async find(companyId) {
        const warehouses = await models.Warehouse.findAll({
            where: { companyId }
        });
        return warehouses;
    }

    async findOne(id, companyId) {
        const warehouse = await models.Warehouse.findOne({
            where: { id, companyId }
        });
        if (!warehouse) {
            throw boom.notFound('Warehouse not found');
        }
        return warehouse;
    }

    async create(data, companyId) {
        const newWarehouse = await models.Warehouse.create({
            ...data,
            companyId
        });
        return newWarehouse;
    }

    async update(id, changes, companyId) {
        const warehouse = await this.findOne(id, companyId);
        const rta = await warehouse.update(changes);
        return rta;
    }

    async delete(id, companyId) {
        const warehouse = await this.findOne(id, companyId);
        await warehouse.destroy();
        return { id };
    }
}

module.exports = WarehouseService;
