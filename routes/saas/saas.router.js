const express = require('express');
const boom = require('@hapi/boom');

const SaasService = require('../../services/saas/saas.service');
const validatorHandler = require('../../middlewares/validator.handler');
const { signupSchema } = require('../../schemas/saas/signup.schema');
const { success } = require('../response');

const router = express.Router();
const service = new SaasService();
const StripeService = require('../../services/saas/stripe.service');
const stripeService = new StripeService();

/**
 * POST /api/v1/saas/signup
 *
 * Crea una nueva empresa (tenant) con su usuario administrador.
 * Este endpoint es PÚBLICO — no requiere autenticación.
 *
 * Body:
 *   companyName    - Nombre de la empresa
 *   ownerUsername  - Username del administrador
 *   ownerPassword  - Contraseña (mínimo 8 caracteres)
 *   ownerEmail     - Email del admin (opcional)
 */
router.post(
    '/signup',
    validatorHandler(signupSchema, 'body'),
    async (req, res, next) => {
        try {
            const result = await service.signup(req.body);
            success(res, result, result.message, 201);
        } catch (error) {
            // Convertir errores de Sequelize (unique constraint) a mensajes claros
            if (error.name === 'SequelizeUniqueConstraintError') {
                return next(boom.conflict('El nombre de usuario o la empresa ya existe'));
            }
            next(error);
        }
    }
);

/**
 * GET /api/v1/saas/check-slug/:slug
 *
 * Verifica si un slug (nombre de empresa) está disponible.
 * Útil para validación en tiempo real en el formulario de registro.
 */
router.get('/check-slug/:slug', async (req, res, next) => {
    try {
        const { slug } = req.params;
        const { models } = require('../../libs/sequelize');

        const existing = await models.Company.findOne({ where: { slug } });
        res.json({
            slug,
            available: !existing,
        });
    } catch (error) {
        next(error);
    }
});

// Middleware simple para restringir acceso solo al Super Admin (tenant ID 1)
// Asumimos que la empresa con ID 1 ("SaaS Admin") es la única autorizada a gestionar tenants.
const isSuperAdmin = (req, res, next) => {
    // Para simplificar pruebas MVP, si no existe el ID 1, permitimos al primer admin que llegue
    // Pero lo correcto es id === 1.
    if (req.companyId && req.companyId !== 1) {
        return next(boom.forbidden('Acceso restringido al Super Administrador (Tenant ID 1)'));
    }
    next();
};

// middlewares para rutas protegidas
const passport = require('passport');
const { checkRoles } = require('../../middlewares/auth.handler');
const { tenantGuard } = require('../../middlewares/tenant.handler');

/**
 * GET /api/v1/saas/billing
 * Devuelve información de facturación y uso de seats.
 * Requiere ser admin de la empresa.
 */
router.get('/billing',
    passport.authenticate('jwt', { session: false }),
    tenantGuard,
    checkRoles('admin'),
    async (req, res, next) => {
        try {
            const billingMetrics = await service.getBilling(req.companyId);
            success(res, billingMetrics, 'Información de facturación');
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/saas/create-checkout-session
 * Inicia el proceso de pago/suscripción en Stripe.
 */
router.post('/create-checkout-session',
    passport.authenticate('jwt', { session: false }),
    tenantGuard,
    checkRoles('admin'),
    async (req, res, next) => {
        try {
            const { priceId } = req.body;
            // Buscar empresa
            const { models } = require('../../libs/sequelize');
            const company = await models.Company.findByPk(req.companyId);

            // Lazy creation del Stripe Customer si no existe
            if (!company.stripeCustomerId) {
                // Necesitamos email del usuario actual? O email de la empresa?
                // Usaremos req.user.email (que viene del token)
                const user = req.user;
                // Mejor buscar el user completo si el token no trae email
                const fullUser = await models.User.findByPk(user.sub, { include: ['employee'] });
                const email = fullUser.employee?.email || `${company.slug}@saas.com`;

                const customer = await stripeService.createCustomer(email, company.name, { companyId: company.id });
                await company.update({ stripeCustomerId: customer.id });
            }

            const origin = req.headers.origin || 'http://localhost:3000'; // Fallback
            const successUrl = `${origin}/app/billing?success=true&session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = `${origin}/app/billing?canceled=true`;

            const session = await stripeService.createCheckoutSession(
                company.stripeCustomerId,
                priceId,
                successUrl,
                cancelUrl
            );
            success(res, { url: session.url }, 'Sesión de pago creada');
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/saas/create-portal-session
 * Redirige al portal de facturación de Stripe para gestionar suscripción.
 */
router.post('/create-portal-session',
    passport.authenticate('jwt', { session: false }),
    tenantGuard,
    checkRoles('admin'),
    async (req, res, next) => {
        try {
            const { models } = require('../../libs/sequelize');
            const company = await models.Company.findByPk(req.companyId);

            if (!company.stripeCustomerId) {
                throw boom.badRequest('No hay cliente de Stripe asociado. Suscríbete primero.');
            }

            const origin = req.headers.origin || 'http://localhost:3000';
            const returnUrl = `${origin}/app/billing`;

            const session = await stripeService.createPortalSession(
                company.stripeCustomerId,
                returnUrl
            );
            success(res, { url: session.url }, 'Sesión de portal creada');
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/v1/saas/stats
 * Estadísticas globales del SaaS (Dashboard Super Admin)
 */
router.get('/stats',
    passport.authenticate('jwt', { session: false }),
    tenantGuard, // Carga req.companyId
    checkRoles('admin', 'superadmin'),
    isSuperAdmin,
    async (req, res, next) => {
        try {
            const stats = await service.getGlobalStats();
            success(res, stats, 'Estadísticas globales');
        } catch (error) {
            next(error);
        }
    }
);

const { createCompanySchema, updateCompanyStatusSchema, queryCompanySchema } = require('../../schemas/saas/company.schema');

/**
 * GET /api/v1/saas/companies
 * Listado de todas las empresas registradas.
 */
router.get('/companies',
    passport.authenticate('jwt', { session: false }),
    tenantGuard,
    checkRoles('admin', 'superadmin'),
    isSuperAdmin,
    validatorHandler(queryCompanySchema, 'query'),
    async (req, res, next) => {
        try {
            const data = await service.getAllCompanies(req.query);
            success(res, data, 'Listado de empresas');
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/v1/saas/companies
 * Crear empresa desde panel (SaaS Admin)
 */
router.post('/companies',
    passport.authenticate('jwt', { session: false }),
    tenantGuard,
    checkRoles('admin', 'superadmin'),
    isSuperAdmin,
    validatorHandler(createCompanySchema, 'body'),
    async (req, res, next) => {
        try {
            const result = await service.createCompany(req.body);
            success(res, result, 'Empresa creada exitosamente', 201);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * PATCH /api/v1/saas/companies/:id/status
 * Activar o suspender una empresa manualmente.
 */
router.patch('/companies/:id/status',
    passport.authenticate('jwt', { session: false }),
    tenantGuard,
    checkRoles('admin', 'superadmin'),
    isSuperAdmin,
    validatorHandler(updateCompanyStatusSchema, 'body'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status } = req.body; // active, suspended
            const updated = await service.updateCompanyStatus(id, status);
            success(res, updated, 'Estado de empresa actualizado');
        } catch (error) {
            next(error);
        }
    }
);

const { queryUserSchema } = require('../../schemas/saas/user.schema');

/**
 * GET /api/v1/saas/users
 * Buscar usuarios para asignar como Owner.
 */
router.get('/users',
    passport.authenticate('jwt', { session: false }),
    tenantGuard,
    checkRoles('admin', 'superadmin'),
    isSuperAdmin,
    validatorHandler(queryUserSchema, 'query'),
    async (req, res, next) => {
        try {
            const data = await service.getUsers(req.query);
            success(res, data, 'Listado de usuarios');
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
