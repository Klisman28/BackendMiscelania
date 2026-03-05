'use strict';

/**
 * Migración: Unicidad por compañía (multi-tenant)
 *
 * Tablas afectadas: products, units, brands
 *
 * ANTES: UNIQUE(sku), UNIQUE(name), UNIQUE(slug) → globales
 * DESPUÉS: UNIQUE(company_id, sku), UNIQUE(company_id, name), UNIQUE(company_id, slug)
 *
 * Pasos:
 *   1. Detectar y resolver duplicados dentro de la misma company_id
 *   2. Eliminar índices UNIQUE globales
 *   3. Crear índices UNIQUE compuestos (company_id + campo)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ════════════════════════════════════════════════════════════
      // PASO 1: Resolver duplicados en products
      // ════════════════════════════════════════════════════════════

      // 1a. Duplicados de SKU dentro de la misma compañía
      const [skuDups] = await queryInterface.sequelize.query(`
        SELECT company_id, sku, COUNT(*) as cnt
        FROM products
        WHERE sku IS NOT NULL AND deleted_at IS NULL
        GROUP BY company_id, sku
        HAVING cnt > 1
      `, { transaction });

      for (const dup of skuDups) {
        const [rows] = await queryInterface.sequelize.query(`
          SELECT id, sku FROM products
          WHERE company_id = :companyId AND sku = :sku AND deleted_at IS NULL
          ORDER BY id ASC
        `, {
          replacements: { companyId: dup.company_id, sku: dup.sku },
          transaction
        });
        // Mantener el primero intacto, agregar sufijo a los demás
        for (let i = 1; i < rows.length; i++) {
          await queryInterface.sequelize.query(`
            UPDATE products SET sku = :newSku WHERE id = :id
          `, {
            replacements: { newSku: `${dup.sku}-dup${i}`, id: rows[i].id },
            transaction
          });
        }
      }

      // 1b. Duplicados de NAME dentro de la misma compañía
      const [nameDups] = await queryInterface.sequelize.query(`
        SELECT company_id, name, COUNT(*) as cnt
        FROM products
        WHERE name IS NOT NULL AND deleted_at IS NULL
        GROUP BY company_id, name
        HAVING cnt > 1
      `, { transaction });

      for (const dup of nameDups) {
        const [rows] = await queryInterface.sequelize.query(`
          SELECT id, name FROM products
          WHERE company_id = :companyId AND name = :name AND deleted_at IS NULL
          ORDER BY id ASC
        `, {
          replacements: { companyId: dup.company_id, name: dup.name },
          transaction
        });
        for (let i = 1; i < rows.length; i++) {
          await queryInterface.sequelize.query(`
            UPDATE products SET name = :newName WHERE id = :id
          `, {
            replacements: { newName: `${dup.name} (${i + 1})`, id: rows[i].id },
            transaction
          });
        }
      }

      // 1c. Duplicados de SLUG dentro de la misma compañía
      const [slugDups] = await queryInterface.sequelize.query(`
        SELECT company_id, slug, COUNT(*) as cnt
        FROM products
        WHERE slug IS NOT NULL AND deleted_at IS NULL
        GROUP BY company_id, slug
        HAVING cnt > 1
      `, { transaction });

      for (const dup of slugDups) {
        const [rows] = await queryInterface.sequelize.query(`
          SELECT id, slug FROM products
          WHERE company_id = :companyId AND slug = :slug AND deleted_at IS NULL
          ORDER BY id ASC
        `, {
          replacements: { companyId: dup.company_id, slug: dup.slug },
          transaction
        });
        for (let i = 1; i < rows.length; i++) {
          await queryInterface.sequelize.query(`
            UPDATE products SET slug = :newSlug WHERE id = :id
          `, {
            replacements: { newSlug: `${dup.slug}-${i + 1}`, id: rows[i].id },
            transaction
          });
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 1d: Resolver duplicados en units
      // ════════════════════════════════════════════════════════════
      const [unitNameDups] = await queryInterface.sequelize.query(`
        SELECT company_id, name, COUNT(*) as cnt
        FROM units
        WHERE name IS NOT NULL
        GROUP BY company_id, name
        HAVING cnt > 1
      `, { transaction });

      for (const dup of unitNameDups) {
        const [rows] = await queryInterface.sequelize.query(`
          SELECT id, name FROM units
          WHERE company_id = :companyId AND name = :name
          ORDER BY id ASC
        `, {
          replacements: { companyId: dup.company_id, name: dup.name },
          transaction
        });
        for (let i = 1; i < rows.length; i++) {
          await queryInterface.sequelize.query(`
            UPDATE units SET name = :newName WHERE id = :id
          `, {
            replacements: { newName: `${dup.name} (${i + 1})`, id: rows[i].id },
            transaction
          });
        }
      }

      const [unitSymDups] = await queryInterface.sequelize.query(`
        SELECT company_id, symbol, COUNT(*) as cnt
        FROM units
        WHERE symbol IS NOT NULL
        GROUP BY company_id, symbol
        HAVING cnt > 1
      `, { transaction });

      for (const dup of unitSymDups) {
        const [rows] = await queryInterface.sequelize.query(`
          SELECT id, symbol FROM units
          WHERE company_id = :companyId AND symbol = :symbol
          ORDER BY id ASC
        `, {
          replacements: { companyId: dup.company_id, symbol: dup.symbol },
          transaction
        });
        for (let i = 1; i < rows.length; i++) {
          await queryInterface.sequelize.query(`
            UPDATE units SET symbol = :newSym WHERE id = :id
          `, {
            replacements: { newSym: `${dup.symbol}${i + 1}`, id: rows[i].id },
            transaction
          });
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 1e: Resolver duplicados en brands
      // ════════════════════════════════════════════════════════════
      const [brandNameDups] = await queryInterface.sequelize.query(`
        SELECT company_id, name, COUNT(*) as cnt
        FROM brands
        WHERE name IS NOT NULL
        GROUP BY company_id, name
        HAVING cnt > 1
      `, { transaction });

      for (const dup of brandNameDups) {
        const [rows] = await queryInterface.sequelize.query(`
          SELECT id, name FROM brands
          WHERE company_id = :companyId AND name = :name
          ORDER BY id ASC
        `, {
          replacements: { companyId: dup.company_id, name: dup.name },
          transaction
        });
        for (let i = 1; i < rows.length; i++) {
          await queryInterface.sequelize.query(`
            UPDATE brands SET name = :newName WHERE id = :id
          `, {
            replacements: { newName: `${dup.name} (${i + 1})`, id: rows[i].id },
            transaction
          });
        }
      }

      const [brandCodeDups] = await queryInterface.sequelize.query(`
        SELECT company_id, code, COUNT(*) as cnt
        FROM brands
        WHERE code IS NOT NULL
        GROUP BY company_id, code
        HAVING cnt > 1
      `, { transaction });

      for (const dup of brandCodeDups) {
        const [rows] = await queryInterface.sequelize.query(`
          SELECT id, code FROM brands
          WHERE company_id = :companyId AND code = :code
          ORDER BY id ASC
        `, {
          replacements: { companyId: dup.company_id, code: dup.code },
          transaction
        });
        for (let i = 1; i < rows.length; i++) {
          await queryInterface.sequelize.query(`
            UPDATE brands SET code = :newCode WHERE id = :id
          `, {
            replacements: { newCode: `${dup.code}-${i + 1}`, id: rows[i].id },
            transaction
          });
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 2: DROP índices UNIQUE globales
      // ════════════════════════════════════════════════════════════

      // -- products --
      // MySQL crea el índice con el nombre del campo por defecto
      const productIndexes = await queryInterface.showIndex('products', { transaction });
      const prodUniqueNames = productIndexes
        .filter(idx => idx.unique && !idx.primary)
        .map(idx => idx.name);

      for (const indexName of prodUniqueNames) {
        try {
          await queryInterface.removeIndex('products', indexName, { transaction });
          console.log(`  ✅ Dropped products index: ${indexName}`);
        } catch (e) {
          console.log(`  ⚠️  Index ${indexName} may not exist, skipping: ${e.message}`);
        }
      }

      // -- units --
      const unitIndexes = await queryInterface.showIndex('units', { transaction });
      const unitUniqueNames = unitIndexes
        .filter(idx => idx.unique && !idx.primary)
        .map(idx => idx.name);

      for (const indexName of unitUniqueNames) {
        try {
          await queryInterface.removeIndex('units', indexName, { transaction });
          console.log(`  ✅ Dropped units index: ${indexName}`);
        } catch (e) {
          console.log(`  ⚠️  Index ${indexName} may not exist, skipping: ${e.message}`);
        }
      }

      // -- brands --
      const brandIndexes = await queryInterface.showIndex('brands', { transaction });
      const brandUniqueNames = brandIndexes
        .filter(idx => idx.unique && !idx.primary)
        .map(idx => idx.name);

      for (const indexName of brandUniqueNames) {
        try {
          await queryInterface.removeIndex('brands', indexName, { transaction });
          console.log(`  ✅ Dropped brands index: ${indexName}`);
        } catch (e) {
          console.log(`  ⚠️  Index ${indexName} may not exist, skipping: ${e.message}`);
        }
      }

      // ════════════════════════════════════════════════════════════
      // PASO 3: CREATE índices UNIQUE compuestos por company_id
      // ════════════════════════════════════════════════════════════

      // -- products --
      await queryInterface.addIndex('products', ['company_id', 'sku'], {
        unique: true,
        name: 'uq_products_company_sku',
        transaction
      });
      await queryInterface.addIndex('products', ['company_id', 'name'], {
        unique: true,
        name: 'uq_products_company_name',
        transaction
      });
      await queryInterface.addIndex('products', ['company_id', 'slug'], {
        unique: true,
        name: 'uq_products_company_slug',
        transaction
      });

      // -- units --
      await queryInterface.addIndex('units', ['company_id', 'name'], {
        unique: true,
        name: 'uq_units_company_name',
        transaction
      });
      await queryInterface.addIndex('units', ['company_id', 'symbol'], {
        unique: true,
        name: 'uq_units_company_symbol',
        transaction
      });

      // -- brands --
      await queryInterface.addIndex('brands', ['company_id', 'name'], {
        unique: true,
        name: 'uq_brands_company_name',
        transaction
      });
      await queryInterface.addIndex('brands', ['company_id', 'code'], {
        unique: true,
        name: 'uq_brands_company_code',
        transaction
      });
      await queryInterface.addIndex('brands', ['company_id', 'slug'], {
        unique: true,
        name: 'uq_brands_company_slug',
        transaction
      });

      await transaction.commit();
      console.log('\n🎉 Migración completada: unicidad por compañía en products, units, brands');

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remover índices compuestos
      await queryInterface.removeIndex('products', 'uq_products_company_sku', { transaction });
      await queryInterface.removeIndex('products', 'uq_products_company_name', { transaction });
      await queryInterface.removeIndex('products', 'uq_products_company_slug', { transaction });

      await queryInterface.removeIndex('units', 'uq_units_company_name', { transaction });
      await queryInterface.removeIndex('units', 'uq_units_company_symbol', { transaction });

      await queryInterface.removeIndex('brands', 'uq_brands_company_name', { transaction });
      await queryInterface.removeIndex('brands', 'uq_brands_company_code', { transaction });
      await queryInterface.removeIndex('brands', 'uq_brands_company_slug', { transaction });

      // Restaurar UNIQUE globales originales
      await queryInterface.addIndex('products', ['sku'], { unique: true, name: 'sku', transaction });
      await queryInterface.addIndex('products', ['name'], { unique: true, name: 'name', transaction });
      await queryInterface.addIndex('products', ['slug'], { unique: true, name: 'slug', transaction });

      await queryInterface.addIndex('units', ['name'], { unique: true, name: 'name', transaction });
      await queryInterface.addIndex('units', ['symbol'], { unique: true, name: 'symbol', transaction });

      await queryInterface.addIndex('brands', ['name'], { unique: true, name: 'name', transaction });
      await queryInterface.addIndex('brands', ['code'], { unique: true, name: 'code', transaction });
      await queryInterface.addIndex('brands', ['slug'], { unique: true, name: 'slug', transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
