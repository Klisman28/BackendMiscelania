const boom = require('@hapi/boom');
const { models } = require('../../libs/sequelize');

class WarehouseService {
    async find() {
        const warehouses = await models.Warehouse.findAll();
        return warehouses;
    }

    async findOne(id) {
        const warehouse = await models.Warehouse.findByPk(id);
        if (!warehouse) {
            throw boom.notFound('Warehouse not found');
        }
        return warehouse;
    }

    async create(data) {
        const newWarehouse = await models.Warehouse.create(data);
        return newWarehouse;
    }

    async update(id, changes) {
        const warehouse = await this.findOne(id);
        const rta = await warehouse.update(changes);
        return rta;
    }

    async delete(id) {
        const warehouse = await this.findOne(id);
        await warehouse.destroy();
        return { id };
    }
}

module.exports = WarehouseService;
