'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Notes', 'client_name', {
            type: DataTypes.STRING(150),
            allowNull: false,
            defaultValue: 'Cliente Genérico', // Valor por defecto para registros antiguos si existieran
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('Notes', 'client_name');
    }
};
