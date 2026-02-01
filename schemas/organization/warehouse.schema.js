const Joi = require('joi');

const id = Joi.number().integer();
const name = Joi.string().min(3).max(50);
const address = Joi.string().max(255);
const active = Joi.boolean();
const code = Joi.string().min(1).max(20).allow(null, '');

const createWarehouseSchema = Joi.object({
    name: name.required(),
    address: address.optional(),
    active: active.optional(),
    code: code.optional(),
});

const updateWarehouseSchema = Joi.object({
    name: name,
    address: address,
    active: active,
    code: code,
});

const getWarehouseSchema = Joi.object({
    id: id.required(),
});

module.exports = { createWarehouseSchema, updateWarehouseSchema, getWarehouseSchema };
