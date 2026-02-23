const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');

/**
 * Middleware de tenant que:
 * 1. Verifica que el JWT contenga companyId
 * 2. Verifica membresía activa en company_users
 * 3. Setea req.companyId y req.tenantRole
 *
 * DEBE ir DESPUÉS de passport.authenticate('jwt')
 */
async function tenantGuard(req, res, next) {
    try {
        const user = req.user;

        if (!user || !user.companyId) {
            return next(boom.badRequest('No activeCompanyId in token'));
        }

        // Superadmin puede actuar sobre cualquier company
        const isSuperadmin = user.roles &&
            user.roles.map(r => r.toUpperCase()).includes('SUPERADMIN');

        if (isSuperadmin) {
            req.companyId = user.companyId;
            req.tenantRole = 'superadmin';
            return next();
        }

        // Verificar membresía activa
        const membership = await models.CompanyUser.findOne({
            where: {
                userId: user.sub,
                companyId: user.companyId,
                status: 'active'
            }
        });

        if (!membership) {
            console.warn(
                `[SECURITY] User ${user.sub} attempted to access company ${user.companyId} without active membership`
            );
            return next(boom.forbidden('No tienes acceso a esta empresa'));
        }

        // Establecer contexto de tenant
        req.companyId = user.companyId;
        req.tenantRole = membership.role;

        next();
    } catch (error) {
        next(error);
    }
}

module.exports = { tenantGuard };
