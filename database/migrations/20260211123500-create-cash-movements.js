'use strict';

const { CASH_MOVEMENT_TABLE, CashMovementSchema } = require("../models/cash-movement.model");

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(CASH_MOVEMENT_TABLE, CashMovementSchema);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable(CASH_MOVEMENT_TABLE);
    }
};
