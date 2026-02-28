// purchases.service.js
const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models, sequelize } = require('../../libs/sequelize');
const UsersService = require('../../services/organization/users.service');
const InventoryService = require('./inventory.service');
const service = new UsersService();

class PurchasesService {
  constructor() {
    this.inventoryService = new InventoryService();
  }

  async find(query, companyId) {
    const { limit, offset, search, sortColumn, sortDirection } = query;
    const options = {
      where: { companyId },
      include: [
        {
          model: models.Product,
          as: 'products',
          attributes: ['id', 'name'],
          through: {
            as: 'item',
            attributes: ['quantity', 'unitCost']
          }
        },
        { model: models.Supplier, as: 'supplier', attributes: ['name', 'ruc'] },
        { model: models.Employee, as: 'employee', attributes: ['fullname', 'dni'] }
      ],
      order: sortColumn ? [[sortColumn, sortDirection]] : [['id', 'DESC']]
    };

    const optionsCount = {
      where: { companyId },
      include: [
        { model: models.Supplier, as: 'supplier', attributes: ['name', 'ruc'] },
      ]
    };

    if (limit && offset) {
      options.limit = parseInt(limit, 10);
      options.offset = parseInt(offset, 10);
    }

    // Si "number" es columna de purchases, filtra en options.where
    if (search) {
      options.where = {
        ...options.where,
        number: { [Op.like]: `%${search}%` },
      };
      optionsCount.where = {
        ...optionsCount.where,
        number: { [Op.like]: `%${search}%` },
      };
    }

    const purchases = await models.Purchas.findAll(options);
    const total = await models.Purchas.count(optionsCount);
    return { purchases, total };
  }

  async create(data, userId, companyId) {
    const user = await service.findOne(userId);
    const employeeId = user.dataValues.employee.id;

    // Sanitize: remove any client-sent companyId
    const { companyId: _c, company_id: _ci, ...safeData } = data;

    return await sequelize.transaction(async (t) => {
      const purchas = await models.Purchas.create(
        { ...safeData, employeeId, companyId },
        { transaction: t }
      );

      if (safeData.products && safeData.products.length > 0) {
        for (const item of safeData.products) {
          const product = await models.Product.scope('withArchived').findByPk(item.productId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
          });

          if (!product) throw boom.badRequest(`Producto ${item.productId} no existe`);

          // ── Validar que el producto esté ACTIVE para poder comprarlo ──
          if (product.status !== 'ACTIVE') {
            const statusLabel = product.status === 'INACTIVE' ? 'descontinuado' : 'archivado';
            throw boom.badRequest(
              `No se puede comprar/reabastecer el producto "${product.name}" (ID: ${product.id}) porque está ${statusLabel}. ` +
              `Solo se puede comprar productos con status ACTIVE.`
            );
          }

          await purchas.addProduct(product, {
            through: { quantity: item.quantity, unitCost: item.unitCost },
            transaction: t,
          });

          // Ensure InventoryBalance exists (purchases shouldn't magically augment global without balance)
          const balance = await models.InventoryBalance.findOne({
            where: { warehouseId: safeData.warehouseId, productId: item.productId, companyId },
            transaction: t,
            lock: t.LOCK.UPDATE
          });
          if (balance) {
            await balance.increment('quantity', { by: item.quantity, transaction: t });
          } else {
            if (!safeData.warehouseId) throw boom.badRequest('warehouseId es requerido al comprar');
            await models.InventoryBalance.create({
              warehouseId: safeData.warehouseId,
              productId: item.productId,
              quantity: item.quantity,
              companyId
            }, { transaction: t });
          }

          // Register Movement
          await models.InventoryMovement.create({
            productId: item.productId,
            warehouseId: safeData.warehouseId,
            type: 'IN', // Purchase
            quantity: item.quantity,
            referenceId: purchas.id.toString(),
            description: `Compra Proveedor`,
            userId,
            createdAt: new Date(),
            companyId
          }, { transaction: t });

          // Sincronizar Global
          await this.inventoryService.syncProductStock(item.productId, companyId, t);
        }
      }

      return purchas;
    });
  }

  async findOne(id, companyId) {
    const purchas = await models.Purchas.findOne({
      where: { id, companyId },
      include: [
        {
          model: models.Product,
          as: 'products',
          attributes: ['id', 'name'],
          through: {
            as: 'item',
            attributes: ['quantity', 'unitCost']
          }
        },
        { model: models.Supplier, as: 'supplier', attributes: ['name', 'ruc'] },
        { model: models.Employee, as: 'employee', attributes: ['fullname', 'dni'] }
      ]
    });
    if (!purchas) throw boom.notFound('No se encontró ninguna compra');
    return purchas;
  }

  async update(id, changes, companyId) {
    return await sequelize.transaction(async (t) => {
      let purchas = await this.findOne(id, companyId);

      // 1) Revertir stock actual
      if (purchas.products?.length) {
        for (const p of purchas.products) {
          const qty = p.item.quantity;

          const balance = await models.InventoryBalance.findOne({
            where: { warehouseId: purchas.warehouseId, productId: p.id, companyId },
            transaction: t,
            lock: t.LOCK.UPDATE
          });
          if (balance) await balance.decrement('quantity', { by: qty, transaction: t });

          await models.InventoryMovement.create({
            productId: p.id, warehouseId: purchas.warehouseId, type: 'OUT',
            quantity: qty, description: `Reversión Act. Compra`, userId: null, companyId
          }, { transaction: t });

          await this.inventoryService.syncProductStock(p.id, companyId, t);
        }
      }

      // 2) Borrar ítems actuales de la compra
      await models.ProductPurchas.destroy({
        where: { purchasId: id },
        transaction: t
      });

      // 3) Actualizar cabecera y re-crear ítems
      purchas = await purchas.update(changes, { transaction: t });

      if (changes.products?.length) {
        for (const item of changes.products) {
          const product = await models.Product.findByPk(item.productId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
          });
          if (!product) throw boom.badRequest(`Producto ${item.productId} no existe`);

          await purchas.addProduct(product, {
            through: { quantity: item.quantity, unitCost: item.unitCost },
            transaction: t,
          });

          const balance = await models.InventoryBalance.findOne({
            where: { warehouseId: changes.warehouseId || purchas.warehouseId, productId: item.productId, companyId },
            transaction: t,
            lock: t.LOCK.UPDATE
          });
          if (balance) {
            await balance.increment('quantity', { by: item.quantity, transaction: t });
          } else {
            await models.InventoryBalance.create({
              warehouseId: changes.warehouseId || purchas.warehouseId,
              productId: item.productId,
              quantity: item.quantity,
              companyId
            }, { transaction: t });
          }

          // Register Movement
          await models.InventoryMovement.create({
            productId: item.productId,
            warehouseId: changes.warehouseId || purchas.warehouseId,
            type: 'IN', // Purchase
            quantity: item.quantity,
            referenceId: purchas.id.toString(),
            description: `Actualización Compra Proveedor`,
            userId: null,
            createdAt: new Date(),
            companyId
          }, { transaction: t });

          await this.inventoryService.syncProductStock(item.productId, companyId, t);
        }
      }

      return purchas;
    });
  }

  async delete(id, companyId) {
    const purchas = await this.findOne(id, companyId);
    await purchas.destroy();
    return { id };
  }
}

module.exports = PurchasesService;
