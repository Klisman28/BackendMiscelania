const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models } = require('../../libs/sequelize');
const { firstToUpperCase } = require('../../utils/firstToUpperCase');

class EmployeesService {
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
                fullname: {
                    [Op.like]: `%${search}%`
                }
            }

            optionsCount.where = {
                ...optionsCount.where,
                fullname: {
                    [Op.like]: `%${search}%`
                }
            }
        }

        const employees = await models.Employee.findAll(options);
        const total = await models.Employee.count(optionsCount);

        return { employees, total };
    }

    async create(data, companyId) {
        const { companyId: _c, company_id: _ci, ...safe } = data;
        const newData = {
            ...safe,
            companyId,
            fullname: `${firstToUpperCase(safe.name)} ${firstToUpperCase(safe.firstLastname)} ${firstToUpperCase(safe.secondLastname)}`
        }

        const employee = await models.Employee.create(newData);
        return employee;
    }

    async findOne(id, companyId) {
        const employee = await models.Employee.findOne({
            where: { id, companyId }
        });
        if (!employee) {
            throw boom.notFound('No se encontro ningun empleado');
        }
        return employee;
    }

    async update(id, changes, companyId) {
        const newChanges = {
            ...changes,
            fullname: `${firstToUpperCase(changes.name)} ${firstToUpperCase(changes.firstLastname)} ${firstToUpperCase(changes.secondLastname)}`
        }

        let employees = await this.findOne(id, companyId);
        employees = await employees.update(newChanges);
        return employees;
    }

    async delete(id, companyId) {
        const employee = await this.findOne(id, companyId);
        await employee.destroy();
        return { id };
    }
}

module.exports = EmployeesService;