'use strict';

const { COMPANY_TABLE } = require('./../models/company.model');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(COMPANY_TABLE, 'plan', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'basic'
    });

    await queryInterface.addColumn(COMPANY_TABLE, 'seats', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 2 // Por defecto 2 usuarios para empezar
    });

    await queryInterface.addColumn(COMPANY_TABLE, 'subscription_end', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(COMPANY_TABLE, 'plan');
    await queryInterface.removeColumn(COMPANY_TABLE, 'seats');
    await queryInterface.removeColumn(COMPANY_TABLE, 'subscription_end');
  }
};
