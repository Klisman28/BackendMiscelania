const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models } = require('../../libs/sequelize');

class ProductsService {
    async find(query) {
        const { limit, offset, search, sortColumn, sortDirection, filterField, filterType, filterValue } = query;

        const options = {
            where: {},
            include: [
                {
                    model: models.Brand,
                    as: 'brand',
                    attributes: ['name']
                },
                {
                    model: models.Subcategory,
                    as: 'subcategory',
                    attributes: ['name']
                },
                {
                    model: models.Unit,
                    as: 'unit',
                    attributes: ['symbol']
                }
            ],
            order: [(sortColumn) ? [sortColumn, sortDirection] : ['id', 'DESC']]
        }
        const optionsCount = { where: {} };

        if (limit && offset) {
            options.limit = parseInt(limit);
            options.offset = parseInt(offset);
        }


        if (search) {
            options.where = {
                ...options.where,
                name: {
                    [Op.like]: `%${search}%`
                }
            }

            optionsCount.where = {
                name: {
                    [Op.like]: `%${search}%`
                }
            }
        }


        if (filterField && filterType && filterValue) {
            const data = this.addFilter(filterField, filterType, filterValue);
            if (data != null) {
                options.where = {
                    ...options.where,
                    [filterField]: data
                }
                optionsCount.where = {
                    ...optionsCount.where,
                    [filterField]: data
                }
            }
        }

        const products = await models.Product.findAll(options);
        const total = await models.Product.count(optionsCount);

        return { products, total };
    }

    async findExpiringSoon() {
        const products = await models.Product.findAll({
            where: {
                expirationDate: {
                    [Op.between]: [
                        Sequelize.literal('CURRENT_DATE'),
                        Sequelize.literal("CURRENT_DATE + interval \'7 day\'")
                    ]
                }
            },
            include: [
                { model: models.Brand, as: 'brand', attributes: ['name'] },
                { model: models.Subcategory, as: 'subcategory', attributes: ['name'] },
                { model: models.Unit, as: 'unit', attributes: ['symbol'] }
            ],
            order: [['expirationDate', 'ASC']]
        });
    }


    addFilter(filterField, filterType, filterValue) {
        // Filtros numéricos
        const numericFloatFields = ['cost', 'price'];
        const numericIntFields = ['stockMin', 'stock'];

        if (filterType !== 'like' && !isNaN(filterValue)) {
            if (numericFloatFields.includes(filterField)) {
                return { [Op[filterType]]: parseFloat(filterValue) };
            }
            if (numericIntFields.includes(filterField)) {
                return { [Op[filterType]]: parseInt(filterValue) };
            }
        }

        switch (filterField) {
            case 'expirationDate':
                return { [Op[filterType]]: filterValue };
            case 'status':
                if (filterType === 'like') {
                    const value = filterValue.toLowerCase();
                    if (value === 'activo') return { [Op.eq]: 1 };
                    if (value === 'inactivo') return { [Op.eq]: 2 };
                }
                return null;
            default:
                return null;
        }
    }

    async search(query) {
        const { limit, offset, search } = query;

        const options = {
            where: {},
            include: [
                {
                    model: models.Brand,
                    as: 'brand',
                    attributes: ['name']
                },
                {
                    model: models.Subcategory,
                    as: 'subcategory',
                    attributes: ['name']
                },
                {
                    model: models.Unit,
                    as: 'unit',
                    attributes: ['symbol']
                }
            ],
            order: [['name', 'DESC']]
        }

        if (limit && offset) {
            options.limit = parseInt(limit);
            options.offset = parseInt(offset);
        }

        if (search) {
            options.where = {
                ...options.where,
                [Op.or]: [
                    { name: { [Op.like]: `%${search}%` } },
                    { sku: { [Op.like]: `%${search}%` } }
                ]
            }
        }

        const products = await models.Product.findAll(options);

        return products;
    }


    async create(data, isQuickMode = false) {
        // 1. Validar que el SKU no exista
        if (data.sku) {
            const existingProduct = await models.Product.findOne({
                where: { sku: data.sku }
            });
            if (existingProduct) {
                throw boom.conflict(`El SKU "${data.sku}" ya está registrado en el producto: ${existingProduct.name}`);
            }
        }

        const productData = { ...data };

        // Si es modo rápido, aplicar defaults
        if (isQuickMode) {
            // 1. Si no viene brandId, buscar/crear marca "GENÉRICA"
            if (!productData.brandId) {
                let genericBrand = await models.Brand.findOne({
                    where: { name: 'GENÉRICA' }
                });

                if (!genericBrand) {
                    // Crear marca genérica una sola vez
                    genericBrand = await models.Brand.create({
                        name: 'GENÉRICA',
                        code: 'GEN'
                    });
                }

                productData.brandId = genericBrand.id;
            }

            // 2. Si no viene utility, calcular como diferencia: price - cost
            if (productData.utility === undefined || productData.utility === null) {
                productData.utility = productData.price - productData.cost;
            }

            // 3. Si no viene stock, default a 0
            if (productData.stock === undefined || productData.stock === null) {
                productData.stock = 0;
            }

            // 4. Si no viene stockMin, default a 0
            if (productData.stockMin === undefined || productData.stockMin === null) {
                productData.stockMin = 0;
            }
        }

        // Lógica de fecha de expiración simplificada
        if (data.hasExpiration && data.expirationDate) {
            productData.expirationDate = data.expirationDate;
        } else {
            productData.expirationDate = null;
        }

        // Crear el producto en la base de datos
        const product = await models.Product.create(productData);

        // Retornar producto con includes para mostrar brand, subcategory, unit
        const createdProduct = await models.Product.findByPk(product.id, {
            include: [
                { model: models.Brand, as: 'brand', attributes: ['id', 'name'] },
                { model: models.Subcategory, as: 'subcategory', attributes: ['id', 'name', 'categoryId'] },
                { model: models.Unit, as: 'unit', attributes: ['id', 'symbol'] }
            ]
        });

        return createdProduct;
    }

    async findOne(id) {
        const product = await models.Product.findByPk(id);
        if (!product) {
            throw boom.notFound('No se encontro ningun producto');
        }
        return product;
    }

    async update(id, changes) {
        let product = await this.findOne(id);
        const updates = { ...changes };

        // Asegurarse de que expirationDate solo se guarde si hasExpiration es true
        if (updates.hasExpiration === true && updates.expirationDate) {
            // Se mantiene la fecha enviada
        } else if (updates.hasExpiration === false) {
            updates.expirationDate = null;
        }

        // Si hay lógica condicional específica para 'description', se mantiene simple,
        // pero update() de Sequelize ya ignora campos undefined si no se pasan.

        product = await product.update(updates);
        return product;
    }

    async delete(id) {
        const product = await this.findOne(id);
        await product.destroy();
        return { id };
    }

    async findUnits() {
        const units = await models.Unit.findAll();
        return units;
    }
}

module.exports = ProductsService;