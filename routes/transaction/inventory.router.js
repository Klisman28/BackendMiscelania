const express = require('express');

const InventoryService = require('../../services/transaction/inventory.service');
const validatorHandler = require('../../middlewares/validator.handler');
const { addStockSchema, removeStockSchema, transferSchema } = require('../../schemas/transaction/inventory.schema');

const router = express.Router();
const service = new InventoryService();

router.post('/in',
    validatorHandler(addStockSchema, 'body'),
    async (req, res, next) => {
        try {
            const body = req.body;
            const result = await service.addStock(body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.post('/out',
    validatorHandler(removeStockSchema, 'body'),
    async (req, res, next) => {
        try {
            const body = req.body;
            const result = await service.removeStock(body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.post('/transfer',
    validatorHandler(transferSchema, 'body'),
    async (req, res, next) => {
        try {
            const body = req.body;
            const result = await service.transfer(body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
