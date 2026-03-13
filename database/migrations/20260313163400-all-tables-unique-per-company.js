'use strict';

/**
 * Migration: Convierte TODOS los índices UNIQUE globales a índices
 * UNIQUE compuestos con company_id para soporte multi-tenant.
 * 
 * Tablas afectadas:
 * - categories   (name, code, slug)
 * - cashiers     (name, code)
 * - warehouses   (name)
 * - suppliers    (ruc)
 * - employees    (dni)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper to safely remove an index
    const safeRemoveIndex = async (table, indexName) => {
      try {
        await queryInterface.removeIndex(table, indexName);
        console.log(`  ✓ Removed: ${table}.${indexName}`);
      } catch (e) {
        console.log(`  ⚠ Skip ${table}.${indexName}: ${e.message}`);
      }
    };

    // ═══════════════════════════════════════════
    // 1. CATEGORIES
    // ═══════════════════════════════════════════
    console.log('\n── categories ──');
    for (const idx of ['categories_name', 'categories_name_unique', 'name',
                        'categories_code', 'categories_code_unique', 'code',
                        'categories_slug', 'categories_slug_unique', 'slug']) {
      await safeRemoveIndex('categories', idx);
    }
    await queryInterface.addIndex('categories', ['name', 'company_id'], {
      unique: true, name: 'categories_name_company_unique'
    });
    await queryInterface.addIndex('categories', ['code', 'company_id'], {
      unique: true, name: 'categories_code_company_unique'
    });
    await queryInterface.addIndex('categories', ['slug', 'company_id'], {
      unique: true, name: 'categories_slug_company_unique'
    });
    console.log('  ✓ Created composite indexes for categories');

    // ═══════════════════════════════════════════
    // 2. CASHIERS
    // ═══════════════════════════════════════════
    console.log('\n── cashiers ──');
    for (const idx of ['cashiers_name', 'cashiers_name_unique', 'name',
                        'cashiers_code', 'cashiers_code_unique', 'code']) {
      await safeRemoveIndex('cashiers', idx);
    }
    await queryInterface.addIndex('cashiers', ['name', 'company_id'], {
      unique: true, name: 'cashiers_name_company_unique'
    });
    await queryInterface.addIndex('cashiers', ['code', 'company_id'], {
      unique: true, name: 'cashiers_code_company_unique'
    });
    console.log('  ✓ Created composite indexes for cashiers');

    // ═══════════════════════════════════════════
    // 3. WAREHOUSES
    // ═══════════════════════════════════════════
    console.log('\n── warehouses ──');
    for (const idx of ['warehouses_name', 'warehouses_name_unique', 'name']) {
      await safeRemoveIndex('warehouses', idx);
    }
    await queryInterface.addIndex('warehouses', ['name', 'company_id'], {
      unique: true, name: 'warehouses_name_company_unique'
    });
    console.log('  ✓ Created composite index for warehouses');

    // ═══════════════════════════════════════════
    // 4. SUPPLIERS
    // ═══════════════════════════════════════════
    console.log('\n── suppliers ──');
    for (const idx of ['suppliers_ruc', 'suppliers_ruc_unique', 'ruc']) {
      await safeRemoveIndex('suppliers', idx);
    }
    await queryInterface.addIndex('suppliers', ['ruc', 'company_id'], {
      unique: true, name: 'suppliers_ruc_company_unique'
    });
    console.log('  ✓ Created composite index for suppliers');

    // ═══════════════════════════════════════════
    // 5. EMPLOYEES
    // ═══════════════════════════════════════════
    console.log('\n── employees ──');
    for (const idx of ['employees_dni', 'employees_dni_unique', 'dni']) {
      await safeRemoveIndex('employees', idx);
    }
    await queryInterface.addIndex('employees', ['dni', 'company_id'], {
      unique: true, name: 'employees_dni_company_unique'
    });
    console.log('  ✓ Created composite index for employees');

    console.log('\n✅ All tenant-scoped unique indexes created successfully!\n');
  },

  async down(queryInterface, Sequelize) {
    // Revert: remove composite and restore global
    // Categories
    await queryInterface.removeIndex('categories', 'categories_name_company_unique');
    await queryInterface.removeIndex('categories', 'categories_code_company_unique');
    await queryInterface.removeIndex('categories', 'categories_slug_company_unique');
    await queryInterface.addIndex('categories', ['name'], { unique: true });
    await queryInterface.addIndex('categories', ['code'], { unique: true });
    await queryInterface.addIndex('categories', ['slug'], { unique: true });

    // Cashiers
    await queryInterface.removeIndex('cashiers', 'cashiers_name_company_unique');
    await queryInterface.removeIndex('cashiers', 'cashiers_code_company_unique');
    await queryInterface.addIndex('cashiers', ['name'], { unique: true });
    await queryInterface.addIndex('cashiers', ['code'], { unique: true });

    // Warehouses
    await queryInterface.removeIndex('warehouses', 'warehouses_name_company_unique');
    await queryInterface.addIndex('warehouses', ['name'], { unique: true });

    // Suppliers
    await queryInterface.removeIndex('suppliers', 'suppliers_ruc_company_unique');
    await queryInterface.addIndex('suppliers', ['ruc'], { unique: true });

    // Employees
    await queryInterface.removeIndex('employees', 'employees_dni_company_unique');
    await queryInterface.addIndex('employees', ['dni'], { unique: true });
  }
};
