const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models, sequelize } = require('../../libs/sequelize');

class InventoryService {

    async addStock(data) {
        // data: { warehouseId, productId, quantity, description, userId }
        const t = await sequelize.transaction();
        try {
            const { warehouseId, productId, quantity, description, userId } = data;

            // 1. Verify warehouse and product exist
            const warehouse = await models.Warehouse.findByPk(warehouseId, { transaction: t });
            if (!warehouse) throw boom.notFound('Bodega no encontrada');
            if (!warehouse.active) throw boom.badRequest('Bodega inactiva');

            const product = await models.Product.findByPk(productId, { transaction: t });
            if (!product) throw boom.notFound('Producto no encontrado');

            // 2. Register Movement
            await models.InventoryMovement.create({
                productId,
                warehouseId,
                type: 'IN', // Or ADJUSTMENT_IN
                quantity,
                description: description || 'Ingreso manual',
                userId,
                createdAt: new Date()
            }, { transaction: t });

            // 3. Update Balance
            const balance = await models.InventoryBalance.findOne({
                where: { warehouseId, productId },
                transaction: t
            });

            if (balance) {
                await balance.increment('quantity', { by: quantity, transaction: t });
            } else {
                await models.InventoryBalance.create({
                    warehouseId,
                    productId,
                    quantity
                }, { transaction: t });
            }

            await t.commit();
            return { message: 'Stock agregado correctamente' };

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    async removeStock(data) {
        // data: { warehouseId, productId, quantity, description, userId }
        const t = await sequelize.transaction();
        try {
            const { warehouseId, productId, quantity, description, userId } = data;

            // 1. Verify existence
            const balance = await models.InventoryBalance.findOne({
                where: { warehouseId, productId },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (!balance) throw boom.notFound('No hay registro de stock para este producto en la bodega indicada');
            if (balance.quantity < quantity) throw boom.badRequest(`Stock insuficiente. Disponible: ${balance.quantity}`);

            // 2. Register Movement
            await models.InventoryMovement.create({
                productId,
                warehouseId,
                type: 'OUT',
                quantity, // Movements usually store just quantity, positive
                description: description || 'Salida manual',
                userId,
                createdAt: new Date()
            }, { transaction: t });

            // 3. Update Balance
            await balance.decrement('quantity', { by: quantity, transaction: t });

            await t.commit();
            return { message: 'Stock retirado correctamente' };

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    async transfer(data) {
        // data: { fromWarehouseId, toWarehouseId, items: [{ productId, quantity }], userId, observation }
        const t = await sequelize.transaction();
        try {
            const { fromWarehouseId, toWarehouseId, items, userId, observation } = data;

            if (fromWarehouseId === toWarehouseId) throw boom.badRequest('Las bodegas origen y destino deben ser diferentes');

            // 1. Verify warehouses
            const fromWarehouse = await models.Warehouse.findByPk(fromWarehouseId, { transaction: t });
            const toWarehouse = await models.Warehouse.findByPk(toWarehouseId, { transaction: t });

            if (!fromWarehouse || !toWarehouse) throw boom.notFound('Una de las bodegas no existe');
            if (!fromWarehouse.active || !toWarehouse.active) throw boom.badRequest('Una de las bodegas está inactiva');

            // 2. Create Transfer Header
            const transfer = await models.Transfer.create({
                fromWarehouseId,
                toWarehouseId,
                userId,
                status: 'COMPLETED',
                observation,
                date: new Date()
            }, { transaction: t });

            // 3. Process Items
            for (const item of items) {
                const { productId, quantity } = item;

                // Check Source Balance
                const sourceBalance = await models.InventoryBalance.findOne({
                    where: { warehouseId: fromWarehouseId, productId },
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });

                if (!sourceBalance || sourceBalance.quantity < quantity) {
                    throw boom.badRequest(`Stock insuficiente en origen para producto ID ${productId}. Disponible: ${sourceBalance ? sourceBalance.quantity : 0}`);
                }

                // Decrement Source
                await sourceBalance.decrement('quantity', { by: quantity, transaction: t });

                // Register Movement OUT
                await models.InventoryMovement.create({
                    productId,
                    warehouseId: fromWarehouseId,
                    type: 'TRANSFER_OUT',
                    quantity,
                    referenceId: transfer.id.toString(),
                    description: `Transferencia a ${toWarehouse.name}`,
                    userId,
                    createdAt: new Date()
                }, { transaction: t });


                // Increment Destination
                const destBalance = await models.InventoryBalance.findOne({
                    where: { warehouseId: toWarehouseId, productId },
                    transaction: t
                });

                if (destBalance) {
                    await destBalance.increment('quantity', { by: quantity, transaction: t });
                } else {
                    await models.InventoryBalance.create({
                        warehouseId: toWarehouseId,
                        productId,
                        quantity
                    }, { transaction: t });
                }

                // Register Movement IN
                await models.InventoryMovement.create({
                    productId,
                    warehouseId: toWarehouseId,
                    type: 'TRANSFER_IN',
                    quantity,
                    referenceId: transfer.id.toString(),
                    description: `Transferencia de ${fromWarehouse.name}`,
                    userId,
                    createdAt: new Date()
                }, { transaction: t });

                // Create Transfer Item
                await models.TransferItem.create({
                    transferId: transfer.id,
                    productId,
                    quantity
                }, { transaction: t });
            }

            await t.commit();
            return transfer;

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    async listTransfers(query) {
        const { pageIndex = 1, pageSize = 10, search, sort } = query;
        const limit = parseInt(pageSize, 10);
        const offset = (parseInt(pageIndex, 10) - 1) * limit;

        const options = {
            limit,
            offset,
            include: [
                { model: models.Warehouse, as: 'fromWarehouse' },
                { model: models.Warehouse, as: 'toWarehouse' }
            ],
            attributes: {
                include: [
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM transfer_items AS ti
                            WHERE ti.transfer_id = Transfer.id
                        )`),
                        'itemsCount'
                    ]
                ]
            }
        };

        if (search) {
            options.where = {
                [Op.or]: [
                    { observation: { [Op.like]: `%${search}%` } },
                    { status: { [Op.like]: `%${search}%` } },
                    { '$fromWarehouse.name$': { [Op.like]: `%${search}%` } }, // Requiere 'fromWarehouse' in include with alias
                    { '$toWarehouse.name$': { [Op.like]: `%${search}%` } }
                ]
            };
            if (!isNaN(search)) {
                options.where[Op.or].push({ id: search });
            }
        }

        // Sort
        let order = [['date', 'DESC']];
        const sortWhitelist = ['id', 'date', 'createdAt', 'status', 'observation'];

        if (sort) {
            try {
                let sortPars;
                try {
                    sortPars = JSON.parse(sort);
                } catch (e) {
                    sortPars = JSON.parse(decodeURIComponent(sort));
                }

                if (Array.isArray(sortPars)) {
                    const validSorts = sortPars
                        .filter(s => s.key && sortWhitelist.includes(s.key))
                        .map(s => {
                            const dir = (s.order && s.order.toLowerCase() === 'asc') ? 'ASC' : 'DESC';
                            return [s.key, dir];
                        });

                    if (validSorts.length > 0) {
                        order = validSorts;
                    }
                }
            } catch (e) {
                console.error('Sort parse error:', e);
            }
        }
        options.order = order;

        const { count, rows } = await models.Transfer.findAndCountAll(options);

        return {
            data: rows,
            meta: {
                pageIndex: parseInt(pageIndex, 10),
                pageSize: limit,
                total: count
            }
        };
    }

    async getTransferById(id) {
        const transfer = await models.Transfer.findByPk(id, {
            include: [
                { model: models.Warehouse, as: 'fromWarehouse' },
                { model: models.Warehouse, as: 'toWarehouse' },
                {
                    model: models.TransferItem,
                    as: 'items',
                    include: [
                        { model: models.Product, as: 'product' }
                    ]
                }
            ]
        });

        if (!transfer) {
            throw boom.notFound('Transferencia no encontrada');
        }

        return transfer;
    }

    async getBalance(warehouseId) {
        const balances = await models.InventoryBalance.findAll({
            where: { warehouseId },
            include: [
                {
                    model: models.Product,
                    as: 'product',
                    attributes: ['id', 'name', 'sku']
                }
            ]
        });
        return balances;
    }

    async getMovements(query) {
        const { warehouseId, productId, type, limit, offset } = query;
        const options = {
            where: {},
            order: [['createdAt', 'DESC']],
            include: ['product', 'warehouse']
        };

        if (warehouseId) options.where.warehouseId = warehouseId;
        if (productId) options.where.productId = productId;
        if (type) options.where.type = type;
        if (limit) options.limit = limit;
        if (offset) options.offset = offset;

        return await models.InventoryMovement.findAll(options);
    }
}

module.exports = InventoryService;
