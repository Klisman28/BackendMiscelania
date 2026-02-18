const express = require('express');
const ReportService = require('../../services/report/report.service');
const { success } = require('../response');
const Joi = require('joi');

const router = express.Router();
const service = new ReportService();

// Validation Schemas
const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  warehouseId: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  docType: Joi.string().optional()
});

const paginationSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  warehouseId: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  docType: Joi.string().optional(),
  limit: Joi.number().integer().min(1).default(10),
  offset: Joi.number().integer().min(0).default(0)
});

const inventorySchema = Joi.object({
  warehouseId: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  limit: Joi.number().integer().min(1).default(50),
  offset: Joi.number().integer().min(0).default(0)
});

const exportSchema = Joi.object({
  type: Joi.string().valid(
    'sales_by_day',
    'top_products',
    'top_clients',
    'purchases_by_day',
    'top_suppliers',
    'low_stock'
  ).required(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  warehouseId: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  docType: Joi.string().optional()
});

// Middleware for validation
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.query, { abortEarly: false, allowUnknown: true });
  if (error) return res.status(400).json({ message: error.message });
  next();
};

// --- SALES ROUTES ---

router.get('/sales/summary', validate(dateRangeSchema), async (req, res, next) => {
  try {
    const data = await service.getSalesSummary(req.query);
    success(res, data, 'Resumen de ventas obtenido');
  } catch (error) {
    next(error);
  }
});

router.get('/sales/by-day', validate(dateRangeSchema), async (req, res, next) => {
  try {
    const data = await service.getSalesByDay(req.query);
    success(res, data, 'Ventas por día obtenidas');
  } catch (error) {
    next(error);
  }
});

router.get('/sales/top-products', validate(paginationSchema), async (req, res, next) => {
  try {
    const data = await service.getTopProducts(req.query);
    success(res, data, 'Top productos obtenido');
  } catch (error) {
    next(error);
  }
});

router.get('/sales/top-clients', validate(paginationSchema), async (req, res, next) => {
  try {
    const data = await service.getTopClients(req.query);
    success(res, data, 'Top clientes obtenido');
  } catch (error) {
    next(error);
  }
});

// --- PURCHASES ROUTES ---

router.get('/purchases/summary', validate(dateRangeSchema), async (req, res, next) => {
  try {
    const data = await service.getPurchasesSummary(req.query);
    success(res, data, 'Resumen de compras obtenido');
  } catch (error) {
    next(error);
  }
});

router.get('/purchases/by-day', validate(dateRangeSchema), async (req, res, next) => {
  try {
    const data = await service.getPurchasesByDay(req.query);
    success(res, data, 'Compras por día obtenidas');
  } catch (error) {
    next(error);
  }
});

router.get('/purchases/top-suppliers', validate(paginationSchema), async (req, res, next) => {
  try {
    const data = await service.getTopSuppliers(req.query);
    success(res, data, 'Top proveedores obtenido');
  } catch (error) {
    next(error);
  }
});

// --- INVENTORY ROUTES ---

router.get('/inventory/low-stock', validate(inventorySchema), async (req, res, next) => {
  try {
    const data = await service.getLowStock(req.query);
    success(res, data, 'Productos bajo stock obtenidos');
  } catch (error) {
    next(error);
  }
});

router.get('/inventory/valuation', async (req, res, next) => {
  try {
    const data = await service.getInventoryValuation(req.query);
    success(res, data, 'Valoración de inventario obtenida');
  } catch (error) {
    next(error);
  }
});

// --- EXPORT ROUTE ---

router.get('/export', validate(exportSchema), async (req, res, next) => {
  try {
    const data = await service.getExportData(req.query);

    // Generate CSV
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No hay datos para exportar' });
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(fieldName => {
        let val = row[fieldName];
        if (typeof val === 'string') {
          // Escape quotes and wrap in quotes if contains comma
          val = val.replace(/"/g, '""');
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            val = `"${val}"`;
          }
        }
        return val;
      }).join(','))
    ].join('\n');

    res.header('Content-Type', 'text/csv');
    res.attachment(`${req.query.type}_report_${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csvContent);

  } catch (error) {
    next(error);
  }
});

module.exports = router;
