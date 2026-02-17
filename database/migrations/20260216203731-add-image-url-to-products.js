'use strict';
const { PRODUCT_TABLE } = require('../models/product.model');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(PRODUCT_TABLE, 'image_url', {
      allowNull: true,
      type: Sequelize.STRING,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(PRODUCT_TABLE, 'image_url');
  }
};
