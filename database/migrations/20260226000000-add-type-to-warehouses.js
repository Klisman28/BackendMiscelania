'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('warehouses', 'type', {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'bodega',
            comment: 'tienda = punto de venta (POS), bodega = almacén'
        });

        // Add an index on type for fast filtering
        await queryInterface.addIndex('warehouses', ['type'], {
            name: 'idx_warehouses_type'
        });
    },

    async down(queryInterface) {
        await queryInterface.removeIndex('warehouses', 'idx_warehouses_type');
        await queryInterface.removeColumn('warehouses', 'type');
    }
};
