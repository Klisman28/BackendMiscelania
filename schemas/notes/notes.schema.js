const Joi = require('joi');

// Para crear (POST)
const createNoteSchema = Joi.object({
  clientName: Joi.string().min(2).max(150).required(),
  orderDate: Joi.date().iso().required(),
  dueDate: Joi.date().iso().min(Joi.ref('orderDate')).required(),
  phone: Joi.string().pattern(/^[0-9]+$/).min(8).max(15).required(),
  designDescription: Joi.string().min(10).required(),
  status: Joi.string().valid('INICIO', 'PROGRESO', 'FINALIZADO').default('INICIO')
});

// Para actualizar (PUT/PATCH)
const updateNoteSchema = Joi.object({
  clientName: Joi.string().min(2).max(150),
  orderDate: Joi.date().iso(),
  dueDate: Joi.date().iso().min(Joi.ref('orderDate')),
  phone: Joi.string().pattern(/^[0-9]+$/).min(8).max(15),
  designDescription: Joi.string().min(10),
  status: Joi.string().valid('INICIO', 'PROGRESO', 'FINALIZADO')
});

// Para el ID en params
const getNoteSchema = Joi.object({
  id: Joi.number().integer().required()
});

module.exports = { createNoteSchema, updateNoteSchema, getNoteSchema };
