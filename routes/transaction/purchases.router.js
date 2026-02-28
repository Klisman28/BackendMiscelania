const express = require('express');
const PurchasesService = require('../../services/transaction/purchases.service');
const validatorHandler = require('../../middlewares/validator.handler');
const {
    createPurchasSchema,
    getPurchasSchema,
    queryPurchasSchema
} = require('../../schemas/transaction/purchases.schema');
const { success } = require('../response');

const router = express.Router();
const service = new PurchasesService();

router.get('/',
    validatorHandler(queryPurchasSchema, 'query'),
    async (req, res, next) => {
        try {
            const purchases = await service.find(req.query, req.companyId);
            success(res, purchases);
        } catch (error) {
            next(error);
        }
    });

router.get('/:id',
    validatorHandler(getPurchasSchema, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const purchas = await service.findOne(id, req.companyId);
            success(res, purchas, 'Compra encontrada con éxito');
        } catch (error) {
            next(error);
        }
    }
);

router.post('/',
    validatorHandler(createPurchasSchema, 'body'),
    async (req, res, next) => {
        try {
            const { sub } = req.user
            let body = { ...req.body };

            // Map warehouse_id to warehouseId and ensure it's a valid integer
            const wId = body.warehouseId || body.warehouse_id;
            if (!wId || isNaN(wId)) {
                return res.status(400).json({ type: 'error', message: 'warehouseId es requerido (numérico)' });
            }
            body.warehouseId = parseInt(wId, 10);

            const purchas = await service.create(body, sub, req.companyId);
            res.status(201).json({ type: "success", message: 'Compra registrada con éxito', data: purchas });
        } catch (error) {
            next(error);
        }
    }
);

router.put('/:id',
    validatorHandler(getPurchasSchema, 'params'),
    validatorHandler(createPurchasSchema, 'body'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const body = req.body;
            const purchas = await service.update(id, body, req.companyId);
            success(res, purchas, 'Compra actualizada con éxito');
        } catch (error) {
            next(error);
        }
    }
);

router.delete('/:id',
    validatorHandler(getPurchasSchema, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            await service.delete(id, req.companyId);
            success(res, id, 'Compra anulada con éxito', 201);
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;