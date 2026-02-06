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

const id = Joi.number().integer();

const queryTransferSchema = Joi.object({
    pageIndex: Joi.number().integer().min(1),
    pageSize: Joi.number().integer().min(1),
    search: Joi.string().allow(''),
    sort: Joi.any()
});

const getTransferSchema = Joi.object({
    id: id.required()
});

const queryStockSchema = Joi.object({
    pageIndex: Joi.number().integer().min(1).default(1),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(10),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().allow(''),
    sort: Joi.any()
});

const queryMovementSchema = Joi.object({
    warehouseId: Joi.number().integer(),
    productId: Joi.number().integer(),
    type: Joi.string().valid('IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT'),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso(),
    limit: Joi.number().integer().default(10),
    offset: Joi.number().integer().default(0)
});

module.exports = { addStockSchema, removeStockSchema, transferSchema, queryTransferSchema, getTransferSchema, queryStockSchema, queryMovementSchema };
