const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models } = require('../../libs/sequelize');
const { PRODUCT_STATUS } = require('../../database/models/product.model');

const { processImage, deleteFile } = require('../../utils/file');
const InventoryService = require('../transaction/inventory.service');

class ProductsService {
    // ... existing find methods ...
    async find(query, companyId) {
        if (!companyId) {
            throw boom.badRequest('Company ID is required');
        }
        const { limit, offset, search, sortColumn, sortDirection, filterField, filterType, filterValue, includeArchived, includeInactive } = query;

        // Build status filter directly, ignoring default scope which includes INACTIVE
        const ProductModel = models.Product.scope('withArchived');

        const statusWhere = {};
        if (includeArchived === 'true') {
            // "Archivados" toggle active -> show ONLY ARCHIVED (or handle backend generically)
            // But if filterField=status is sent from frontend, this will get overwritten anyway.
            // Let's ensure the base where allows it.
            statusWhere.status = ['ACTIVE', 'ARCHIVED'];
        } else if (includeInactive === 'true') {
            statusWhere.status = ['ACTIVE', 'INACTIVE'];
        } else {
            // Default (no toggles) -> show ONLY ACTIVE
            statusWhere.status = 'ACTIVE';
        }

        // Si el frontend envía 'status' directamente en la query pidiéndolo explícitamente:
        if (query.status) {
            statusWhere.status = query.status.toUpperCase();
        }

        const options = {
            where: { companyId, ...statusWhere },
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
        const optionsCount = { where: { companyId } };

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

        const products = await ProductModel.findAll(options);
        const total = await ProductModel.count(optionsCount);

        return { products, total };
    }

    async findExpiringSoon(companyId) {
        // ... (keep as is) ...
        const products = await models.Product.findAll({
            where: {
                companyId,
                expirationDate: {
                    [Op.between]: [
                        Sequelize.literal('CURRENT_DATE'),
                        Sequelize.literal("CURRENT_DATE + interval \\'7 day\\'")
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
                // Ahora status es ENUM string, filtrar directo
                if (filterType === 'like') {
                    const value = filterValue.toUpperCase();
                    if (['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(value)) {
                        return { [Op.eq]: value };
                    }
                    // Mapeo amigable
                    if (value === 'ACTIVO') return { [Op.eq]: 'ACTIVE' };
                    if (value === 'INACTIVO' || value === 'DESCONTINUADO') return { [Op.eq]: 'INACTIVE' };
                    if (value === 'ARCHIVADO') return { [Op.eq]: 'ARCHIVED' };
                }
                return null;
            default:
                return null;
        }
    }

    async search(query, companyId) {
        const { limit, offset, search } = query;

        const options = {
            where: { companyId },
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


    async create(data, isQuickMode = false, file = null, companyId) {
        // 1. Validar que el SKU no exista
        if (data.sku) {
            const existingProduct = await models.Product.findOne({
                where: { sku: data.sku, companyId }
            });
            if (existingProduct) {
                throw boom.conflict(`El SKU "${data.sku}" ya está registrado en el producto: ${existingProduct.name}`);
            }
        }

        const productData = { ...data, companyId };

        // ── CRITICAL: stock siempre empieza en 0 ──
        productData.stock = 0;
        // ── Siempre inicia como ACTIVE ──
        productData.status = PRODUCT_STATUS.ACTIVE;

        // Si es modo rápido, aplicar defaults
        if (isQuickMode) {
            if (!productData.brandId) {
                let genericBrand = await models.Brand.findOne({
                    where: { name: 'GENÉRICA', companyId }
                });

                if (!genericBrand) {
                    genericBrand = await models.Brand.create({
                        name: 'GENÉRICA',
                        code: 'GEN',
                        companyId
                    });
                }

                productData.brandId = genericBrand.id;
            }

            if (productData.utility === undefined || productData.utility === null) {
                productData.utility = productData.price - productData.cost;
            }

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

        // Remover campos que no son de la DB
        const initialQty = productData.initialStock;
        const targetWarehouse = productData.warehouseId;
        const targetStockDesc = productData.stockDescription;
        delete productData.initialStock;
        delete productData.warehouseId;
        delete productData.stockDescription;

        // Procesar imagen si existe
        if (file) {
            const fileName = await processImage(file.buffer);
            const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
            productData.imageUrl = `${baseUrl}/uploads/products/${fileName}`;
        }

        // Crear el producto en la base de datos
        const product = await models.Product.create(productData);

        // Si hay stock inicial, invocar InventoryService
        if (initialQty > 0 && targetWarehouse) {
            const inventoryService = new InventoryService();
            await inventoryService.addStock({
                warehouseId: targetWarehouse,
                productId: product.id,
                quantity: initialQty,
                description: targetStockDesc || 'Stock inicial al crear producto',
                userId: null
            }, companyId);
        }

        // Retornar producto recargado con includes y stock real tras el movimiento
        const createdProduct = await models.Product.findByPk(product.id, {
            include: [
                { model: models.Brand, as: 'brand', attributes: ['id', 'name'] },
                { model: models.Subcategory, as: 'subcategory', attributes: ['id', 'name', 'categoryId'] },
                { model: models.Unit, as: 'unit', attributes: ['id', 'symbol'] }
            ]
        });

        return createdProduct;
    }

    async findOne(id, companyId) {
        // Usamos scope withArchived para poder encontrar productos en cualquier status
        const product = await models.Product.scope('withArchived').findOne({
            where: { id, companyId },
            include: ['brand', 'subcategory', 'unit']
        });
        if (!product) {
            throw boom.notFound('No se encontró ningún producto');
        }
        return product;
    }

    async update(id, changes, file = null, companyId) {
        let product = await this.findOne(id, companyId);
        const updates = { ...changes };

        // ── CRITICAL: Nunca permitir que el frontend sobreescriba stock directo ──
        delete updates.stock;
        delete updates.initialStock;
        // ── No permitir cambiar status vía update normal, usar updateStatus ──
        delete updates.status;

        // Clean removeImage from updates (not a DB column)
        const shouldRemoveImage = updates.removeImage === true || updates.removeImage === 'true';
        delete updates.removeImage;

        // Asegurarse de que expirationDate solo se guarde si hasExpiration es true
        if (updates.hasExpiration === true && updates.expirationDate) {
            // Se mantiene la fecha enviada
        } else if (updates.hasExpiration === false) {
            updates.expirationDate = null;
        }

        // Procesar imagen si existe
        if (file) {
            if (product.imageUrl) {
                const oldFileName = product.imageUrl.split('/').pop();
                deleteFile(oldFileName);
            }

            const fileName = await processImage(file.buffer);
            const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
            updates.imageUrl = `${baseUrl}/uploads/products/${fileName}`;
        } else if (shouldRemoveImage) {
            if (product.imageUrl) {
                const oldFileName = product.imageUrl.split('/').pop();
                deleteFile(oldFileName);
            }
            updates.imageUrl = null;
        }

        await product.update(updates);

        // Recargar el producto para devolver el stock real (no el del body)
        const reloaded = await models.Product.scope('withArchived').findByPk(id, {
            include: [
                { model: models.Brand, as: 'brand', attributes: ['id', 'name'] },
                { model: models.Subcategory, as: 'subcategory', attributes: ['id', 'name', 'categoryId'] },
                { model: models.Unit, as: 'unit', attributes: ['id', 'symbol'] }
            ]
        });
        return reloaded;
    }

    // ══════════════════════════════════════════════════════════════
    // ☞ updateStatus — PATCH /api/products/:id/status
    // ══════════════════════════════════════════════════════════════
    async updateStatus(id, { status, reason }, companyId) {
        const product = await this.findOne(id, companyId);

        // Validar valor de status
        if (![PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.INACTIVE, PRODUCT_STATUS.ARCHIVED].includes(status)) {
            throw boom.badRequest(`Status inválido: "${status}". Valores permitidos: ACTIVE, INACTIVE, ARCHIVED`);
        }

        // Si ya tiene ese status, no hacer nada
        if (product.status === status) {
            return product;
        }

        // ── Regla: para ARCHIVED, el stock global debe ser 0 ──
        if (status === PRODUCT_STATUS.ARCHIVED) {
            // Verificar stock global
            if (product.stock > 0) {
                throw boom.badRequest(
                    `No se puede archivar el producto "${product.name}" porque tiene stock global de ${product.stock} unidades. ` +
                    `Retire todo el stock antes de archivar.`
                );
            }
            // También verificar que la suma de balances sea 0
            const totalBalance = await models.InventoryBalance.sum('quantity', {
                where: { productId: id, companyId }
            });
            if (totalBalance && totalBalance > 0) {
                throw boom.badRequest(
                    `No se puede archivar el producto "${product.name}" porque tiene stock en bodegas (total: ${totalBalance}). ` +
                    `Retire todo el stock antes de archivar.`
                );
            }
        }

        // Preparar campos de auditoría
        const updates = { status };
        const now = new Date();

        if (status === PRODUCT_STATUS.INACTIVE) {
            updates.inactivatedAt = now;
            updates.inactiveReason = reason || null;
            // Si viene de ARCHIVED, limpiar archivedAt
            if (product.status === PRODUCT_STATUS.ARCHIVED) {
                updates.archivedAt = null;
            }
        } else if (status === PRODUCT_STATUS.ARCHIVED) {
            updates.archivedAt = now;
            updates.inactiveReason = reason || product.inactiveReason || null;
        } else if (status === PRODUCT_STATUS.ACTIVE) {
            // Reactivando: limpiar timestamps de inactivación/archivado
            updates.inactivatedAt = null;
            updates.archivedAt = null;
            updates.inactiveReason = null;
        }

        await product.update(updates);

        // Recargar con includes
        const reloaded = await models.Product.scope('withArchived').findByPk(id, {
            include: [
                { model: models.Brand, as: 'brand', attributes: ['id', 'name'] },
                { model: models.Subcategory, as: 'subcategory', attributes: ['id', 'name', 'categoryId'] },
                { model: models.Unit, as: 'unit', attributes: ['id', 'symbol'] }
            ]
        });

        return reloaded;
    }

    // ══════════════════════════════════════════════════════════════
    // ☞ delete — DELETE /api/products/:id  (soft delete con validación)
    // ══════════════════════════════════════════════════════════════
    async delete(id, companyId) {
        const product = await this.findOne(id, companyId);

        // ── Validar que NO tenga historial ──

        // 1. ¿Tiene movimientos de inventario?
        const movementCount = await models.InventoryMovement.count({
            where: { productId: id, companyId }
        });
        if (movementCount > 0) {
            throw boom.conflict(
                `No se puede eliminar el producto "${product.name}" porque tiene ${movementCount} movimiento(s) de inventario registrado(s). ` +
                `Considere cambiar su status a INACTIVE o ARCHIVED.`
            );
        }

        // 2. ¿Tiene ítems de venta?
        const saleItemCount = await models.ProductSale.count({
            where: { productId: id }
        });
        if (saleItemCount > 0) {
            throw boom.conflict(
                `No se puede eliminar el producto "${product.name}" porque aparece en ${saleItemCount} venta(s). ` +
                `Considere cambiar su status a INACTIVE o ARCHIVED.`
            );
        }

        // 3. ¿Tiene ítems de compra?
        const purchaseItemCount = await models.ProductPurchas.count({
            where: { productId: id }
        });
        if (purchaseItemCount > 0) {
            throw boom.conflict(
                `No se puede eliminar el producto "${product.name}" porque aparece en ${purchaseItemCount} compra(s). ` +
                `Considere cambiar su status a INACTIVE o ARCHIVED.`
            );
        }

        // 4. ¿Tiene stock?
        if (product.stock > 0) {
            throw boom.conflict(
                `No se puede eliminar el producto "${product.name}" porque tiene stock de ${product.stock} unidades. ` +
                `Retire todo el stock antes de eliminar.`
            );
        }

        // Si hay una imagen, borrarla
        if (product.imageUrl) {
            const fileName = product.imageUrl.split('/').pop();
            deleteFile(fileName);
        }

        // Soft delete (paranoid: true lo maneja automáticamente)
        await product.destroy();
        return { id };
    }

    async findUnits(companyId) {
        const units = await models.Unit.findAll({
            where: { companyId }
        });
        return units;
    }
}

module.exports = ProductsService;