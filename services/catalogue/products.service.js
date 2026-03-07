const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models } = require('../../libs/sequelize');
const { PRODUCT_STATUS } = require('../../database/models/product.model');
const { getStockLevel, STOCK_LEVELS } = require('../../utils/stockLevel');

const { processImage, deleteFile, sharp } = require('../../utils/file');
const InventoryService = require('../transaction/inventory.service');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

class ProductsService {
    // ... existing find methods ...
    // Whitelist for sortable columns to prevent injection
    static SORT_WHITELIST = ['id', 'name', 'sku', 'price', 'cost', 'stock', 'stockMin', 'status', 'createdAt', 'updatedAt', 'expirationDate'];
    // Whitelist for filter operators
    static FILTER_OP_WHITELIST = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'like', 'between'];

    async find(query, companyId) {
        if (!companyId) {
            throw boom.badRequest('Company ID is required');
        }
        const { limit, offset, search, sortColumn, sortDirection, filterField, filterType, filterValue, includeArchived, includeInactive } = query;

        // Build status filter directly, ignoring default scope which includes INACTIVE
        const ProductModel = models.Product.scope('withArchived');

        const statusWhere = {};
        if (includeArchived === 'true') {
            statusWhere.status = ['ACTIVE', 'ARCHIVED'];
        } else if (includeInactive === 'true') {
            statusWhere.status = ['ACTIVE', 'INACTIVE'];
        } else {
            statusWhere.status = 'ACTIVE';
        }

        if (query.status) {
            statusWhere.status = query.status.toUpperCase();
        }

        // Validate sortColumn against whitelist
        const safeSortColumn = ProductsService.SORT_WHITELIST.includes(sortColumn) ? sortColumn : 'id';
        const safeSortDir = ['ASC', 'DESC'].includes((sortDirection || '').toUpperCase()) ? sortDirection.toUpperCase() : 'DESC';

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
            order: [[safeSortColumn, safeSortDir]]
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
                ...optionsCount.where,
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
            // brand, subcategory, unit auto-included by defaultScope
            order: [['expirationDate', 'ASC']]
        });
    }


    addFilter(filterField, filterType, filterValue) {
        // Validate filterType against whitelist to prevent operator injection
        if (!ProductsService.FILTER_OP_WHITELIST.includes(filterType)) {
            return null;
        }

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
                    const value = filterValue.toUpperCase();
                    if (['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(value)) {
                        return { [Op.eq]: value };
                    }
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
            // brand, subcategory, unit auto-included by defaultScope
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
        // 1. Validar que el SKU no exista en esta compañía
        if (data.sku) {
            const existingProduct = await models.Product.findOne({
                where: { sku: data.sku, companyId }
            });
            if (existingProduct) {
                throw boom.conflict(`El SKU "${data.sku}" ya está registrado en tu compañía (producto: ${existingProduct.name})`);
            }
        }

        // 2. Validar que el NOMBRE no exista en esta compañía
        if (data.name) {
            const existingByName = await models.Product.findOne({
                where: { name: data.name, companyId }
            });
            if (existingByName) {
                throw boom.conflict(`Ya existe un producto con el nombre "${data.name}" en tu compañía`);
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
            if (!sharp) {
                throw boom.internal('Procesamiento de imagen no disponible');
            }
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
        const createdProduct = await models.Product.findByPk(product.id);

        return createdProduct;
    }

    async findOne(id, companyId) {
        // Usamos scope withArchived para poder encontrar productos en cualquier status
        const product = await models.Product.scope('withArchived').findOne({
            where: { id, companyId }
            // relaciones incluidas por el default scope
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

        if (updates.imageKey === null) {
            if (product.imageKey) {
                try {
                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_S3_BUCKET || 'imagepos',
                        Key: product.imageKey
                    }));
                } catch (error) {
                    console.error('Error deleting from S3', error);
                }
            }
            updates.imageKey = null;
        }

        // Asegurarse de que expirationDate solo se guarde si hasExpiration es true
        if (updates.hasExpiration === true && updates.expirationDate) {
            // Se mantiene la fecha enviada
        } else if (updates.hasExpiration === false) {
            updates.expirationDate = null;
        }

        // Procesar imagen si existe
        if (file) {
            if (!sharp) {
                throw boom.internal('Procesamiento de imagen no disponible');
            }
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
        const reloaded = await models.Product.scope('withArchived').findByPk(id);
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

    // ══════════════════════════════════════════════════════════════
    // ☞ LOW-STOCK ALERTS
    // ══════════════════════════════════════════════════════════════

    /**
     * List products with low stock or out of stock.
     * Only considers ACTIVE products.
     *
     * @param {object} query  — { level, limit, offset, search }
     * @param {number} companyId
     */
    async findLowStock(query, companyId) {
        if (!companyId) throw boom.badRequest('Company ID is required');

        const { level, limit: qLimit, offset: qOffset, search } = query;
        const limit = Math.min(parseInt(qLimit, 10) || 50, 200);
        const offset = parseInt(qOffset, 10) || 0;

        // Base: ACTIVE products where stock <= stockMin
        const where = {
            companyId,
            status: 'ACTIVE',
            stockMin: { [Op.gt]: 0 },                // only products with a configured min
            [Op.or]: [
                { stock: { [Op.lte]: models.sequelize.col('stock_min') } },
                { stock: { [Op.lte]: 0 } },
            ]
        };

        // Optional: filter by severity level
        if (level === 'out_of_stock') {
            delete where[Op.or];
            where.stock = { [Op.lte]: 0 };
        } else if (level === 'low_stock') {
            delete where[Op.or];
            where.stock = {
                [Op.gt]: 0,
                [Op.lte]: models.sequelize.col('stock_min'),
            };
        }

        if (search && search.trim()) {
            where[Op.and] = [
                {
                    [Op.or]: [
                        { name: { [Op.like]: `%${search}%` } },
                        { sku: { [Op.like]: `%${search}%` } },
                    ]
                }
            ];
        }

        const { count, rows } = await models.Product.scope('withArchived').findAndCountAll({
            where,
            limit,
            offset,
            order: [['stock', 'ASC']],    // most critical first
            attributes: ['id', 'name', 'sku', 'stock', 'stockMin', 'imageUrl', 'imageKey', 'price', 'status'],
            include: [
                { model: models.Brand, as: 'brand', attributes: ['id', 'name'] },
                { model: models.Subcategory, as: 'subcategory', attributes: ['id', 'name'] },
                { model: models.Unit, as: 'unit', attributes: ['id', 'symbol'] },
            ],
        });

        // Attach computed stock-level to each row
        const data = rows.map(p => {
            const plain = p.toJSON();
            plain.stockLevel = getStockLevel(plain.stock, plain.stockMin);
            return plain;
        });

        return {
            data,
            total: count,
            meta: { limit, offset },
        };
    }

    /**
     * Aggregate summary: counts of out-of-stock and low-stock products.
     * Designed for dashboard cards and the header bell badge.
     */
    async getStockAlertsSummary(companyId) {
        if (!companyId) throw boom.badRequest('Company ID is required');

        const baseWhere = {
            companyId,
            status: 'ACTIVE',
            stockMin: { [Op.gt]: 0 },
        };

        const outOfStock = await models.Product.scope('withArchived').count({
            where: { ...baseWhere, stock: { [Op.lte]: 0 } },
        });

        const lowStock = await models.Product.scope('withArchived').count({
            where: {
                ...baseWhere,
                stock: {
                    [Op.gt]: 0,
                    [Op.lte]: models.sequelize.col('stock_min'),
                },
            },
        });

        const totalProducts = await models.Product.scope('withArchived').count({
            where: { companyId, status: 'ACTIVE' },
        });

        return {
            outOfStock,
            lowStock,
            totalAlerts: outOfStock + lowStock,
            totalProducts,
        };
    }
}

module.exports = ProductsService;