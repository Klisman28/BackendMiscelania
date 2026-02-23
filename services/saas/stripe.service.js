
const Stripe = require('stripe');
const boom = require('@hapi/boom');
const { models } = require('../../libs/sequelize');

// Inicialización segura: si no hay key, no explota al inicio, pero fallará al usar métodos.
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = Stripe(process.env.STRIPE_SECRET_KEY);
}

class StripeService {

    constructor() { }

    /**
     * Crea un cliente en Stripe.
     * @param {string} email
     * @param {string} name
     * @param {object} metadata (e.g. { companyId: 1 })
     */
    async createCustomer(email, name, metadata) {
        if (!stripe) throw boom.badRequest('Servicio de Pagos no configurado');
        try {
            const customer = await stripe.customers.create({
                email,
                name,
                metadata
            });
            return customer;
        } catch (error) {
            console.error('Error creating Stripe customer:', error);
            throw boom.badGateway('Error al conectar con Stripe');
        }
    }

    /**
     * Crea una sesión de Checkout para suscribirse a un plan.
     * @param {string} customerId Stripe Customer ID
     * @param {string} priceId Stripe Price/Product ID
     * @param {string} successUrl URL de redirección éxito
     * @param {string} cancelUrl URL de redirección cancelación
     */
    async createCheckoutSession(customerId, priceId, successUrl, cancelUrl) {
        if (!stripe) throw boom.badRequest('Servicio de Pagos no configurado');
        try {
            const session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                payment_method_types: ['card'],
                customer: customerId,
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                success_url: successUrl,
                cancel_url: cancelUrl,
            });
            return session;
        } catch (error) {
            console.error('Error creating checkout session:', error);
            throw boom.badRequest('No se pudo iniciar el proceso de pago');
        }
    }

    /**
     * Crea una sesión del Portal de Facturación para que el cliente gestione
     * sus métodos de pago, facturas y cancelaciones.
     * @param {string} customerId
     * @param {string} returnUrl
     */
    async createPortalSession(customerId, returnUrl) {
        try {
            const session = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: returnUrl,
            });
            return session;
        } catch (error) {
            console.error('Error creating portal session:', error);
            throw boom.badRequest('No se pudo acceder al portal de facturación');
        }
    }

    /**
     * Verifica la firma del Webhook de Stripe.
     * @param {string} signature Header Stripe-Signature
     * @param {Buffer} rawBody Cuerpo crudo de la petición
     */
    constructEvent(signature, rawBody) {
        if (!stripe) throw boom.badRequest('Servicio de Pagos no configurado');
        try {
            return stripe.webhooks.constructEvent(
                rawBody,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            console.error(`Webhook Error: ${err.message}`);
            throw boom.badRequest(`Webhook Error: ${err.message}`);
        }
    }

    /**
     * Lógica para procesar eventos de suscripción actualizados.
     * Sincroniza el estado de la suscripción con la base de datos local.
     */
    async handleSubscriptionChange(subscription) {
        if (!stripe) {
            console.error('Stripe not configured, skipping webhook processing');
            return;
        }
        try {
            // 1. Buscar la empresa por stripe_customer_id
            const company = await models.Company.findOne({
                where: { stripeCustomerId: subscription.customer }
            });

            if (!company) {
                console.warn(`Webhook: Company not found for Stripe Customer ${subscription.customer}`);
                return;
            }

            // 2. Mapear status de Stripe a nuestros planes/límites
            let newPlan = company.plan;
            let newSeats = company.seats;
            let newStatus = company.status;

            if (subscription.status === 'active') {
                newPlan = 'pro'; // Asumimos upgrade a PRO si paga. (Idealmente mapear priceId -> plan)
                newSeats = 10;   // Ejemplo: PRO da 10 usuarios
                newStatus = 'active';
            } else if (subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'past_due') {
                newPlan = 'basic'; // Downgrade o mantener basic
                newSeats = 2;
                newStatus = 'suspended'; // O 'past_due'
            }

            // 3. Actualizar Company
            await company.update({
                subscriptionEnd: new Date(subscription.current_period_end * 1000), // Stripe usa timestamps en segundos
                status: newStatus,
                plan: newPlan,
                seats: newSeats
            });

            // 4. Actualizar/Crear registro en tabla Subscriptions (histórico/detalle)
            // Buscar si ya existe registro de esta suscripción
            const existingSub = await models.Subscription.findOne({
                where: { stripeSubscriptionId: subscription.id }
            });

            const subData = {
                companyId: company.id,
                stripeSubscriptionId: subscription.id,
                status: subscription.status,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end
            };

            if (existingSub) {
                await existingSub.update(subData);
            } else {
                await models.Subscription.create(subData);
            }

            console.log(`Company ${company.name} subscription updated to ${subscription.status}`);

        } catch (error) {
            console.error('Error handling subscription change:', error);
        }
    }
}

module.exports = StripeService;
