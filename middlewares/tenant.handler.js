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
        if (req.method === 'OPTIONS') return next();
        const user = req.user;

        if (!user || user.activeCompanyId === undefined || user.activeCompanyId === null) {
            return next(boom.badRequest('No activeCompanyId in token (requerido para esta ruta tenant)'));
        }

        const companyId = parseInt(user.activeCompanyId, 10);
        const isSuperAdmin = user.isSuperAdmin || (user.roles && user.roles.map(r => r.toUpperCase()).includes('SUPERADMIN'));

        if (isSuperAdmin) {
            // Es superadmin: validar que exista la empresa
            const companyExists = await models.Company.findByPk(companyId);
            if (!companyExists) {
                return next(boom.notFound('La empresa solicitada no existe'));
            }
            req.companyId = companyId;
            req.tenantRole = 'superadmin';
            return next();
        }

        // --- Lógica normal: Verificar membresía activa ---
        const membership = await models.CompanyUser.findOne({
            where: {
                userId: user.sub,
                companyId: companyId,
                status: 'active'
            }
        });

        if (!membership) {
            console.warn(
                `[SECURITY] User ${user.sub} attempted to access company ${companyId} without active membership`
            );
            return next(boom.forbidden('Forbidden: not a member of this company'));
        }

        // Establecer contexto de tenant
        req.companyId = companyId;
        req.tenantRole = membership.role;

        next();
    } catch (error) {
        next(error);
    }
}

module.exports = { tenantGuard };
