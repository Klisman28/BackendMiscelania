const express = require('express');
const passport = require('passport');

const brandsRouter = require('./catalogue/brands.router');
const categoriesRouter = require('./catalogue/categories.router');
const subcategoriesRouter = require('./catalogue/subcategories.router');
const propertiesRouter = require('./catalogue/properties.router');
const productsRouter = require('./catalogue/products.router');
const featuresRouter = require('./catalogue/features.router');
const authRouter = require('./auth/auth.router');
const ticketsRouter = require('./transaction/tickets.router');

const employeesRouter = require('./organization/employees.router');
const usersRouter = require('./organization/users.router');
const suppliersRouter = require('./organization/suppliers.router');
const warehousesRouter = require('./organization/warehouses.router');

const purchasesRouter = require('./transaction/purchases.router');
const cashiersRouter = require('./transaction/cashier.router');
const openingsRouter = require('./transaction/openings.router');
const salesRouter = require('./transaction/sales.router');
const configsRouter = require('./transaction/configs.router');
const inventoryRouter = require('./transaction/inventory.router');

const customersRouter = require('./client/customers.router');
const enterprisesRouter = require('./client/enterprises.router');

const { checkRoles, requireSuperAdmin } = require('../middlewares/auth.handler');
const { tenantGuard } = require('../middlewares/tenant.handler');
const notesRouter = require('./notes/notes.router');
const reportRouter = require('./report/reports.router');
const saasRouter = require('./saas/saas.router');
const uploadsRouter = require('./uploads/uploads.router');

function apiRouter(app) {
    const router = express.Router();

    app.use('/api/v1', router);

    router.get('/', (req, res) => {
        res.json({ message: 'API v1 activa' });
    });

    router.get('/healthcheck', (req, res) => {
        res.status(200).json({ status: 'ok', uptime: process.uptime() });
    });

    router.use('/report',
        passport.authenticate('jwt', { session: false }),
        tenantGuard,
        checkRoles('almacenero', 'admin'),
        reportRouter
    );
    router.use('/brands',
        passport.authenticate('jwt', { session: false }),
        tenantGuard,
        checkRoles('almacenero', 'admin'),
        brandsRouter
    );

    router.use('/categories', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('almacenero', 'admin'),
        categoriesRouter
    );

    router.use('/subcategories', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('almacenero', 'admin'),
        subcategoriesRouter
    );

    router.use('/properties', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('almacenero', 'admin'),
        propertiesRouter
    );

    router.use('/products', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('almacenero', 'cajero', 'admin'),
        productsRouter
    );

    router.use('/features', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('almacenero', 'admin'),
        featuresRouter
    );

    router.use('/employees', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('admin'),
        employeesRouter
    );

    router.use('/suppliers', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('admin'),
        suppliersRouter
    );

    router.use('/purchases', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('almacenero', 'admin'),
        purchasesRouter
    );

    router.use('/customers', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('almacenero', 'admin'),
        customersRouter
    );

    router.use('/enterprises', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('almacenero', 'admin'),
        enterprisesRouter
    );

    router.use('/openings', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('cajero', 'admin'),
        openingsRouter
    );

    router.use('/cashiers', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('cajero', 'admin'),
        cashiersRouter
    );

    router.use('/sales', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('cajero', 'admin'),
        salesRouter
    );

    router.use('/configs', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('cajero', 'admin'),
        configsRouter
    );

    router.use('/notes', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('cajero', 'admin'),
        notesRouter
    );
    router.use('/tickets', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('cajero', 'admin'),
        ticketsRouter
    );

    router.use('/warehouses', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('almacenero', 'admin'),
        warehousesRouter
    );

    router.use('/inventory', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('almacenero', 'admin'),
        inventoryRouter
    );

    router.use('/uploads', passport.authenticate('jwt',
        { session: false }),
        tenantGuard,
        checkRoles('admin', 'almacenero'),
        uploadsRouter
    );



    router.use('/users', passport.authenticate('jwt',
        { session: false }),
        requireSuperAdmin,
        usersRouter
    );
    router.use('/auth', authRouter);

    // ── Rutas públicas SaaS (sin autenticación) ──────────────────────────
    router.use('/saas', require('./saas/webhook.router')); // Webhook raw body

    // ── Rutas protegidas SaaS ───────────────────────────────────────────────
    router.use('/saas/roles',
        passport.authenticate('jwt', { session: false }),
        requireSuperAdmin,
        require('./saas/roles.router')
    );
    router.use('/saas', saasRouter);
}

module.exports = apiRouter;