'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Drop existing table if any
        await queryInterface.dropTable('Notes');

        // Create new table
        await queryInterface.createTable('Notes', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER,
            },
            order_date: {
                allowNull: false,
                type: DataTypes.DATEONLY,
            },
            due_date: {
                allowNull: false,
                type: DataTypes.DATEONLY,
            },
            phone: {
                allowNull: false,
                type: DataTypes.STRING(20),
            },
            design_description: {
                allowNull: false,
                type: DataTypes.TEXT,
            },
            status: {
                allowNull: false,
                type: DataTypes.STRING(50),
                defaultValue: 'INICIO',
            },
            company_id: {
                allowNull: true,
                type: DataTypes.INTEGER,
                references: {
                    model: 'companies',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            created_at: {
                allowNull: false,
                type: DataTypes.DATE,
                defaultValue: Sequelize.NOW,
            },
            updated_at: {
                allowNull: false,
                type: DataTypes.DATE,
                defaultValue: Sequelize.NOW,
            },
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('Notes');
    }
};
