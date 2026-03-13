'use strict';

/**
 * Migration: Cambia los índices UNIQUE globales de subcategories
 * a índices UNIQUE compuestos con company_id.
 * 
 * Esto permite que diferentes empresas tengan subcategorías
 * con el mismo nombre, código o slug.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Eliminar índices únicos globales existentes (si existen)
    const indexes = await queryInterface.showIndex('subcategories');
    const indexNames = indexes.map(i => i.name);

    // El nombre puede variar según el motor de BD, intentamos los más comunes
    const oldIndexes = [
      'subcategories_name',
      'subcategories_name_unique',
      'name',
      'subcategories_code',
      'subcategories_code_unique',
      'code',
      'subcategories_slug',
      'subcategories_slug_unique',
      'slug'
    ];

    for (const idxName of oldIndexes) {
      if (indexNames.includes(idxName)) {
        try {
          await queryInterface.removeIndex('subcategories', idxName);
          console.log(`  ✓ Removed old index: ${idxName}`);
        } catch (e) {
          console.log(`  ⚠ Could not remove index ${idxName}: ${e.message}`);
        }
      }
    }

    // 2. Crear nuevos índices compuestos UNIQUE con company_id
    await queryInterface.addIndex('subcategories', ['name', 'company_id'], {
      unique: true,
      name: 'subcategories_name_company_unique'
    });
    console.log('  ✓ Created index: subcategories_name_company_unique');

    await queryInterface.addIndex('subcategories', ['code', 'company_id'], {
      unique: true,
      name: 'subcategories_code_company_unique'
    });
    console.log('  ✓ Created index: subcategories_code_company_unique');

    await queryInterface.addIndex('subcategories', ['slug', 'company_id'], {
      unique: true,
      name: 'subcategories_slug_company_unique'
    });
    console.log('  ✓ Created index: subcategories_slug_company_unique');
  },

  async down(queryInterface, Sequelize) {
    // Revertir: eliminar compuestos y restaurar globales
    await queryInterface.removeIndex('subcategories', 'subcategories_name_company_unique');
    await queryInterface.removeIndex('subcategories', 'subcategories_code_company_unique');
    await queryInterface.removeIndex('subcategories', 'subcategories_slug_company_unique');

    await queryInterface.addIndex('subcategories', ['name'], { unique: true });
    await queryInterface.addIndex('subcategories', ['code'], { unique: true });
    await queryInterface.addIndex('subcategories', ['slug'], { unique: true });
  }
};
