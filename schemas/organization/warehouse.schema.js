const Joi = require('joi');

const id = Joi.number().integer();
const name = Joi.string().min(3).max(50);
const address = Joi.string().max(255);
const active = Joi.boolean();
const code = Joi.string().min(1).max(20).allow(null, '');
const type = Joi.string().valid('tienda', 'bodega');

const createWarehouseSchema = Joi.object({
    name: name.required(),
    address: address.optional(),
    active: active.optional(),
    code: code.optional(),
    type: type.optional(),
});

const updateWarehouseSchema = Joi.object({
    name: name,
    address: address,
    active: active,
    code: code,
    type: type,
});

const getWarehouseSchema = Joi.object({
    id: id.required(),
});

const queryWarehouseSchema = Joi.object({
    type: type.optional(),
    active: active.optional(),
});

module.exports = { createWarehouseSchema, updateWarehouseSchema, getWarehouseSchema, queryWarehouseSchema };
