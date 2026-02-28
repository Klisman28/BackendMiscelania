const express = require('express');

const WarehouseService = require('../../services/organization/warehouses.service');
const validatorHandler = require('../../middlewares/validator.handler');
const { createWarehouseSchema, updateWarehouseSchema, getWarehouseSchema, queryWarehouseSchema } = require('../../schemas/organization/warehouse.schema');
const { addStockSchema, queryStockSchema } = require('../../schemas/transaction/inventory.schema');

const router = express.Router();
const service = new WarehouseService();
const InventoryService = require('../../services/transaction/inventory.service');
const inventoryService = new InventoryService();


// ─── List all warehouses (filterable by ?type=tienda|bodega) ───
router.get('/',
    validatorHandler(queryWarehouseSchema, 'query'),
    async (req, res, next) => {
        try {
            const warehouses = await service.find(req.companyId, req.query);
            res.json(warehouses);
        } catch (error) {
            next(error);
        }
    }
);

// ─── Get active stores only (tiendas) ───
router.get('/stores',
    async (req, res, next) => {
        try {
            const stores = await service.findStores(req.companyId);
            res.json(stores);
        } catch (error) {
            next(error);
        }
    }
);

// ─── Products available for sale (stock > 0 in stores / tiendas) ───
// Used by "Nueva Venta" screen
router.get('/stores/products',
    async (req, res, next) => {
        try {
            const result = await service.getStoreProducts(req.companyId, req.query);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/:id',
    validatorHandler(getWarehouseSchema, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const warehouse = await service.findOne(id, req.companyId);
            res.json(warehouse);
        } catch (error) {
            next(error);
        }
    }
);

router.post('/',
    validatorHandler(createWarehouseSchema, 'body'),
    async (req, res, next) => {
        try {
            const body = req.body;
            const newWarehouse = await service.create(body, req.companyId);
            res.status(201).json(newWarehouse);
        } catch (error) {
            next(error);
        }
    }
);

router.patch('/:id',
    validatorHandler(getWarehouseSchema, 'params'),
    validatorHandler(updateWarehouseSchema, 'body'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const body = req.body;
            const warehouse = await service.update(id, body, req.companyId);
            res.json(warehouse);
        } catch (error) {
            next(error);
        }
    }
);

router.delete('/:id',
    validatorHandler(getWarehouseSchema, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            await service.delete(id, req.companyId);
            res.status(201).json({ id });
        } catch (error) {
            next(error);
        }
    }
);

// Inventory per Warehouse
router.get('/:id/stock',
    validatorHandler(getWarehouseSchema, 'params'),
    validatorHandler(queryStockSchema, 'query'),
    async (req, res, next) => {
        try {
            const { id } = req.params;

            // Verify warehouse exists
            await service.findOne(id, req.companyId);

            const stock = await inventoryService.getBalance(id, req.query, req.companyId);
            res.json(stock);
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
