const express = require('express');
const boom = require('@hapi/boom');
const ProductsService = require('../../services/catalogue/products.service');
const validatorHandler = require('../../middlewares/validator.handler');
const upload = require('../../middlewares/upload.handler');
const {
    createProductSchema,
    createSimpleProductSchema,
    createQuickProductSchema,
    getProductSchema,
    queryProductSchema,
    updateProductSchema,
    searchProductSchema,
    updateProductStatusSchema
} = require('../../schemas/catalogue/products.schema');
const { success } = require('../response');

const router = express.Router();
const service = new ProductsService();

router.get('/',
    validatorHandler(queryProductSchema, 'query'),
    async (req, res, next) => {
        try {
            const products = await service.find(req.query, req.companyId);
            success(res, products);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/search',
    validatorHandler(searchProductSchema, 'query'),
    async (req, res, next) => {
        try {
            const products = await service.search(req.query, req.companyId);
            success(res, products);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/units',
    async (req, res, next) => {
        try {
            const units = await service.findUnits(req.companyId);
            success(res, units);
        } catch (error) {
            next(error);
        }
    }
);

// ══════════════════════════════════════════════════════════════
// ☞ LOW-STOCK ALERTS
// ══════════════════════════════════════════════════════════════

/**
 * GET /products/low-stock?level=out_of_stock|low_stock&limit=50&offset=0&search=
 * List products with stock <= stockMin, ordered by most critical first.
 */
router.get('/low-stock',
    async (req, res, next) => {
        try {
            const data = await service.findLowStock(req.query, req.companyId);
            success(res, data, 'Productos con stock bajo');
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /products/stock-alerts/summary
 * Aggregate counts: { outOfStock, lowStock, totalAlerts, totalProducts }
 */
router.get('/stock-alerts/summary',
    async (req, res, next) => {
        try {
            const summary = await service.getStockAlertsSummary(req.companyId);
            success(res, summary, 'Resumen de alertas de stock');
        } catch (error) {
            next(error);
        }
    }
);

router.get('/:id',
    validatorHandler(getProductSchema, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const product = await service.findOne(id, req.companyId);
            success(res, product, 'Producto encontrado con éxito');
        } catch (error) {
            next(error);
        }
    }
);

router.post('/',
    upload.single('image'),
    async (req, res, next) => {
        try {
            const body = req.body;
            const file = req.file;

            let validationError = null;
            let validatedBody = null;
            let isQuickMode = false;

            // Intentar primero con quick schema
            const quickValidation = createQuickProductSchema.validate(body, { abortEarly: false });
            if (!quickValidation.error) {
                validatedBody = quickValidation.value;
                isQuickMode = true;
            } else {
                // Si falla quick, intentar con completo
                const completeValidation = createProductSchema.validate(body, { abortEarly: false });
                if (completeValidation.error) {
                    validationError = completeValidation.error;
                } else {
                    validatedBody = completeValidation.value;
                }
            }

            if (validationError) {
                return next(boom.badRequest(validationError.message));
            }

            const product = await service.create(validatedBody, isQuickMode, file, req.companyId);
            success(res, product, 'Producto registrado con éxito', 201);
        } catch (error) {
            next(error);
        }
    }
);

// ══════════════════════════════════════════════════════════════
// ☞ PATCH /api/products/:id/status — Cambiar lifecycle status
// ══════════════════════════════════════════════════════════════
router.patch('/:id/status',
    validatorHandler(getProductSchema, 'params'),
    validatorHandler(updateProductStatusSchema, 'body'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status, reason } = req.body;
            const product = await service.updateStatus(id, { status, reason }, req.companyId);
            success(res, product, `Producto actualizado a status: ${status}`);
        } catch (error) {
            next(error);
        }
    }
);

router.put('/:id',
    upload.single('image'),
    validatorHandler(getProductSchema, 'params'),
    validatorHandler(updateProductSchema, 'body'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const body = req.body;
            const file = req.file;

            const product = await service.update(id, body, file, req.companyId);
            success(res, product, 'Producto actualizado con éxito', 201);
        } catch (error) {
            next(error);
        }
    }
);

router.delete('/:id',
    validatorHandler(getProductSchema, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            await service.delete(id, req.companyId);
            success(res, id, 'Producto eliminado con éxito');
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
