'use strict';

const { DataTypes } = require('sequelize');
const WAREHOUSE_TABLE = 'warehouses';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(WAREHOUSE_TABLE, 'code', {
            allowNull: true,
            type: DataTypes.STRING(20),
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn(WAREHOUSE_TABLE, 'code');
    }
};
