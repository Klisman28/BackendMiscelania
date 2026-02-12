const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models } = require('../../libs/sequelize');
const { firstToUpperCase } = require('../../utils/firstToUpperCase');

class CustomersService {
    /**
     * Helper para mapear campos antiguos a nuevos
     * Mantiene compatibilidad con requests que usen formato antiguo
     */
    _mapLegacyFields(data) {
        const mapped = { ...data };

        // Si vienen campos antiguos y NO vienen los nuevos, mapear
        if (!mapped.firstName && mapped.name) {
            mapped.firstName = mapped.name;
        }

        if (!mapped.lastName && (mapped.firstLastname || mapped.secondLastname)) {
            const parts = [];
            if (mapped.firstLastname) parts.push(mapped.firstLastname);
            if (mapped.secondLastname) parts.push(mapped.secondLastname);
            mapped.lastName = parts.join(' ');
        }

        return mapped;
    }

    /**
     * Helper para aplicar regla de NIT según isFinalConsumer
     */
    _handleNIT(data) {
        const processed = { ...data };

        // Si es consumidor final, forzar NIT = 'CF'
        if (processed.isFinalConsumer === true) {
            processed.nit = 'CF';
        } else if (processed.isFinalConsumer === false) {
            // Si no es CF y no se proveyó NIT, dejar null
            if (!processed.nit || processed.nit.trim() === '') {
                processed.nit = null;
            }
        }

        return processed;
    }

    async find(query) {
        const { limit, offset, search, sortColumn, sortDirection } = query;

        const options = {
            order: [(sortColumn) ? [sortColumn, sortDirection] : ['id', 'DESC']]
        }
        const optionsCount = {};

        if (limit && offset) {
            options.limit = parseInt(limit);
            options.offset = parseInt(offset);
        }

        if (search) {
            options.where = {
                [Op.or]: [
                    { firstName: { [Op.like]: `%${search}%` } },
                    { lastName: { [Op.like]: `%${search}%` } },
                    { nit: { [Op.like]: `%${search}%` } },
                    // Búsqueda en fullname para compatibilidad con datos antiguos
                    { fullname: { [Op.like]: `%${search}%` } }
                ]
            };

            optionsCount.where = options.where;
        }

        const customers = await models.Customer.findAll(options);
        const total = await models.Customer.count(optionsCount);

        return { customers, total };
    }

    async create(data) {
        // 1. Mapear campos antiguos a nuevos si es necesario
        let mappedData = this._mapLegacyFields(data);

        // 2. Aplicar regla de NIT
        mappedData = this._handleNIT(mappedData);

        // 3. Generar fullname para compatibilidad y búsqueda
        if (mappedData.firstName && mappedData.lastName) {
            mappedData.fullname = `${firstToUpperCase(mappedData.firstName)} ${firstToUpperCase(mappedData.lastName)}`;
        }

        // 4. Crear cliente
        const customer = await models.Customer.create(mappedData);

        // 5. Retornar solo los campos nuevos en la respuesta
        return {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            isFinalConsumer: customer.isFinalConsumer,
            nit: customer.nit,
            email: customer.email,
            telephone: customer.telephone,
            address: customer.address
        };
    }

    async findOne(id) {
        const customer = await models.Customer.findByPk(id);
        if (!customer) {
            throw boom.notFound('No se encontró ningún cliente');
        }

        // Retornar estructura consistente con campos nuevos
        return {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            isFinalConsumer: customer.isFinalConsumer,
            nit: customer.nit,
            email: customer.email,
            telephone: customer.telephone,
            address: customer.address,
            // Campos antiguos para compatibilidad (si existen)
            ...(customer.name && { name: customer.name }),
            ...(customer.firstLastname && { firstLastname: customer.firstLastname }),
            ...(customer.secondLastname && { secondLastname: customer.secondLastname }),
            ...(customer.fullname && { fullname: customer.fullname }),
            ...(customer.dni && { dni: customer.dni })
        };
    }

    async update(id, changes) {
        // 1. Verificar que existe
        const customer = await models.Customer.findByPk(id);
        if (!customer) {
            throw boom.notFound('No se encontró ningún cliente');
        }

        // 2. Mapear campos antiguos a nuevos si es necesario
        let mappedChanges = this._mapLegacyFields(changes);

        // 3. Aplicar regla de NIT
        mappedChanges = this._handleNIT(mappedChanges);

        // 4. Actualizar fullname si se modifican firstName o lastName
        if (mappedChanges.firstName || mappedChanges.lastName) {
            const newFirstName = mappedChanges.firstName || customer.firstName;
            const newLastName = mappedChanges.lastName || customer.lastName;
            mappedChanges.fullname = `${firstToUpperCase(newFirstName)} ${firstToUpperCase(newLastName)}`;
        }

        // 5. Actualizar
        const updated = await customer.update(mappedChanges);

        // 6. Retornar estructura consistente
        return {
            id: updated.id,
            firstName: updated.firstName,
            lastName: updated.lastName,
            isFinalConsumer: updated.isFinalConsumer,
            nit: updated.nit,
            email: updated.email,
            telephone: updated.telephone,
            address: updated.address
        };
    }

    async delete(id) {
        const customer = await models.Customer.findByPk(id);
        if (!customer) {
            throw boom.notFound('No se encontró ningún cliente');
        }

        await customer.destroy();
        return { id };
    }
}

module.exports = CustomersService;
