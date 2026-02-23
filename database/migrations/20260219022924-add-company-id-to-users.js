'use strict';

const { USER_TABLE } = require('../models/user.model');
const { COMPANY_TABLE } = require('../models/company.model');

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Agregar la columna nullable
    await queryInterface.addColumn(USER_TABLE, 'company_id', {
      type: Sequelize.INTEGER,
      references: {
        model: COMPANY_TABLE,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      defaultValue: 1 // Asumimos que la "Default Company" creada tiene ID 1
    });

    // 2. Actualizar registros existentes (para seguridad)
    // En SQL directo sería: UPDATE users SET company_id = 1 WHERE company_id IS NULL;
    // Sequelize con bulkUpdate o query directa
    await queryInterface.sequelize.query(
      `UPDATE ${USER_TABLE} SET company_id = 1 WHERE company_id IS NULL`
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(USER_TABLE, 'company_id');
  }
};
