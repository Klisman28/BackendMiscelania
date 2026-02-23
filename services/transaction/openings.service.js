const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models } = require('../../libs/sequelize');
const CashiersService = require('../transaction/cashiers.service');
const UsersService = require('../../services/organization/users.service');

const userService = new UsersService();
const cashierService = new CashiersService();

class OpeningsService {
    async find(query, companyId) {
        const { limit, offset, search, sortColumn, sortDirection } = query;
        const options = {
            where: { companyId },
            order: [(sortColumn) ? [sortColumn, sortDirection] : ['id', 'DESC']]
        }
        const optionsCount = { where: { companyId } };

        if (limit && offset) {
            options.limit = parseInt(limit);
            options.offset = parseInt(offset);
        }

        if (search) {
            options.where = {
                ...options.where,
                id: {
                    [Op.like]: `%${search}%`
                }
            }

            optionsCount.where = {
                ...optionsCount.where,
                id: {
                    [Op.like]: `%${search}%`
                }
            }
        }

        const openings = await models.Opening.findAll(options);
        const total = await models.Opening.count(optionsCount);

        return { openings, total };
    }

    async create(data, userId, companyId) {
        const user = await userService.findOne(userId);
        const employeeId = user.dataValues.employee.id
        const startDatetime = new Date();

        const { companyId: _c, company_id: _ci, ...safe } = data;

        const opening = await models.Opening.create({
            ...safe,
            employeeId,
            startDatetime,
            status: 1,
            companyId
        });

        if (opening) {
            let cashier = await cashierService.findOne(safe.cashierId, companyId)
            await cashier.update({ status: 1 })
        }
        return opening;
    }

    async findOne(id, companyId) {
        const opening = await models.Opening.findOne({
            where: { id, companyId },
            include: ['cashier', 'employee']
        });
        if (!opening) {
            throw boom.notFound('No se encontró ninguna apertura');
        }
        return opening;
    }

    async findByEmployee(userId, companyId) {
        const user = await userService.findOne(userId);
        const employeeId = user.dataValues.employee.id

        const opening = await models.Opening.findOne({
            include: ['cashier', 'employee', 'sales'],
            where: {
                status: 1,
                employeeId,
                companyId
            }
        });
        if (!opening) {
            throw boom.notFound('No existe ninguna caja aperturada');
        }
        return opening;
    }

    async update(id, changes, companyId) {
        let opening = await this.findOne(id, companyId);
        opening = await opening.update(changes);

        if (opening) {
            let cashier = await cashierService.findOne(opening.cashierId, companyId)
            await cashier.update({ status: 0 })
        }

        return opening;
    }

    async delete(id, companyId) {
        const opening = await this.findOne(id, companyId);
        await opening.destroy();
        return { id };
    }
}

module.exports = OpeningsService;