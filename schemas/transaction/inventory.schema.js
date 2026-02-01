const Joi = require('joi');

const warehouseId = Joi.number().integer().required();
const productId = Joi.number().integer().required();
const quantity = Joi.number().integer().positive().required();
const description = Joi.string().optional();
const userId = Joi.number().integer().optional();

const fromWarehouseId = Joi.number().integer().required();
const toWarehouseId = Joi.number().integer().required();
const items = Joi.array().items(
    Joi.object({
        productId: productId,
        quantity: quantity
    })
).required().min(1);
const observation = Joi.string().optional();

const addStockSchema = Joi.object({
    warehouseId,
    productId,
    quantity,
    description,
    userId
});

const removeStockSchema = Joi.object({
    warehouseId,
    productId,
    quantity,
    description,
    userId
});

const transferSchema = Joi.object({
    fromWarehouseId,
    toWarehouseId,
    items,
    observation,
    userId
});

module.exports = { addStockSchema, removeStockSchema, transferSchema };
