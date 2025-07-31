const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models } = require('../../libs/sequelize');
const UsersService = require('../../services/organization/users.service');

const service = new UsersService();

class PurchasesService {
    async find(query) {
        const { limit, offset, search, sortColumn, sortDirection } = query;
        const options = {
            include: [
                {
                    model: models.Product,
                    as: 'products',
                    attributes: ['id', 'name'],
                    through: {
                        as: 'item',
                        attributes: ['quantity', 'unitCost']
                    }
                },
                {
                    model: models.Supplier,
                    as: "supplier",
                    attributes: ['name', 'ruc']
                },
                {
                    model: models.Employee,
                    as: "employee",
                    attributes: ['fullname', 'dni']
                }
            ],
            order: [(sortColumn) ? [sortColumn, sortDirection] : ['id', 'DESC']]
        }
        const optionsCount = {
            include: [
                {
                    model: models.Supplier,
                    as: "supplier",
                    attributes: ['name', 'ruc']
                },
            ]
        };

        if (limit && offset) {
            options.limit = parseInt(limit);
            options.offset = parseInt(offset);
        }

        if (search) {
            options.include[0].where = {
                number: {
                    [Op.like]: `%${search}%`
                }
            }

            optionsCount.include[0].where = {
                number: {
                    [Op.like]: `%${search}%`
                }
            }
        }

        const purchases = await models.Purchas.findAll(options);
        const total = await models.Purchas.count(optionsCount);

        return { purchases, total };
    }

    async create(data, userId) {
        const user = await service.findOne(userId);
        const employeeId = user.dataValues.employee.id

        const purchas = await models.Purchas.create(
            {
                ...data,
                employeeId
            }
        );

        if (data.products && data.products.length > 0) {
            data.products.forEach(async (item) => {
                const product = await models.Product.findByPk(item.productId);
                await purchas.addProduct(product, {through : {quantity: item.quantity, unitCost: item.unitCost}});
            });
        }
        return purchas;
    }

    async findOne(id) {
        const purchas = await models.Purchas.findByPk(id, {
            include: [
                {
                    model: models.Product,
                    as: 'products',
                    attributes: ['id', 'name'],
                    through: {
                        as: 'item',
                        attributes: ['quantity', 'unitCost']
                    }
                },
                {
                    model: models.Supplier,
                    as: 'supplier',
                    attributes: ['name', 'ruc']
                },
                {
                    model: models.Employee,
                    as: 'employee',
                    attributes: ['fullname', 'dni']
                }
            ]
        });
        if (!purchas) {
            throw boom.notFound('No se encontro ninguna compra');
        }
        return purchas;
    }

    async update(id, changes) {
        let purchas = await this.findOne(id);
        
        purchas = await purchas.update(changes);
        if (changes.products  && changes.products.length > 0) {
            await models.ProductPurchas.destroy({
                where: {
                    productId: id
                }
            });
            changes.products.forEach(async (item) => {
                const product = await models.Product.findByPk(id)
                await purchas.addProduct(product, {through : {quantity: item.quantity, unitCost: item.unitCost}});
            });
        }
        return purchas;
    }

    async delete(id) {
        const purchas = await this.findOne(id);
        await purchas.destroy();
        return { id };
    }
}

module.exports = PurchasesService;