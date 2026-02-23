'use strict';
const Joi = require('joi');

const signupSchema = Joi.object({
    // Datos de la empresa
    companyName: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'El nombre de la empresa debe tener al menos 2 caracteres',
            'string.max': 'El nombre de la empresa no puede exceder 100 caracteres',
            'any.required': 'El nombre de la empresa es requerido',
        }),

    // Datos del owner
    ownerUsername: Joi.string()
        .alphanum()
        .min(3)
        .max(30)
        .required()
        .messages({
            'string.alphanum': 'El usuario solo puede contener letras y números',
            'string.min': 'El usuario debe tener al menos 3 caracteres',
            'string.max': 'El usuario no puede exceder 30 caracteres',
            'any.required': 'El nombre de usuario es requerido',
        }),

    ownerPassword: Joi.string()
        .min(8)
        .max(64)
        .required()
        .messages({
            'string.min': 'La contraseña debe tener al menos 8 caracteres',
            'string.max': 'La contraseña no puede exceder 64 caracteres',
            'any.required': 'La contraseña es requerida',
        }),

    ownerEmail: Joi.string()
        .email()
        .optional()
        .allow('', null)
        .messages({
            'string.email': 'El email debe tener un formato válido',
        }),
});

module.exports = { signupSchema };
