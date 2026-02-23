const boom = require('@hapi/boom');
const { models } = require('../../libs/sequelize');

class CashMovementService {
    constructor() { }

    /**
     * CashMovement no tiene company_id directamente; se scopa a través de Opening.
     * Verificamos que el opening pertenezca a la empresa del usuario.
     */
    async create(openingId, data, userId, companyId) {
        const opening = await models.Opening.findOne({
            where: { id: openingId, companyId }
        });
        if (!opening) {
            throw boom.notFound('Apertura no encontrada');
        }
        if (opening.status !== 1) {
            throw boom.badRequest('La apertura no está activa');
        }

        const newMovement = await models.CashMovement.create({
            ...data,
            openingId,
            userId
        });
        return newMovement;
    }

    async find(openingId, query, companyId) {
        // Verificar que el opening pertenece a esta empresa
        const opening = await models.Opening.findOne({
            where: { id: openingId, companyId }
        });
        if (!opening) {
            throw boom.notFound('Apertura no encontrada');
        }

        const { limit, offset, search, sortColumn, sortDirection } = query;
        const options = {
            where: { openingId },
            include: ['user'],
            order: [[sortColumn || 'createdAt', sortDirection || 'DESC']]
        };

        if (limit && offset) {
            options.limit = parseInt(limit);
            options.offset = parseInt(offset);
        }

        const movements = await models.CashMovement.findAndCountAll(options);
        return movements;
    }

    async getSummary(openingId, companyId) {
        const opening = await models.Opening.findOne({
            where: { id: openingId, companyId }
        });
        if (!opening) {
            throw boom.notFound('Apertura no encontrada');
        }

        const totalSalesResult = await models.Sale.sum('total', { where: { openingId } });
        const totalSales = parseFloat(totalSalesResult || 0);

        const totalCashInResult = await models.CashMovement.sum('amount', {
            where: { openingId, type: 'CASH_IN' }
        });
        const totalCashIn = parseFloat(totalCashInResult || 0);

        const totalCashOutResult = await models.CashMovement.sum('amount', {
            where: { openingId, type: 'CASH_OUT' }
        });
        const totalCashOut = parseFloat(totalCashOutResult || 0);

        const initBalance = parseFloat(opening.initBalance || 0);

        const expectedCash = initBalance + totalSales + totalCashIn - totalCashOut;

        return {
            openingId: parseInt(openingId),
            initBalance: initBalance.toFixed(2),
            totalSales: totalSales.toFixed(2),
            totalCashIn: totalCashIn.toFixed(2),
            totalCashOut: totalCashOut.toFixed(2),
            expectedCash: expectedCash.toFixed(2)
        };
    }
}

module.exports = CashMovementService;
