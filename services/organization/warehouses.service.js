const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models } = require('../../libs/sequelize');

class WarehouseService {
    async find(companyId, query = {}) {
        const where = { companyId };

        // Filter by type (tienda / bodega)
        if (query.type) {
            where.type = query.type;
        }

        // Filter by active status
        if (query.active !== undefined) {
            where.active = query.active === 'true' || query.active === true;
        }

        const limit = parseInt(query.pageSize, 10) || parseInt(query.limit, 10) || 10;
        let pageIndex = parseInt(query.pageIndex, 10);
        if (isNaN(pageIndex)) {
            pageIndex = parseInt(query.page, 10) || 1;
        } else if (pageIndex === 0) { // Si viene 0 (ej. React Table 0-based p1), lo tratamos como pag 1
            pageIndex = 1;
        }

        const offset = Math.max(0, (pageIndex - 1) * limit);

        const { count, rows } = await models.Warehouse.findAndCountAll({
            where,
            limit,
            offset
        });

        return {
            data: rows,
            total: count,
            meta: {
                pageIndex,
                pageSize: limit
            }
        };
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

    /**
     * Find all warehouses of type 'tienda' for a given company.
     * Used by sales / POS module to restrict operations to stores only.
     */
    async findStores(companyId) {
        return models.Warehouse.findAll({
            where: { companyId, type: 'tienda', active: true }
        });
    }

    /**
     * Get products with stock available in stores (type = 'tienda') for a company.
     * Returns products that have stock > 0 in at least one active store.
     * Used by "Nueva Venta" to show only sellable products.
     */
    async getStoreProducts(companyId, query = {}) {
        const { search, pageIndex = 1, pageSize = 50 } = query;
        const limit = Math.min(parseInt(pageSize, 10), 100);
        const offset = (parseInt(pageIndex, 10) - 1) * limit;

        // 1. Find all active stores for this company
        const stores = await models.Warehouse.findAll({
            where: { companyId, type: 'tienda', active: true },
            attributes: ['id']
        });

        if (stores.length === 0) {
            return { data: [], total: 0, meta: { pageIndex: parseInt(pageIndex, 10), pageSize: limit } };
        }

        const storeIds = stores.map(s => s.id);

        // 2. Build query: products with stock > 0 in any store
        const balanceWhere = {
            warehouseId: { [Op.in]: storeIds },
            quantity: { [Op.gt]: 0 },
            companyId
        };

        const includeOptions = [
            {
                model: models.Product,
                as: 'product',
                attributes: ['id', 'name', 'sku', 'price', 'imageUrl', 'imageKey', 'stock', 'stockMin'],
                include: [
                    { model: models.Brand, as: 'brand', attributes: ['id', 'name'] },
                    { model: models.Unit, as: 'unit', attributes: ['id', 'symbol'] },
                    { model: models.Subcategory, as: 'subcategory', attributes: ['id', 'name'] }
                ]
            },
            {
                model: models.Warehouse,
                as: 'warehouse',
                attributes: ['id', 'name', 'type']
            }
        ];

        // Search filter
        if (search && search.trim()) {
            includeOptions[0].where = {
                [Op.or]: [
                    { name: { [Op.like]: `%${search}%` } },
                    { sku: { [Op.like]: `%${search}%` } }
                ]
            };
        }

        const { count, rows } = await models.InventoryBalance.findAndCountAll({
            where: balanceWhere,
            include: includeOptions,
            limit,
            offset,
            order: [[{ model: models.Product, as: 'product' }, 'name', 'ASC']]
        });

        // Re-shape for frontend convenience
        const data = rows.map(balance => ({
            productId: balance.productId,
            product: balance.product,
            warehouseId: balance.warehouseId,
            warehouse: balance.warehouse,
            storeStock: balance.quantity
        }));

        return {
            data,
            total: count,
            meta: {
                pageIndex: parseInt(pageIndex, 10),
                pageSize: limit
            }
        };
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
