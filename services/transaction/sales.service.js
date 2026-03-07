const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { sequelize, Sequelize, models } = require('../../libs/sequelize');
const InventoryService = require('./inventory.service');

class SalesService {
  // Whitelist for sortable columns
  static SORT_WHITELIST = ['id', 'total', 'igv', 'status', 'saleableType', 'createdAt', 'number'];
  // Whitelist for filter operators
  static FILTER_OP_WHITELIST = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'like'];

  constructor() {
    this.inventoryService = new InventoryService();
  }

  async find(query, companyId) {
    const {
      limit,
      offset,
      sortColumn,
      sortDirection,
      filterField,
      filterType,
      filterValue
    } = query;

    // Validate sort against whitelist
    const safeSortColumn = SalesService.SORT_WHITELIST.includes(sortColumn) ? sortColumn : 'id';
    const safeSortDir = ['ASC', 'DESC'].includes((sortDirection || '').toUpperCase()) ? sortDirection.toUpperCase() : 'DESC';

    const options = {
      where: { companyId },
      include: [
        {
          model: models.Product,
          as: 'products',
          attributes: ['id', 'name', 'sku'],
          // brand, subcategory, unit auto-included by Product's defaultScope
          through: {
            as: 'item',
            attributes: ['quantity', 'unitPrice']
          }
        },
        {
          model: models.Opening,
          as: 'opening',
          attributes: [],
          include: [
            {
              model: models.Employee,
              as: 'employee',
              attributes: ['fullname', 'dni']
            }
          ]
        },
        {
          model: models.Customer,
          as: 'customer',
          attributes: ['fullname', 'dni', 'email', 'telephone']
        },
        {
          model: models.Enterprise,
          as: 'enterprise',
          attributes: ['name', 'ruc', 'email', 'telephone']
        }
      ],
      order: [[safeSortColumn, safeSortDir]]
    };

    const optionsCount = {
      where: { companyId },
      include: [
        {
          model: models.Product,
          as: 'products',
          attributes: [],
          through: {
            as: 'item',
            attributes: []
          }
        }
      ]
    };

    if (limit && offset) {
      options.limit = parseInt(limit);
      options.offset = parseInt(offset);
    }

    // ----------------------------------------------------------
    // Lógica de filtrado
    // ----------------------------------------------------------
    if (filterField && filterValue) {
      // Búsqueda en productos (nombre y/o sku)
      if (filterField === 'product') {
        // Busca tanto por nombre como por SKU
        const searchCondition = {
          [Op.or]: [
            { name: { [Op.like]: `%${filterValue}%` } },
            { sku: { [Op.like]: `%${filterValue}%` } }
          ]
        };
        options.include[0].where = searchCondition;
        optionsCount.include[0].where = searchCondition;
      } else if (filterField === 'sku') {
        // Busca solo por SKU
        const searchCondition = {
          sku: { [Op.like]: `%${filterValue}%` }
        };
        options.include[0].where = searchCondition;
        optionsCount.include[0].where = searchCondition;
      } else if (filterField === 'name') {
        // Busca solo por nombre
        const searchCondition = {
          name: { [Op.like]: `%${filterValue}%` }
        };
        options.include[0].where = searchCondition;
        optionsCount.include[0].where = searchCondition;
      } else {
        // Filtros para otros campos de la tabla Sales
        const data = this.addFilter(filterField, filterType, filterValue);
        if (data !== null) {
          options.where = { ...options.where, [filterField]: data };
          optionsCount.where = { ...optionsCount.where, [filterField]: data };
        }
      }
    }

    const sales = await models.Sale.findAll(options);
    const total = await models.Sale.count(optionsCount);

    return { sales, total };
  }


  addFilter(filterField, filterType, filterValue) {
    // Validate filterType against whitelist
    if (filterType && !SalesService.FILTER_OP_WHITELIST.includes(filterType)) {
      return null;
    }
    switch (filterField) {
      case 'total':
        if (filterType !== "like" && !isNaN(filterValue)) {
          return {
            [Op[filterType]]: parseFloat(filterValue)
          };
        }
        return null;
      case 'igv':
        if (filterType !== "like" && !isNaN(filterValue)) {
          return {
            [Op[filterType]]: parseFloat(filterValue)
          };
        }
        return null;
      case 'saleableType':
        if (filterType === 'like') {
          const newFilterValue = filterValue.toLowerCase();
          if (newFilterValue === 'boleta') {
            return {
              [Op.eq]: "boletas"
            };
          } else if (newFilterValue === 'factura') {
            return {
              [Op.eq]: "invoces"
            };
          } else if (newFilterValue === 'ticket') {
            return {
              [Op.eq]: "tickets"
            };
          }
        }
        return null;
      case 'status':
        if (filterType === 'like') {
          if ((filterValue.toLowerCase()) === 'activo') {
            return {
              [Op.eq]: 1
            };
          } else if ((filterValue.toLowerCase()) === 'anulado') {
            return {
              [Op.eq]: 2
            };
          }
        }
        return null;
      default:
        return null;
    }
  }

  async create(data, companyId) {
    return await sequelize.transaction(async (t) => {
      // 1. Obtener configuración actual
      const config = await models.Config.findOne({
        where: { companyId },
        transaction: t
      });
      if (!config) {
        throw boom.notFound('No se encontró configuración para tickets');
      }

      // 2. Si es venta tipo Ticket, asignar y formatear número
      if (data.type === 'Ticket') {
        const digitCount = String(config.ticketNum).length;
        data.number = String(config.ticketNum).padStart(digitCount, '0');
      }

      // Validar Warehouse: debe existir, estar activa, pertenecer a la empresa, Y ser tipo "tienda"
      if (!data.warehouseId) {
        throw boom.badRequest('warehouseId es requerido');
      }
      const warehouse = await models.Warehouse.findOne({
        where: { id: data.warehouseId, companyId },
        transaction: t
      });
      if (!warehouse) {
        throw boom.badRequest('Ubicación no encontrada o no pertenece a esta empresa');
      }
      if (!warehouse.active) {
        throw boom.badRequest('Ubicación inactiva');
      }
      if (warehouse.type !== 'tienda') {
        throw boom.badRequest(
          `Solo se pueden registrar ventas desde ubicaciones tipo "tienda". ` +
          `"${warehouse.name}" es de tipo "${warehouse.type}".`
        );
      }

      // 3. Crear la venta
      const sale = await models.Sale.create({ ...data, companyId }, { transaction: t });

      // 4. Asociar productos (manteniendo tu lógica actual)
      // 3) Agregar ítems y **RESTAR** stock
      if (data.products && data.products.length > 0) {
        for (const item of data.products) {
          if (!item.productId || !item.quantity || item.quantity <= 0) {
            throw boom.badRequest('Producto/quantity inválidos en ítem de venta');
          }

          // Leer y bloquear la fila del producto para evitar condiciones de carrera
          const product = await models.Product.scope('withArchived').findByPk(item.productId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
          });
          if (!product) {
            throw boom.badRequest(`Producto ${item.productId} no existe`);
          }

          // ── Validar que el producto esté ACTIVE para poder venderlo ──
          if (product.status !== 'ACTIVE') {
            const statusLabel = product.status === 'INACTIVE' ? 'descontinuado' : 'archivado';
            throw boom.badRequest(
              `No se puede vender el producto "${product.name}" (ID: ${product.id}) porque está ${statusLabel}. ` +
              `Solo se pueden vender productos con status ACTIVE.`
            );
          }

          // Validar stock suficiente en BODEGA
          const balance = await models.InventoryBalance.findOne({
            where: { warehouseId: data.warehouseId, productId: item.productId, companyId },
            transaction: t,
            lock: t.LOCK.UPDATE
          });

          const currentStock = balance ? balance.quantity : 0;

          if (currentStock < item.quantity) {
            throw boom.conflict(
              `Stock insuficiente en bodega para ${product.name} (id ${product.id}). ` +
              `Stock actual: ${currentStock}, solicitado: ${item.quantity}`
            );
          }

          // Crear ítem en la tabla puente
          await sale.addProduct(product, {
            through: {
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            },
            transaction: t,
          });

          // **Restar** stock de la bodega
          await balance.decrement('quantity', { by: item.quantity, transaction: t });

          // **Sincronizar** stock global del producto con la base calculada real
          await this.inventoryService.syncProductStock(item.productId, companyId, t);

          // Registrar Movimiento SALE
          await models.InventoryMovement.create({
            productId: item.productId,
            warehouseId: data.warehouseId,
            type: 'SALE',
            quantity: item.quantity,
            referenceId: sale.id.toString(),
            description: `Venta ${sale.type} ${sale.number || sale.id}`,
            userId: null, // Si data.userId existe, usarlo
            createdAt: new Date(),
            companyId
          }, { transaction: t });
        }
      }

      // 5. Incrementar el contador ticketNum en Config
      if (data.type === 'Ticket') {
        await config.update(
          { ticketNum: config.ticketNum + 1 },
          { transaction: t }
        );
      }

      return sale;
    });
  }

  async findByOpening(openingId, companyId) {
    const options = {
      where: {
        openingId: openingId,
        companyId
      },
      include: [
        {
          model: models.Product,
          as: 'products',
          attributes: ['id', 'name'],
          // Auto-included by defaultScope
          through: {
            as: 'item',
            attributes: ['quantity', 'unitPrice']
          }
        },
        {
          model: models.Opening,
          as: 'opening',
          attributes: [],
          include: [
            {
              model: models.Employee,
              as: 'employee',
              attributes: ['fullname', 'dni'],
            }
          ]
        },
        {
          model: models.Customer,
          as: 'customer',
          attributes: ['fullname', 'dni', 'email', 'telephone']
        },
        {
          model: models.Enterprise,
          as: 'enterprise',
          attributes: ['name', 'ruc', 'email', 'telephone']
        },
      ]
    };

    const sales = await models.Sale.findAll(options);
    const total = await models.Sale.count(options);

    return { sales, total };
  }

  async findOne(id, companyId) {
    const sale = await models.Sale.findOne({
      where: { id, companyId },
      include: [
        {
          model: models.Opening,
          as: 'opening',
          attributes: [],
          include: [
            {
              model: models.Employee,
              as: 'employee',
              attributes: ['fullname', 'dni'],
            }
          ]
        },
        {
          model: models.Product,
          as: 'products',
          attributes: ['id', 'name'],
          // Brand and others auto-included by defaultScope
          through: {
            as: 'item',
            attributes: ['quantity', 'unitPrice']
          }
        },
        {
          model: models.Customer,
          as: 'customer',
          attributes: ['fullname', 'dni', 'email', 'telephone']
        },
        {
          model: models.Enterprise,
          as: 'enterprise',
          attributes: ['name', 'ruc', 'email', 'telephone']
        },
      ],
    });
    if (!sale) {
      throw boom.notFound('No se encontró ninguna venta');
    }
    return sale;
  }

  async update(id, changes, companyId) {
    let sale = await this.findOne(id, companyId);
    sale = await sale.update(changes);
    // if (changes.products && changes.products.length > 0) {
    //     await models.ProductPurchas.destroy({
    //         where: {
    //             productId: id
    //         }
    //     });
    //     changes.products.forEach(async (item) => {
    //         const product = await models.Product.findByPk(id)
    //         await sale.addProduct(product, { through: { quantity: item.quantity, unitCost: item.unitCost } });
    //     });
    // }
    return sale;
  }

  async delete(id, companyId) {
    // Primero, encontramos la venta por ID
    const sale = await this.findOne(id, companyId);

    // Verificamos si la venta tiene productos
    if (sale.products && sale.products.length > 0) {
      console.log(`Productos asociados a la venta con ID ${id}: ${sale.products.length} productos.`);
    }

    if (sale.status === 3) {
      throw boom.conflict('La venta ya se encuentra anulada');
    }

    // Creamos la transacción
    const t = await sequelize.transaction();
    console.log(`Transacción creada: ${t}.`);

    try {
      // Restauramos el stock de cada producto (si hay productos)
      if (sale.products && sale.products.length > 0) {
        // Asumimos que si la venta tiene warehouseId, usamos ese. Si no, usamos Main (1).
        const warehouseId = sale.warehouseId || 1;

        for (const product of sale.products) {
          const quantity = product.item.quantity;
          console.log(`Restaurando stock para el producto con ID ${product.id}, sumando ${quantity} unidades al stock actual en bodega ${warehouseId}.`);

          const balance = await models.InventoryBalance.findOne({
            where: { warehouseId, productId: product.id, companyId },
            transaction: t
          });

          if (balance) {
            await balance.increment('quantity', { by: quantity, transaction: t });
          } else {
            // Should not happen usually, but create if missing
            await models.InventoryBalance.create({
              warehouseId,
              productId: product.id,
              quantity,
              companyId
            }, { transaction: t });
          }

          // Restaurar stock global del producto de forma precisa
          await this.inventoryService.syncProductStock(product.id, companyId, t);

          // Registrar Movimiento
          await models.InventoryMovement.create({
            productId: product.id,
            warehouseId: warehouseId,
            type: 'ADJUSTMENT_IN', // Or SALE_CANCEL
            quantity: quantity,
            referenceId: sale.id.toString(),
            description: `Anulación Venta ${sale.id}`,
            userId: null,
            createdAt: new Date(),
            companyId
          }, { transaction: t });
        }
      }

      // En lugar de destruir, actualizamos el estado a 3 (ANULADA)
      await sale.update({ status: 3 }, { transaction: t });
      console.log(`Venta con ID ${id} anulada.`);

      // Hacemos commit de todos los cambios
      await t.commit();
      console.log(`Transacción completada exitosamente.`);

      // Retornamos el ID de la venta eliminada
      return { id };

    } catch (error) {
      // Si algo falla, hacemos rollback y lanzamos el error
      await t.rollback();
      console.error(`Error al eliminar la venta con ID ${id}: ${error.message}`);
      throw error;
    }
  }


  async returnSale(id, companyId) {
    const t = await models.sequelize.transaction();
    try {
      console.log(`Iniciando la devolución de la venta con ID: ${id}`);

      const sale = await this.findOne(id, companyId);
      console.log(`Venta encontrada: ${JSON.stringify(sale)}`);

      if (sale.status === 2) {
        console.log(`La venta con ID ${id} ya ha sido devuelta`);
        throw boom.conflict('La venta ya ha sido devuelta');
      }

      console.log(`Actualizando estado de la venta a 'devuelta' para la venta con ID ${id}`);
      const updatedSale = await sale.update({ status: 2 }, { transaction: t });

      if (sale.products && sale.products.length > 0) {
        console.log(`Productos asociados a la venta con ID ${id}: ${sale.products.length} productos.`);

        const warehouseId = sale.warehouseId || 1;

        for (const product of sale.products) {
          const quantity = product.item.quantity;
          console.log(`Actualizando stock para el producto con ID ${product.id}, aumentando ${quantity} unidades al stock actual en bodega ${warehouseId}.`);

          const balance = await models.InventoryBalance.findOne({
            where: { warehouseId, productId: product.id, companyId },
            transaction: t
          });

          if (balance) {
            await balance.increment('quantity', { by: quantity, transaction: t });
          } else {
            await models.InventoryBalance.create({
              warehouseId,
              productId: product.id,
              quantity,
              companyId
            }, { transaction: t });
          }

          // Restaurar stock global del producto de forma precisa
          await this.inventoryService.syncProductStock(product.id, companyId, t);

          // Registrar Movimiento
          await models.InventoryMovement.create({
            productId: product.id,
            warehouseId: warehouseId,
            type: 'SALE_RETURN',
            quantity: quantity,
            referenceId: sale.id.toString(),
            description: `Devolución Venta ${sale.id}`,
            userId: null,
            createdAt: new Date(),
            companyId
          }, { transaction: t });
        }
      }

      await t.commit();
      console.log(`Transacción completada con éxito para la venta con ID ${id}`);
      return updatedSale;
    } catch (error) {
      console.error(`Error al procesar la devolución para la venta con ID ${id}: ${error.message}`);
      await t.rollback();
      throw error;
    }
  }

}

module.exports = SalesService;
