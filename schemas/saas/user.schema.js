const Joi = require('joi');

const limit = Joi.number().integer();
const offset = Joi.number().integer();
const search = Joi.string().allow('');

const queryUserSchema = Joi.object({
    limit,
    offset,
    search
});

module.exports = { queryUserSchema };
