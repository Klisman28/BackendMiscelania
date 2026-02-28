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
function buildPagination({ limit, offset, page }) {
    const defaultLimit = 10;
    const defaultOffset = 0;
    const l = Math.max(1, parseInt(limit, 10) || defaultLimit);
    const p = Math.max(1, parseInt(page, 10) || 1);
    const o = parseInt(offset, 10) >= 0 ? parseInt(offset, 10) : (p - 1) * l;
    return { limit: l, offset: o };
}

module.exports = { withTenant, sanitizeBody, buildPagination };
