const boom = require('@hapi/boom');
const auth = require('../config/auth.config');

/**
 * Middleware to check API key in request headers
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Express next function
 */
function checkApiKey(req, res, next) {
    const apiKey = req.headers['api'];
    if (apiKey === auth.apiKey) {
        next();
    } else {
        next(boom.unauthorized('Inicie sesión'));
    }
}

/**
 * Middleware factory for Role-Based Access Control (RBAC)
 * Verifica que el usuario tenga al menos uno de los roles especificados
 * 
 * @param {...string} roles - Roles permitidos (ej: 'admin', 'sales', 'warehouse')
 * @returns {function} Express middleware
 * 
 * @example
 * // Permitir solo admin y sales
 * router.get('/orders', 
 *   passport.authenticate('jwt', { session: false }),
 *   checkRoles('admin', 'sales'),
 *   ordersController.list
 * );
 * 
 * @example
 * // Permitir solo admin
 * router.delete('/products/:id', 
 *   passport.authenticate('jwt', { session: false }),
 *   checkRoles('admin'),
 *   productsController.delete
 * );
 */
function checkRoles(...roles) {
    return (req, res, next) => {
        const user = req.user;

        // Verificar que el usuario tenga roles
        if (!user || !user.roles || user.roles.length === 0) {
            return next(boom.forbidden('No tienes roles asignados'));
        }

        // Verificar si el usuario tiene al menos uno de los roles requeridos
        const hasRole = user.roles.some(userRole => roles.includes(userRole));

        if (hasRole) {
            next();
        } else {
            next(boom.forbidden(`Acceso denegado. Se requiere uno de los siguientes roles: ${roles.join(', ')}`));
        }
    }
}

// Alias para mayor claridad semántica
const authorizeRoles = checkRoles;

module.exports = { checkApiKey, checkRoles, authorizeRoles };
