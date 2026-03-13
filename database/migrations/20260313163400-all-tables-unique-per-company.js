'use strict';

/**
 * Migration: Convierte TODOS los índices UNIQUE globales a índices
 * UNIQUE compuestos con company_id para soporte multi-tenant.
 * 
 * Usa raw SQL para MySQL, consultando primero los índices reales.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface.sequelize;

    // Helper: obtener nombres de índices UNIQUE de una tabla para una columna específica
    const getUniqueIndexes = async (table, column) => {
      const [results] = await qi.query(
        `SHOW INDEX FROM \`${table}\` WHERE Column_name = '${column}' AND Non_unique = 0 AND Key_name != 'PRIMARY'`
      );
      return [...new Set(results.map(r => r.Key_name))];
    };

    // Helper: eliminar índice de forma segura
    const dropIndex = async (table, indexName) => {
      try {
        await qi.query(`ALTER TABLE \`${table}\` DROP INDEX \`${indexName}\``);
        console.log(`  ✓ Dropped: ${table}.${indexName}`);
      } catch (e) {
        console.log(`  ⚠ Could not drop ${table}.${indexName}: ${e.message}`);
      }
    };

    // Helper: crear índice compuesto
    const createCompositeIndex = async (table, columns, indexName) => {
      const cols = columns.map(c => `\`${c}\``).join(', ');
      await qi.query(`CREATE UNIQUE INDEX \`${indexName}\` ON \`${table}\` (${cols})`);
      console.log(`  ✓ Created: ${indexName}`);
    };

    // ═══════════════════════════════════════════
    // 1. CATEGORIES (name, code, slug)
    // ═══════════════════════════════════════════
    console.log('\n── categories ──');
    for (const col of ['name', 'code', 'slug']) {
      const indexes = await getUniqueIndexes('categories', col);
      for (const idx of indexes) {
        await dropIndex('categories', idx);
      }
    }
    await createCompositeIndex('categories', ['name', 'company_id'], 'categories_name_company_unique');
    await createCompositeIndex('categories', ['code', 'company_id'], 'categories_code_company_unique');
    await createCompositeIndex('categories', ['slug', 'company_id'], 'categories_slug_company_unique');

    // ═══════════════════════════════════════════
    // 2. CASHIERS (name, code)
    // ═══════════════════════════════════════════
    console.log('\n── cashiers ──');
    for (const col of ['name', 'code']) {
      const indexes = await getUniqueIndexes('cashiers', col);
      for (const idx of indexes) {
        await dropIndex('cashiers', idx);
      }
    }
    await createCompositeIndex('cashiers', ['name', 'company_id'], 'cashiers_name_company_unique');
    await createCompositeIndex('cashiers', ['code', 'company_id'], 'cashiers_code_company_unique');

    // ═══════════════════════════════════════════
    // 3. WAREHOUSES (name)
    // ═══════════════════════════════════════════
    console.log('\n── warehouses ──');
    const whIndexes = await getUniqueIndexes('warehouses', 'name');
    for (const idx of whIndexes) {
      await dropIndex('warehouses', idx);
    }
    await createCompositeIndex('warehouses', ['name', 'company_id'], 'warehouses_name_company_unique');

    // ═══════════════════════════════════════════
    // 4. SUPPLIERS (ruc)
    // ═══════════════════════════════════════════
    console.log('\n── suppliers ──');
    const supIndexes = await getUniqueIndexes('suppliers', 'ruc');
    for (const idx of supIndexes) {
      await dropIndex('suppliers', idx);
    }
    await createCompositeIndex('suppliers', ['ruc', 'company_id'], 'suppliers_ruc_company_unique');

    // ═══════════════════════════════════════════
    // 5. EMPLOYEES (dni)
    // ═══════════════════════════════════════════
    console.log('\n── employees ──');
    const empIndexes = await getUniqueIndexes('employees', 'dni');
    for (const idx of empIndexes) {
      await dropIndex('employees', idx);
    }
    await createCompositeIndex('employees', ['dni', 'company_id'], 'employees_dni_company_unique');

    console.log('\n✅ All tenant-scoped unique indexes created!\n');
  },

  async down(queryInterface, Sequelize) {
    const qi = queryInterface.sequelize;

    const dropAndRestore = async (table, compositeIdx, column) => {
      await qi.query(`ALTER TABLE \`${table}\` DROP INDEX \`${compositeIdx}\``);
      await qi.query(`CREATE UNIQUE INDEX \`${column}\` ON \`${table}\` (\`${column}\`)`);
    };

    await dropAndRestore('categories', 'categories_name_company_unique', 'name');
    await dropAndRestore('categories', 'categories_code_company_unique', 'code');
    await dropAndRestore('categories', 'categories_slug_company_unique', 'slug');
    await dropAndRestore('cashiers', 'cashiers_name_company_unique', 'name');
    await dropAndRestore('cashiers', 'cashiers_code_company_unique', 'code');
    await dropAndRestore('warehouses', 'warehouses_name_company_unique', 'name');
    await dropAndRestore('suppliers', 'suppliers_ruc_company_unique', 'ruc');
    await dropAndRestore('employees', 'employees_dni_company_unique', 'dni');
  }
};
