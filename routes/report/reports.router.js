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

const paginatedDateRangeSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  warehouseId: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  docType: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(1000).default(10),
  offset: Joi.number().integer().min(0).default(0)
});

const stockQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(1000).default(50),
  offset: Joi.number().integer().min(0).default(0)
});

const exportSchema = Joi.object({
  type: Joi.string().valid('sales_by_day', 'top_products', 'top_clients', 'purchases_by_day', 'top_suppliers', 'low_stock').required(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  warehouseId: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  docType: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(100000).default(10000),
  offset: Joi.number().integer().min(0).default(0)
});

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(d => d.message)
      });
    }
    req.query = value;
    next();
  };
};

// --- SALES ROUTES ---

router.get('/sales/summary',
  validate(dateRangeSchema),
  async (req, res, next) => {
    try {
      const result = await service.getSalesSummary(req.query, req.companyId);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/sales/by-day',
  validate(dateRangeSchema),
  async (req, res, next) => {
    try {
      const result = await service.getSalesByDay(req.query, req.companyId);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/sales/top-products',
  validate(paginatedDateRangeSchema),
  async (req, res, next) => {
    try {
      const result = await service.getTopProducts(req.query, req.companyId);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/sales/top-clients',
  validate(paginatedDateRangeSchema),
  async (req, res, next) => {
    try {
      const result = await service.getTopClients(req.query, req.companyId);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
);

// --- PURCHASES ROUTES ---

router.get('/purchases/summary',
  validate(dateRangeSchema),
  async (req, res, next) => {
    try {
      const result = await service.getPurchasesSummary(req.query, req.companyId);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/purchases/by-day',
  validate(dateRangeSchema),
  async (req, res, next) => {
    try {
      const result = await service.getPurchasesByDay(req.query, req.companyId);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/purchases/top-suppliers',
  validate(paginatedDateRangeSchema),
  async (req, res, next) => {
    try {
      const result = await service.getTopSuppliers(req.query, req.companyId);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
);

// --- INVENTORY ROUTES ---

router.get('/inventory/low-stock',
  validate(stockQuerySchema),
  async (req, res, next) => {
    try {
      const result = await service.getLowStock(req.query, req.companyId);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/inventory/valuation',
  async (req, res, next) => {
    try {
      const result = await service.getInventoryValuation(req.query, req.companyId);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
);

// --- EXPORT ---

router.get('/export',
  validate(exportSchema),
  async (req, res, next) => {
    try {
      const result = await service.getExportData(req.query, req.companyId);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
