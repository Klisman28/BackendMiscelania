const express = require('express');
const boom = require('@hapi/boom');
const ProductsService = require('../../services/catalogue/products.service');
const validatorHandler = require('../../middlewares/validator.handler');
const {
    createProductSchema,
    createSimpleProductSchema,
    createQuickProductSchema,
    getProductSchema,
    queryProductSchema,
    updateProductSchema,
    searchProductSchema
} = require('../../schemas/catalogue/products.schema');
const { success } = require('../response');

const router = express.Router();
const service = new ProductsService();

router.get('/',
    validatorHandler(queryProductSchema, 'query'),
    async (req, res, next) => {
        try {
            const products = await service.find(req.query);
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
            const products = await service.search(req.query);
            success(res, products);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/units',
    async (req, res, next) => {
        try {
            const units = await service.findUnits();
            success(res, units);
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
            const product = await service.findOne(id);
            success(res, product, 'Producto encontrado con éxito');
        } catch (error) {
            next(error);
        }
    }
);

router.post('/',
    async (req, res, next) => {
        try {
            const body = req.body;

            // Estrategia de validación:
            // 1. Intentar con quick schema (solo requiere: name, sku, cost, price, subcategoryId, unitId)
            // 2. Si falla, intentar con schema completo
            // 3. Si ambos fallan, retornar error del schema completo

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

            // Pasar el modo al service para que aplique defaults apropiados
            const product = await service.create(validatedBody, isQuickMode);
            success(res, product, 'Producto registrado con éxito', 201);
        } catch (error) {
            next(error);
        }
    }
);

router.put('/:id',
    validatorHandler(getProductSchema, 'params'),
    validatorHandler(updateProductSchema, 'body'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const body = req.body;
            const product = await service.update(id, body);
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
            await service.delete(id);
            success(res, id, 'Producto eliminado con éxito');
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;