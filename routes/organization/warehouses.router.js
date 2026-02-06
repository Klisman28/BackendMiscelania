const express = require('express');

const WarehouseService = require('../../services/organization/warehouses.service');
const validatorHandler = require('../../middlewares/validator.handler');
const { createWarehouseSchema, updateWarehouseSchema, getWarehouseSchema } = require('../../schemas/organization/warehouse.schema');
const { addStockSchema, queryStockSchema } = require('../../schemas/transaction/inventory.schema'); // Reuse if needed or separate

const router = express.Router();
const service = new WarehouseService();
const InventoryService = require('../../services/transaction/inventory.service');
const inventoryService = new InventoryService();


router.get('/', async (req, res, next) => {
    try {
        const warehouses = await service.find();
        res.json(warehouses);
    } catch (error) {
        next(error);
    }
});

router.get('/:id',
    validatorHandler(getWarehouseSchema, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const warehouse = await service.findOne(id);
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
            const newWarehouse = await service.create(body);
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
            const warehouse = await service.update(id, body);
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
            await service.delete(id);
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
            await service.findOne(id);

            const stock = await inventoryService.getBalance(id, req.query);
            res.json(stock);
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
