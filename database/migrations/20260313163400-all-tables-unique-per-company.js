'use strict';

/**
 * Migration: Convierte TODOS los índices UNIQUE globales a índices
 * UNIQUE compuestos con company_id para soporte multi-tenant.
 * 
 * IMPORTANTE: Primero resuelve datos duplicados que violarían las nuevas constraints.
 * Los duplicados se resuelven agregando un sufijo al valor repetido.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface.sequelize;

    // ── Helpers ─────────────────────────────────────────────

    // Obtener índices UNIQUE reales de una columna
    const getUniqueIndexes = async (table, column) => {
      const [results] = await qi.query(
        `SHOW INDEX FROM \`${table}\` WHERE Column_name = '${column}' AND Non_unique = 0 AND Key_name != 'PRIMARY'`
      );
      return [...new Set(results.map(r => r.Key_name))];
    };

    // Eliminar índice si existe
    const dropIndexSafe = async (table, indexName) => {
      try {
        await qi.query(`ALTER TABLE \`${table}\` DROP INDEX \`${indexName}\``);
        console.log(`  ✓ Dropped: ${table}.${indexName}`);
      } catch (e) {
        console.log(`  · Already gone: ${table}.${indexName}`);
      }
    };

    // Crear índice compuesto si no existe
    const createIndexSafe = async (table, columns, indexName) => {
      try {
        const cols = columns.map(c => `\`${c}\``).join(', ');
        await qi.query(`CREATE UNIQUE INDEX \`${indexName}\` ON \`${table}\` (${cols})`);
        console.log(`  ✓ Created: ${indexName}`);
      } catch (e) {
        if (e.message.includes('Duplicate key name') || e.message.includes('already exists')) {
          console.log(`  · Already exists: ${indexName}`);
        } else {
          throw e; // Re-throw if it's a real error (like duplicate data)
        }
      }
    };

    // Resolver duplicados: Si (column, company_id) tiene duplicados,
    // agrega un sufijo numérico al campo para hacerlo único
    const fixDuplicates = async (table, column) => {
      const [dupes] = await qi.query(`
        SELECT \`${column}\`, company_id, COUNT(*) as cnt
        FROM \`${table}\`
        WHERE \`${column}\` IS NOT NULL
        GROUP BY \`${column}\`, company_id
        HAVING cnt > 1
      `);
      
      if (dupes.length === 0) {
        console.log(`  · No duplicates in ${table}.${column}`);
        return;
      }

      console.log(`  ⚠ Found ${dupes.length} duplicate group(s) in ${table}.${column}`);
      
      for (const dupe of dupes) {
        const val = dupe[column];
        const compId = dupe.company_id;

        // Get all rows with this duplicate
        const [rows] = await qi.query(`
          SELECT id FROM \`${table}\`
          WHERE \`${column}\` = ${qi.escape(val)} AND company_id = ${qi.escape(compId)}
          ORDER BY id ASC
        `);

        // Keep the first one, rename the rest
        for (let i = 1; i < rows.length; i++) {
          const newVal = `${val}_${i}`;
          await qi.query(`
            UPDATE \`${table}\`
            SET \`${column}\` = ${qi.escape(newVal)}
            WHERE id = ${rows[i].id}
          `);
          console.log(`    → ${table} id=${rows[i].id}: "${column}" changed from "${val}" to "${newVal}"`);
        }
      }
    };

    // NULL duplicates: set NULL values to something unique to avoid constraint issues
    const fixNulls = async (table, column) => {
      const [nullRows] = await qi.query(`
        SELECT id FROM \`${table}\` WHERE \`${column}\` IS NULL OR \`${column}\` = ''
      `);
      if (nullRows.length > 0) {
        console.log(`  ⚠ Found ${nullRows.length} NULL/empty values in ${table}.${column}, setting unique placeholders`);
        for (const row of nullRows) {
          await qi.query(`
            UPDATE \`${table}\` SET \`${column}\` = CONCAT('_auto_', ${row.id}) WHERE id = ${row.id} AND (\`${column}\` IS NULL OR \`${column}\` = '')
          `);
        }
      }
    };

    // ── Process each table ──────────────────────────────────

    // ═══════════════════════════════════════════
    // 1. CATEGORIES (name, code, slug)
    // ═══════════════════════════════════════════
    console.log('\n── categories ──');
    // Drop old indexes
    for (const col of ['name', 'code', 'slug']) {
      const indexes = await getUniqueIndexes('categories', col);
      for (const idx of indexes) {
        // Skip our new composite indexes if they already exist
        if (idx.includes('_company_')) continue;
        await dropIndexSafe('categories', idx);
      }
    }
    // Fix duplicates before creating composite indexes
    for (const col of ['name', 'code', 'slug']) {
      await fixDuplicates('categories', col);
    }
    await createIndexSafe('categories', ['name', 'company_id'], 'categories_name_company_unique');
    await createIndexSafe('categories', ['code', 'company_id'], 'categories_code_company_unique');
    await createIndexSafe('categories', ['slug', 'company_id'], 'categories_slug_company_unique');

    // ═══════════════════════════════════════════
    // 2. CASHIERS (name, code)
    // ═══════════════════════════════════════════
    console.log('\n── cashiers ──');
    for (const col of ['name', 'code']) {
      const indexes = await getUniqueIndexes('cashiers', col);
      for (const idx of indexes) {
        if (idx.includes('_company_')) continue;
        await dropIndexSafe('cashiers', idx);
      }
    }
    for (const col of ['name', 'code']) {
      await fixDuplicates('cashiers', col);
    }
    await createIndexSafe('cashiers', ['name', 'company_id'], 'cashiers_name_company_unique');
    await createIndexSafe('cashiers', ['code', 'company_id'], 'cashiers_code_company_unique');

    // ═══════════════════════════════════════════
    // 3. WAREHOUSES (name)
    // ═══════════════════════════════════════════
    console.log('\n── warehouses ──');
    const whIndexes = await getUniqueIndexes('warehouses', 'name');
    for (const idx of whIndexes) {
      if (idx.includes('_company_')) continue;
      await dropIndexSafe('warehouses', idx);
    }
    await fixDuplicates('warehouses', 'name');
    await createIndexSafe('warehouses', ['name', 'company_id'], 'warehouses_name_company_unique');

    // ═══════════════════════════════════════════
    // 4. SUPPLIERS (ruc)
    // ═══════════════════════════════════════════
    console.log('\n── suppliers ──');
    const supIndexes = await getUniqueIndexes('suppliers', 'ruc');
    for (const idx of supIndexes) {
      if (idx.includes('_company_')) continue;
      await dropIndexSafe('suppliers', idx);
    }
    await fixDuplicates('suppliers', 'ruc');
    await createIndexSafe('suppliers', ['ruc', 'company_id'], 'suppliers_ruc_company_unique');

    // ═══════════════════════════════════════════
    // 5. EMPLOYEES (dni)
    // ═══════════════════════════════════════════
    console.log('\n── employees ──');
    const empIndexes = await getUniqueIndexes('employees', 'dni');
    for (const idx of empIndexes) {
      if (idx.includes('_company_')) continue;
      await dropIndexSafe('employees', idx);
    }
    await fixDuplicates('employees', 'dni');
    await createIndexSafe('employees', ['dni', 'company_id'], 'employees_dni_company_unique');

    console.log('\n✅ All tenant-scoped unique indexes created!\n');
  },

  async down(queryInterface, Sequelize) {
    const qi = queryInterface.sequelize;

    const dropAndRestore = async (table, compositeIdx, column) => {
      try {
        await qi.query(`ALTER TABLE \`${table}\` DROP INDEX \`${compositeIdx}\``);
      } catch (e) { /* ignore */ }
      try {
        await qi.query(`CREATE UNIQUE INDEX \`${column}\` ON \`${table}\` (\`${column}\`)`);
      } catch (e) { /* ignore if dupes exist */ }
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
