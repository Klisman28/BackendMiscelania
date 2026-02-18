const { Op, QueryTypes } = require('sequelize');
const { models } = require('../../libs/sequelize');
const { sequelize } = require('../../libs/sequelize'); // Need sequelize instance for raw queries

class ReportService {

  // --- SALES ---

  async getSalesSummary(query) {
    const { startDate, endDate, warehouseId, docType } = query;
    const replacements = { startDate, endDate };
    let whereClause = "WHERE s.date_issue BETWEEN :startDate AND :endDate AND s.status = 1"; // Status 1 = Completed/Active (Assumed)

    if (warehouseId) {
      whereClause += " AND s.warehouse_id = :warehouseId";
      replacements.warehouseId = warehouseId;
    }
    if (docType && docType !== 'Todos') {
      whereClause += " AND s.type = :docType";
      replacements.docType = docType;
    }

    const sql = `
      SELECT 
        COALESCE(SUM(s.total), 0) as totalSales,
        COUNT(s.id) as count,
        COALESCE(AVG(s.total), 0) as averageTicket,
        COALESCE(SUM(s.igv), 0) as totalTax
      FROM sales s
      ${whereClause}
    `;

    const [result] = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    return result;
  }

  async getSalesByDay(query) {
    const { startDate, endDate, warehouseId, docType } = query;
    const replacements = { startDate, endDate };
    let whereClause = "WHERE s.date_issue BETWEEN :startDate AND :endDate AND s.status = 1";

    if (warehouseId) {
      whereClause += " AND s.warehouse_id = :warehouseId";
      replacements.warehouseId = warehouseId;
    }
    if (docType && docType !== 'Todos') {
      whereClause += " AND s.type = :docType";
      replacements.docType = docType;
    }

    const sql = `
      SELECT 
        s.date_issue as date,
        SUM(s.total) as total,
        COUNT(s.id) as count
      FROM sales s
      ${whereClause}
      GROUP BY s.date_issue
      ORDER BY s.date_issue ASC
    `;

    const results = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    return results;
  }

  async getTopProducts(query) {
    const { startDate, endDate, warehouseId, docType, limit = 10, offset = 0 } = query;
    const replacements = { startDate: startDate, endDate: endDate, limit: parseInt(limit), offset: parseInt(offset) };

    let whereClause = "WHERE s.date_issue BETWEEN :startDate AND :endDate AND s.status = 1";

    if (warehouseId) {
      whereClause += " AND s.warehouse_id = :warehouseId";
      replacements.warehouseId = warehouseId;
    }
    if (docType && docType !== 'Todos') {
      whereClause += " AND s.type = :docType";
      replacements.docType = docType;
    }

    // Note: Assuming 'products_sales' table and 'unit_price' field based on inspection
    const sql = `
      SELECT 
        p.name as productName,
        SUM(ps.quantity) as quantity,
        SUM(ps.quantity * ps.unit_price) as total
      FROM products_sales ps
      JOIN sales s ON ps.sale_id = s.id
      JOIN products p ON ps.product_id = p.id
      ${whereClause}
      GROUP BY ps.product_id, p.name
      ORDER BY total DESC
      LIMIT :limit OFFSET :offset
    `;

    const results = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    return results;
  }

  async getTopClients(query) {
    const { startDate, endDate, limit = 10, offset = 0 } = query;
    const replacements = { startDate: startDate, endDate: endDate, limit: parseInt(limit), offset: parseInt(offset) };

    // Only looking at Customers (not Enterprises) for simplicity, or we can union.
    // Assuming 'customers' table.
    const sql = `
      SELECT 
        COALESCE(c.fullname, CONCAT(c.first_name, ' ', c.last_name), c.name) as clientName,
        COUNT(s.id) as count,
        SUM(s.total) as total
      FROM sales s
      JOIN customers c ON s.saleable_id = c.id
      WHERE s.saleable_type = 'customers'
      AND s.date_issue BETWEEN :startDate AND :endDate
      AND s.status = 1
      GROUP BY c.id, c.fullname, c.first_name, c.last_name, c.name
      ORDER BY total DESC
      LIMIT :limit OFFSET :offset
    `;

    const results = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    return results;
  }

  // --- PURCHASES ---

  async getPurchasesSummary(query) {
    const { startDate, endDate } = query;
    const replacements = { startDate, endDate };

    const sql = `
      SELECT 
        COALESCE(SUM(p.total), 0) as totalPurchases,
        COUNT(p.id) as count,
        COALESCE(AVG(p.total), 0) as averagePurchase
      FROM purchases p
      WHERE p.date_issue BETWEEN :startDate AND :endDate
    `;

    const [result] = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    return result;
  }

  async getPurchasesByDay(query) {
    const { startDate, endDate } = query;
    const replacements = { startDate, endDate };

    const sql = `
      SELECT 
        p.date_issue as date,
        SUM(p.total) as total,
        COUNT(p.id) as count
      FROM purchases p
      WHERE p.date_issue BETWEEN :startDate AND :endDate
      GROUP BY p.date_issue
      ORDER BY p.date_issue ASC
    `;

    const results = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    return results;
  }

  async getTopSuppliers(query) {
    const { startDate, endDate, limit = 10, offset = 0 } = query;
    const replacements = { startDate, endDate, limit: parseInt(limit), offset: parseInt(offset) };

    const sql = `
      SELECT 
        sup.name as supplierName,
        COUNT(p.id) as count,
        SUM(p.total) as total
      FROM purchases p
      JOIN suppliers sup ON p.supplier_id = sup.id
      WHERE p.date_issue BETWEEN :startDate AND :endDate
      GROUP BY sup.id, sup.name
      ORDER BY total DESC
      LIMIT :limit OFFSET :offset
    `;

    const results = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    return results;
  }

  // --- INVENTORY ---

  async getLowStock(query) {
    const { limit = 50, offset = 0 } = query;
    const replacements = { limit: parseInt(limit), offset: parseInt(offset) };

    const sql = `
      SELECT 
        p.id,
        p.name,
        p.stock,
        p.stock_min as stockMin,
        CASE 
          WHEN p.stock = 0 THEN 'Agotado'
          WHEN p.stock <= p.stock_min THEN 'Bajo'
          ELSE 'Normal'
        END as status
      FROM products p
      WHERE p.stock <= p.stock_min
      ORDER BY p.stock ASC
      LIMIT :limit OFFSET :offset
    `;

    const results = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    return results;
  }

  async getInventoryValuation() {
    const sql = `
      SELECT 
        SUM(stock * cost) as totalValue,
        COUNT(id) as totalProducts
      FROM products
      WHERE stock > 0
    `;
    const [result] = await sequelize.query(sql, { type: QueryTypes.SELECT });
    return result;
  }

  async getExportData(query) {
    // Re-use logic but without pagination for exports usually, or with high limit
    const { type, limit = 10000 } = query; // Default high limit for export
    const exportQuery = { ...query, limit };

    switch (type) {
      case 'sales_by_day':
        return this.getSalesByDay(exportQuery);
      case 'top_products':
        return this.getTopProducts(exportQuery);
      case 'top_clients':
        return this.getTopClients(exportQuery);
      case 'purchases_by_day':
        return this.getPurchasesByDay(exportQuery);
      case 'top_suppliers':
        return this.getTopSuppliers(exportQuery);
      case 'low_stock':
        return this.getLowStock(exportQuery);
      default:
        throw new Error('Invalid export type');
    }
  }
}

module.exports = ReportService;
