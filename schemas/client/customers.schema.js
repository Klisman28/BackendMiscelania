const Joi = require('joi');

// ===== NUEVOS CAMPOS =====
const firstName = Joi.string().min(2).max(100);
const lastName = Joi.string().min(2).max(100);
const isFinalConsumer = Joi.boolean();
const nit = Joi.string().min(2).max(20).pattern(/^[0-9A-Z\-\/]+$/); // Números, letras, guiones

// ===== CAMPOS OPCIONALES DE CONTACTO =====
const email = Joi.string().email();
const telephone = Joi.string().min(7).max(20);
const address = Joi.string().min(5).max(255);

// ===== CAMPOS ANTIGUOS (para compatibilidad) =====
const name = Joi.string().min(3).max(100);
const firstLastname = Joi.string().min(3).max(100);
const secondLastname = Joi.string().min(3).max(100);
const dni = Joi.string();

// ===== QUERY PARAMS =====
const id = Joi.number().integer();
const offset = Joi.number().integer();
const limit = Joi.number().integer();
const search = Joi.string();
const sortColumn = Joi.string();
const sortDirection = Joi.string();

/**
 * Schema principal para crear clientes (NUEVOS CAMPOS)
 * Soporta modo simplificado: firstName + lastName + isFinalConsumer
 */
const createCustomerSchema = Joi.object({
    // Nuevos campos (prioritarios)
    firstName: firstName.required(),
    lastName: lastName.required(),
    isFinalConsumer: isFinalConsumer.default(false),
    nit: Joi.alternatives().conditional('isFinalConsumer', {
        is: true,
        then: Joi.string().optional().allow('', null).default('CF'), // CF si es consumidor final
        otherwise: nit.optional().allow('', null) // Validar formato si viene
    }),

    // Contactos opcionales
    email: email.optional().allow('', null),
    telephone: telephone.optional().allow('', null),
    address: address.optional().allow('', null),

    // Campos antiguos (permitidos pero deprecados)
    name: name.optional(),
    firstLastname: firstLastname.optional(),
    secondLastname: secondLastname.optional(),
    dni: dni.optional()
});

/**
 * Schema para actualizar clientes
 */
const updateCustomerSchema = Joi.object({
    firstName: firstName.optional(),
    lastName: lastName.optional(),
    isFinalConsumer: isFinalConsumer.optional(),
    nit: Joi.alternatives().conditional('isFinalConsumer', {
        is: true,
        then: Joi.string().optional().allow('', null).default('CF'),
        otherwise: nit.optional().allow('', null)
    }),
    email: email.optional().allow('', null),
    telephone: telephone.optional().allow('', null),
    address: address.optional().allow('', null),

    // Permitir actualización con campos antiguos
    name: name.optional(),
    firstLastname: firstLastname.optional(),
    secondLastname: secondLastname.optional(),
    dni: dni.optional()
});

const getCustomerSchema = Joi.object({
    id: id.required(),
});

const queryCustomerSchema = Joi.object({
    offset,
    limit,
    search,
    sortColumn,
    sortDirection
});

module.exports = {
    createCustomerSchema,
    updateCustomerSchema,
    getCustomerSchema,
    queryCustomerSchema
}