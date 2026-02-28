'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tableDesc = await queryInterface.describeTable('products');

        // 1. Columna status: ACTIVE | INACTIVE | ARCHIVED
        if (!tableDesc.status) {
            await queryInterface.addColumn('products', 'status', {
                type: Sequelize.ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED'),
                allowNull: false,
                defaultValue: 'ACTIVE',
                after: 'description' // ubicar después de description
            });
        }

        // 2. Columna deletedAt para soft delete (paranoid)
        if (!tableDesc.deleted_at) {
            await queryInterface.addColumn('products', 'deleted_at', {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: null
            });
        }

        // 3. Campos opcionales de auditoría
        if (!tableDesc.inactivated_at) {
            await queryInterface.addColumn('products', 'inactivated_at', {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: null
            });
        }

        if (!tableDesc.archived_at) {
            await queryInterface.addColumn('products', 'archived_at', {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: null
            });
        }

        if (!tableDesc.inactive_reason) {
            await queryInterface.addColumn('products', 'inactive_reason', {
                type: Sequelize.STRING(500),
                allowNull: true,
                defaultValue: null
            });
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('products', 'inactive_reason');
        await queryInterface.removeColumn('products', 'archived_at');
        await queryInterface.removeColumn('products', 'inactivated_at');
        await queryInterface.removeColumn('products', 'deleted_at');
        await queryInterface.removeColumn('products', 'status');
    }
};
