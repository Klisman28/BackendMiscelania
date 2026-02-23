const boom = require('@hapi/boom');

function tenantGuard(req, res, next) {
    const user = req.user;

    if (!user || !user.companyId) {
        return next(boom.unauthorized('Tenant context is missing or invalid'));
    }

    // Establecer el companyId en la request para uso global
    req.companyId = user.companyId;

    // Opcional: Logging para debug
    // console.log(`[TenantGuard] User ${user.sub} accessing company ${req.companyId}`);

    next();
}

module.exports = { tenantGuard };
