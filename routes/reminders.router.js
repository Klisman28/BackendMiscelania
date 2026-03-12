const express = require('express');
const passport = require('passport');
const Joi = require('joi');
const { tenantGuard } = require('../middlewares/tenant.handler');
const validatorHandler = require('../middlewares/validator.handler');
const ReminderService = require('../services/reminders/reminder.service');

const router = express.Router({ mergeParams: true });
const service = new ReminderService();

const createReminderSchema = Joi.object({
    scheduledFor: Joi.date().iso().required()
});

// POST /api/v1/notes/:noteId/reminders/whatsapp
router.post('/whatsapp',
    passport.authenticate('jwt', { session: false }),
    tenantGuard,
    validatorHandler(createReminderSchema, 'body'),
    async (req, res, next) => {
        try {
            const { noteId } = req.params;
            const { scheduledFor } = req.body;
            const userId = req.user.sub || req.user.id;
            const companyId = req.user.companyId || req.user.company_id;

            const reminder = await service.createReminder(companyId, userId, noteId, { scheduledFor });
            res.status(201).json(reminder);
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
