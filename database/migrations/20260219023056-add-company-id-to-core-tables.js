'use strict';

const TABLES = [
  'warehouses',
  'categories',
  'subcategories',
  'brands',
  'units',
  'products',
  'customers',
  'employees',
  'suppliers',
  'configs',
  'sales',
  'purchases',
  'openings',
  'cashiers',
  'transfers',
  'tickets',
  'notes',
  'inventory_movements',
  'inventory_balances',
  'cash_movements'
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const { COMPANY_TABLE } = require('../models/company.model');

    // Iterar sobre todas las tablas y agregar company_id
    for (const table of TABLES) {
      // Verificar si la columna existe antes de agregarla (idempotencia)
      const tableInfo = await queryInterface.describeTable(table).catch(() => null);

      if (tableInfo && !tableInfo.company_id) {
        console.log(`Adding company_id to ${table}...`);

        await queryInterface.addColumn(table, 'company_id', {
          type: Sequelize.INTEGER,
          references: {
            model: COMPANY_TABLE,
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          defaultValue: 1,
          allowNull: true
        });

        // Crear índice para mejorar performance de filtros por empresa
        await queryInterface.addIndex(table, ['company_id'], {
          name: `${table}_company_id_index`
        });

        // Backfill de datos existentes
        await queryInterface.sequelize.query(
          `UPDATE ${table} SET company_id = 1 WHERE company_id IS NULL`
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    for (const table of TABLES) {
      const tableInfo = await queryInterface.describeTable(table).catch(() => null);
      if (tableInfo && tableInfo.company_id) {
        await queryInterface.removeColumn(table, 'company_id');
      }
    }
  }
};
