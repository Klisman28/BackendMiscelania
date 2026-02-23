'use strict';
const { PRODUCT_TABLE } = require('../models/product.model');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable(PRODUCT_TABLE);
    if (!tableInfo.image_url) {
      await queryInterface.addColumn(PRODUCT_TABLE, 'image_url', {
        allowNull: true,
        type: Sequelize.STRING,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable(PRODUCT_TABLE);
    if (tableInfo.image_url) {
      await queryInterface.removeColumn(PRODUCT_TABLE, 'image_url');
    }
  }
};
