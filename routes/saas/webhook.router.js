
const express = require('express');
const StripeService = require('../../services/saas/stripe.service');

const router = express.Router();
const service = new StripeService();

// Importante: express.json() debe haber sido ignorado para esta ruta en index.js
// Usamos express.raw para obtener el body como Buffer para verificar firma
router.post('/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
    const sig = request.headers['stripe-signature'];
    let event;

    try {
        event = service.constructEvent(sig, request.body);
    } catch (err) {
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                const subscription = event.data.object;
                await service.handleSubscriptionChange(subscription);
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (error) {
        console.error('Error processing webhook event', error);
        // Aún así retornamos 200 para que Stripe no reintente indefinidamente si es error lógico nuestro
    }

    // Return a 200 response to acknowledge receipt of the event
    response.send();
});

module.exports = router;
