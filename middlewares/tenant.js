const boom = require('@hapi/boom');

/**
 * @deprecated Use tenantGuard (tenant.handler.js) instead.
 * This legacy middleware is less secure — it allows header/query spoofing.
 * Kept only for backward compatibility during migration.
 *
 * Tenant resolver middleware.
 * Extrae companyId en orden de prioridad:
 * 1. req.user.companyId (JWT)
 * 2. header x-company-id
 * 3. query param ?companyId=
 */
async function tenantResolver(req, res, next) {
    try {
        let companyId;

        // 1. Extraer del JWT (propuesto en login o fallback al anterior payload)
        if (req.user && (req.user.companyId || req.user.activeCompanyId)) {
            companyId = req.user.companyId || req.user.activeCompanyId;
        }
        // 2. Extraer de los Headers
        else if (req.headers['x-company-id']) {
            companyId = req.headers['x-company-id'];
        }
        // 3. Extraer de los query parameters (?companyId=1)
        else if (req.query.companyId) {
            companyId = req.query.companyId;
        }

        // 4. Fallback DB: Si aún no hay companyId, consultar la BD (ej. token antiguo o superadmin)
        if (!companyId && req.user && req.user.sub) {
            const { models } = require('../libs/sequelize');
            const userDb = await models.User.findByPk(req.user.sub, { attributes: ['companyId'] });
            if (userDb && userDb.companyId) {
                companyId = userDb.companyId;
            }
        }

        if (!companyId) {
            return next(boom.badRequest('Tenant resolution failed: companyId is missing in request.'));
        }

        // Set en req.tenant y req.companyId para compatibilidad
        req.tenant = { companyId: parseInt(companyId, 10) };
        req.companyId = req.tenant.companyId;

        next();
    } catch (error) {
        next(error);
    }
}

module.exports = { tenantResolver };

