const express = require('express');
const router = express.Router();
const TicketsService = require('../../services/transaction/tickets.service');
const validatorHandler = require('../../middlewares/validator.handler');
const service = new TicketsService();

// 1) Next ticket
router.get('/next', async (req, res, next) => {
  try {
    const numero = await service.getNext(req.companyId);
    res.json({ numero });
  } catch (err) {
    next(err);
  }
});

// 2) Create ticket
router.post('/', async (req, res, next) => {
  try {
    const ticket = await service.create(req.body, req.companyId);
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
}
);

module.exports = router;
