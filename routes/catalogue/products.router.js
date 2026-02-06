const express = require('express');
const boom = require('@hapi/boom');
const ProductsService = require('../../services/catalogue/products.service');
const validatorHandler = require('../../middlewares/validator.handler');
const {
    createProductSchema,
    createSimpleProductSchema,
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

            // Intentar validación: primero schema simple, si falla intentar completo
            // Verificar si contiene campos del schema completo (brandId, subcategoryId, etc.)
            const hasCompleteFields = body.brandId || body.subcategoryId || body.unitId ||
                body.hasOwnProperty('stock') || body.hasOwnProperty('utility');

            let validationError = null;
            let validatedBody = null;

            if (!hasCompleteFields) {
                // Intentar con schema simple primero
                const simpleValidation = createSimpleProductSchema.validate(body, { abortEarly: false });
                if (simpleValidation.error) {
                    // Si falla el simple, intentar con el completo
                    const completeValidation = createProductSchema.validate(body, { abortEarly: false });
                    if (completeValidation.error) {
                        validationError = completeValidation.error;
                    } else {
                        validatedBody = completeValidation.value;
                    }
                } else {
                    validatedBody = simpleValidation.value;
                }
            } else {
                // Usar schema completo directamente
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

            const product = await service.create(validatedBody);
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