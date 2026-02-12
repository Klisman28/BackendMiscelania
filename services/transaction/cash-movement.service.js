const boom = require('@hapi/boom');
const { models } = require('../../libs/sequelize');

class CashMovementService {
    constructor() { }

    async create(openingId, data, userId) {
        const opening = await models.Opening.findByPk(openingId);
        if (!opening) {
            throw boom.notFound('Opening not found');
        }
        if (opening.status !== 1) {
            throw boom.badRequest('Opening is not currently active (status is not 1)');
        }

        const newMovement = await models.CashMovement.create({
            ...data,
            openingId,
            userId
        });
        return newMovement;
    }

    async find(openingId, query) {
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

    async getSummary(openingId) {
        const opening = await models.Opening.findByPk(openingId);
        if (!opening) {
            throw boom.notFound('Opening not found');
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
