'use strict';

const { COMPANY_TABLE, CompanySchema } = require('../models/company.model');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(COMPANY_TABLE, CompanySchema);

    // Insertar la empresa por defecto para los datos existentes
    await queryInterface.bulkInsert(COMPANY_TABLE, [{
      name: 'Default Company',
      slug: 'default-company',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable(COMPANY_TABLE);
  }
};
