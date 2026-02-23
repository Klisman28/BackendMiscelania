const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models, sequelize } = require('../../libs/sequelize');

class InventoryService {

    async addStock(data, companyId) {
        // data: { warehouseId, productId, quantity, description, userId }
        const t = await sequelize.transaction();
        try {
            const { warehouseId, productId, quantity, description, userId } = data;

            // 1. Verify warehouse and product exist
            const warehouse = await models.Warehouse.findOne({ where: { id: warehouseId, companyId }, transaction: t });
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
                createdAt: new Date(),
                companyId
            }, { transaction: t });

            // 3. Update Balance
            const balance = await models.InventoryBalance.findOne({
                where: { warehouseId, productId, companyId },
                transaction: t
            });

            if (balance) {
                await balance.increment('quantity', { by: quantity, transaction: t });
            } else {
                await models.InventoryBalance.create({
                    warehouseId,
                    productId,
                    quantity,
                    companyId
                }, { transaction: t });
            }

            await t.commit();
            return { message: 'Stock agregado correctamente' };

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    async removeStock(data, companyId) {
        // data: { warehouseId, productId, quantity, description, userId }
        const t = await sequelize.transaction();
        try {
            const { warehouseId, productId, quantity, description, userId } = data;

            // 1. Verify existence
            const balance = await models.InventoryBalance.findOne({
                where: { warehouseId, productId, companyId },
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
                createdAt: new Date(),
                companyId
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

    async transfer(data, companyId) {
        // data: { fromWarehouseId, toWarehouseId, items: [{ productId, quantity }], userId, observation }
        const t = await sequelize.transaction();
        try {
            const { fromWarehouseId, toWarehouseId, items, userId, observation } = data;

            if (fromWarehouseId === toWarehouseId) throw boom.badRequest('Las bodegas origen y destino deben ser diferentes');

            // 1. Verify warehouses BELONG TO THIS COMPANY
            const fromWarehouse = await models.Warehouse.findOne({
                where: { id: fromWarehouseId, companyId },
                transaction: t
            });
            const toWarehouse = await models.Warehouse.findOne({
                where: { id: toWarehouseId, companyId },
                transaction: t
            });

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

                // Check Source Balance (scoped by companyId)
                const sourceBalance = await models.InventoryBalance.findOne({
                    where: { warehouseId: fromWarehouseId, productId, companyId },
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
                    createdAt: new Date(),
                    companyId
                }, { transaction: t });


                // Increment Destination (scoped by companyId)
                const destBalance = await models.InventoryBalance.findOne({
                    where: { warehouseId: toWarehouseId, productId, companyId },
                    transaction: t
                });

                if (destBalance) {
                    await destBalance.increment('quantity', { by: quantity, transaction: t });
                } else {
                    await models.InventoryBalance.create({
                        warehouseId: toWarehouseId,
                        productId,
                        quantity,
                        companyId
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
                    createdAt: new Date(),
                    companyId
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

    async listTransfers(query, companyId) {
        const { pageIndex = 1, pageSize = 10, search, sort } = query;
        const limit = parseInt(pageSize, 10);
        const offset = (parseInt(pageIndex, 10) - 1) * limit;

        const options = {
            limit,
            offset,
            include: [
                { model: models.Warehouse, as: 'fromWarehouse', where: { companyId } },
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
                    { '$fromWarehouse.name$': { [Op.like]: `%${search}%` } },
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

    async getTransferById(id, companyId) {
        const transfer = await models.Transfer.findOne({
            where: { id },
            include: [
                { model: models.Warehouse, as: 'fromWarehouse', where: { companyId } },
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

    async getBalance(warehouseId, query = {}, companyId) {
        // Extract and normalize parameters
        const pageIndex = parseInt(query.pageIndex || query.page || 1, 10);
        const pageSize = Math.min(parseInt(query.pageSize || query.limit || 10, 10), 100);
        const { search, sort } = query;

        // Validate pagination params
        if (pageIndex < 1 || pageSize < 1) {
            throw boom.badRequest('Invalid pagination parameters');
        }

        const limit = pageSize;
        const offset = (pageIndex - 1) * pageSize;

        // Build query options
        const options = {
            where: { warehouseId, companyId },
            limit,
            offset,
            include: [
                {
                    model: models.Product,
                    as: 'product',
                    attributes: ['id', 'name', 'sku', 'price']
                }
            ]
        };

        // Search filter
        if (search && search.trim()) {
            options.include[0].where = {
                [Op.or]: [
                    { name: { [Op.like]: `%${search}%` } },
                    { sku: { [Op.like]: `%${search}%` } }
                ]
            };
        }

        // Sorting with whitelist
        let order = [['createdAt', 'DESC']]; // Default order
        const sortWhitelist = ['quantity', 'createdAt', 'updatedAt'];
        const nestedSortWhitelist = {
            'product.name': [{ model: models.Product, as: 'product' }, 'name'],
            'product.sku': [{ model: models.Product, as: 'product' }, 'sku']
        };

        if (sort) {
            try {
                let sortParsed;
                try {
                    sortParsed = JSON.parse(sort);
                } catch (e) {
                    sortParsed = JSON.parse(decodeURIComponent(sort));
                }

                if (Array.isArray(sortParsed) && sortParsed.length > 0) {
                    const validSorts = [];

                    for (const sortItem of sortParsed) {
                        if (!sortItem.key) continue;

                        const direction = (sortItem.order && sortItem.order.toLowerCase() === 'asc') ? 'ASC' : 'DESC';

                        // Check if it's a whitelisted simple column
                        if (sortWhitelist.includes(sortItem.key)) {
                            validSorts.push([sortItem.key, direction]);
                        }
                        // Check if it's a whitelisted nested column
                        else if (nestedSortWhitelist[sortItem.key]) {
                            validSorts.push([...nestedSortWhitelist[sortItem.key], direction]);
                        }
                    }

                    if (validSorts.length > 0) {
                        order = validSorts;
                    }
                }
            } catch (e) {
                console.error('Sort parse error:', e);
                // Use default order on error
            }
        }

        options.order = order;

        // Execute query with count
        const { count, rows } = await models.InventoryBalance.findAndCountAll(options);

        return {
            data: rows,
            total: count
        };
    }

    async getMovements(query, companyId) {
        const { warehouseId, productId, type, limit, offset } = query;
        const options = {
            where: { companyId },
            order: [['createdAt', 'DESC']],
            include: ['product', 'warehouse']
        };

        if (warehouseId) options.where.warehouseId = warehouseId;
        if (productId) options.where.productId = productId;
        if (type) options.where.type = type;

        if (query.dateFrom || query.dateTo) {
            options.where.createdAt = {};
            if (query.dateFrom) {
                options.where.createdAt[Op.gte] = new Date(query.dateFrom);
            }
            if (query.dateTo) {
                let endDate = new Date(query.dateTo);
                options.where.createdAt[Op.lte] = endDate;
            }
        }

        if (limit) options.limit = limit;
        if (offset) options.offset = offset;

        return await models.InventoryMovement.findAll(options);
    }
}

module.exports = InventoryService;
