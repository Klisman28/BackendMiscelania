const Joi = require('joi');

const id = Joi.number().integer();
const openingId = Joi.number().integer();
const type = Joi.string().valid('CASH_IN', 'CASH_OUT');
const amount = Joi.number().precision(2).min(0.01);
const description = Joi.string().allow('');
const limit = Joi.number().integer();
const offset = Joi.number().integer();
const search = Joi.string();
const sortColumn = Joi.string();
const sortDirection = Joi.string();

const createCashMovementSchema = Joi.object({
    type: type.required(),
    amount: amount.required(),
    description: description
});

const getCashMovementSchema = Joi.object({
    id: id.required(),
});

const queryCashMovementSchema = Joi.object({
    limit,
    offset,
    search,
    sortColumn,
    sortDirection
});

module.exports = { createCashMovementSchema, getCashMovementSchema, queryCashMovementSchema };
