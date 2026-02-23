const Joi = require('joi');

const id = Joi.number().integer();
const name = Joi.string().min(3).max(100);
const slug = Joi.string().min(3).max(100).pattern(/^[a-z0-9-]+$/);
const plan = Joi.string().valid('basic', 'pro', 'enterprise');
const seats = Joi.number().integer().min(1);
const subscriptionEnd = Joi.date().allow(null);
const ownerUserId = Joi.number().integer();
const status = Joi.string().valid('active', 'suspended', 'trial');

const createCompanySchema = Joi.object({
    name: name.required(),
    slug: slug,
    plan: plan,
    seats: seats,
    subscription_end: subscriptionEnd,
    ownerUserId: ownerUserId.required() // Obligatorio para SaaS Admin panel
});

const updateCompanyStatusSchema = Joi.object({
    status: status.required()
});

const queryCompanySchema = Joi.object({
    limit: Joi.number().integer(),
    offset: Joi.number().integer(),
    page: Joi.number().integer(),
    search: Joi.string().allow(''),
    status: status
});

module.exports = { createCompanySchema, updateCompanyStatusSchema, queryCompanySchema };
