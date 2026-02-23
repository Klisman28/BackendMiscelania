const express = require('express');

const InventoryService = require('../../services/transaction/inventory.service');
const validatorHandler = require('../../middlewares/validator.handler');
const { addStockSchema, removeStockSchema, transferSchema, queryTransferSchema, getTransferSchema, queryMovementSchema } = require('../../schemas/transaction/inventory.schema');

const router = express.Router();
const service = new InventoryService();

router.get('/movements',
    validatorHandler(queryMovementSchema, 'query'),
    async (req, res, next) => {
        try {
            const movements = await service.getMovements(req.query, req.companyId);
            res.json(movements);
        } catch (error) {
            next(error);
        }
    }
);

router.post('/add',
    validatorHandler(addStockSchema, 'body'),
    async (req, res, next) => {
        try {
            const result = await service.addStock(req.body, req.companyId);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.post('/remove',
    validatorHandler(removeStockSchema, 'body'),
    async (req, res, next) => {
        try {
            const result = await service.removeStock(req.body, req.companyId);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.post('/transfer',
    validatorHandler(transferSchema, 'body'),
    async (req, res, next) => {
        try {
            const result = await service.transfer(req.body, req.companyId);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/transfers',
    validatorHandler(queryTransferSchema, 'query'),
    async (req, res, next) => {
        try {
            const result = await service.listTransfers(req.query, req.companyId);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/transfers/:id',
    validatorHandler(getTransferSchema, 'params'),
    async (req, res, next) => {
        try {
            const result = await service.getTransferById(req.params.id, req.companyId);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/balance/:warehouseId',
    async (req, res, next) => {
        try {
            const result = await service.getBalance(req.params.warehouseId, req.query, req.companyId);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
