const express = require('express');
const WhatsappService = require('../services/whatsapp/whatsapp.service');
const ReminderService = require('../services/reminders/reminder.service');

const router = express.Router();
const whatsappService = new WhatsappService();
const reminderService = new ReminderService();

// GET /api/v1/webhooks/whatsapp - Verificación de Meta
router.get('/whatsapp', (req, res, next) => {
    try {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        const responseChallenge = whatsappService.verifyWebhook(mode, token, challenge);
        res.status(200).send(responseChallenge);
    } catch (error) {
        res.status(403).json({ error: 'Token de validación inválido' });
    }
});

// POST /api/v1/webhooks/whatsapp - Recibo de eventos y status
// (Meta envía body como json, express.json() a nivel api lo procesa, cuidado con requerir rawBody)
router.post('/whatsapp', async (req, res, next) => {
    try {
        const body = req.body;

        if (body.object === 'whatsapp_business_account') {
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.statuses) {
                // Manejar actualización de estado de entrega de mensaje
                await reminderService.handleWebhookStatus(body.entry);
            }
            res.status(200).send('EVENT_RECEIVED');
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error('Webhook processing error', error);
        res.sendStatus(500);
    }
});

module.exports = router;
