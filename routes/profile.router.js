const express = require('express');
const passport = require('passport');
const Joi = require('joi');
const { updateWhatsappProfile } = require('../controllers/profile.controller');
const validatorHandler = require('../middlewares/validator.handler');

const router = express.Router();

// Esquema de validación
const updateWhatsappSchema = Joi.object({
    phone: Joi.string().allow('', null).messages({
        'string.base': `El teléfono debe ser texto`,
    }),
    optIn: Joi.boolean().required().messages({
        'any.required': `Debe aceptar o rechazar el consentimiento`,
    }),
    timezone: Joi.string().allow('', null)
});

// Endpoint
router.post(
    '/whatsapp',
    passport.authenticate('jwt', { session: false }),
    validatorHandler(updateWhatsappSchema, 'body'),
    updateWhatsappProfile
);

module.exports = router;
