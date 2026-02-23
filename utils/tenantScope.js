const boom = require('@hapi/boom');

/**
 * Inyecta companyId en un objeto where de Sequelize.
 * Lanza 400 si companyId es undefined/null.
 *
 * @param {number} companyId - req.companyId (del token)
 * @param {object} [where={}] - Condiciones existentes
 * @returns {object} where con companyId incluido
 */
function withTenant(companyId, where = {}) {
    if (!companyId) {
        throw boom.badRequest('company_id is required (missing tenant context)');
    }
    return { ...where, companyId };
}

/**
 * Limpia el body del request:
 * - Elimina companyId / company_id enviados por el cliente
 * - Inyecta companyId desde el token
 * - Loguea warning si el cliente intentó mandar companyId
 *
 * @param {object} body - req.body
 * @param {number} companyId - req.companyId (del token)
 * @returns {object} body sanitizado con companyId del server
 */
function sanitizeBody(body, companyId) {
    const { companyId: _c, company_id: _ci, ...safe } = body;

    if (_c !== undefined || _ci !== undefined) {
        console.warn(
            `[SECURITY] Client sent companyId in body (value: ${_c || _ci}) — ignored, using token value: ${companyId}`
        );
    }

    return { ...safe, companyId };
}

module.exports = { withTenant, sanitizeBody };
