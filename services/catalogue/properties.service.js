const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models } = require('../../libs/sequelize');

class PropertiesService {
    /**
     * Properties don't have company_id directly — they belong to a Subcategory
     * which does have company_id. We scope via the subcategory relationship.
     */
    async find(query, companyId) {
        const options = {
            order: [['id', 'ASC']],
            where: {
                subcategoryId: {
                    [Op.eq]: parseInt(query.subcategoryId)
                }
            },
            include: [
                'options',
                {
                    model: models.Subcategory,
                    as: 'subcategory',
                    where: { companyId },
                    attributes: []
                }
            ]
        }
        const properties = await models.Property.findAll(options);

        return properties;
    }

    async create(data, companyId) {
        // Verify the subcategory belongs to this company
        if (data.subcategoryId) {
            const subcategory = await models.Subcategory.findOne({
                where: { id: data.subcategoryId, companyId }
            });
            if (!subcategory) {
                throw boom.notFound('Subcategoría no encontrada o no pertenece a esta empresa');
            }
        }

        const property = await models.Property.create(data);

        if (data.searchable && data.options && data.options.length > 0) {
            const options = data.options.map((option) => {
                return {
                    ...option,
                    propertyId: property.id
                }
            });
            await models.Option.bulkCreate(options);
        }

        return property;
    }

    async findOne(id, companyId) {
        const property = await models.Property.findOne({
            where: { id },
            include: [
                'options',
                {
                    model: models.Subcategory,
                    as: 'subcategory',
                    where: { companyId },
                    attributes: []
                }
            ]
        });
        if (!property) {
            throw boom.notFound('No se encontro ninguna propiedad');
        }
        return property;
    }

    async update(id, changes, companyId) {
        let property = await this.findOne(id, companyId);

        property = await property.update(changes);
        await models.Option.destroy({
            where: {
                propertyId: id
            }
        });
        if (changes.searchable && changes.options && changes.options.length > 0) {
            const options = changes.options.map((option) => {
                return {
                    ...option,
                    propertyId: property.id
                }
            });
            await models.Option.bulkCreate(options);
        }
        return property;
    }

    async delete(id, companyId) {
        await models.Option.destroy({
            where: {
                propertyId: id
            }
        });
        const property = await this.findOne(id, companyId);
        await property.destroy();
        return { id };
    }
}

module.exports = PropertiesService;