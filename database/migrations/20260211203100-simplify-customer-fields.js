'use strict';

const { CUSTOMER_TABLE } = require('../models/customer.model');

module.exports = {
    async up(queryInterface, Sequelize) {
        const tableDescription = await queryInterface.describeTable(CUSTOMER_TABLE);

        // 1. Agregar nuevas columnas de forma segura
        if (!tableDescription.first_name) {
            await queryInterface.addColumn(CUSTOMER_TABLE, 'first_name', {
                type: Sequelize.STRING,
                allowNull: true, // Permitir NULL durante migración
            });
        }

        if (!tableDescription.last_name) {
            await queryInterface.addColumn(CUSTOMER_TABLE, 'last_name', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }

        if (!tableDescription.is_final_consumer) {
            await queryInterface.addColumn(CUSTOMER_TABLE, 'is_final_consumer', {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            });
        }

        if (!tableDescription.nit) {
            await queryInterface.addColumn(CUSTOMER_TABLE, 'nit', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }

        // 2. Migrar datos existentes
        // Esto es seguro correr múltiples veces porque el WHERE filtra los que ya están migrados
        await queryInterface.sequelize.query(`
          UPDATE ${CUSTOMER_TABLE}
          SET 
            first_name = name,
            last_name = CONCAT_WS(' ', first_lastname, second_lastname)
          WHERE (first_name IS NULL OR first_name = '') AND name IS NOT NULL
        `);

        // 3. Hacer first_name y last_name NOT NULL después de migrar datos
        // Importante: verificar que no queden nulos antes de establecer constraints
        // Si hay registros sin nombre antiguo, poner un placeholder para evitar error de constraint
        await queryInterface.sequelize.query(`
            UPDATE ${CUSTOMER_TABLE} 
            SET first_name = 'Sin Nombre', last_name = 'Sin Apellido' 
            WHERE first_name IS NULL OR last_name IS NULL
        `);

        // Change column es idempotente en la mayoría de dialectos si la definición es igual
        try {
            await queryInterface.changeColumn(CUSTOMER_TABLE, 'first_name', {
                type: Sequelize.STRING,
                allowNull: false
            });
        } catch (error) {
            console.log('Error changing first_name column (might already be NOT NULL):', error.message);
        }

        try {
            await queryInterface.changeColumn(CUSTOMER_TABLE, 'last_name', {
                type: Sequelize.STRING,
                allowNull: false
            });
        } catch (error) {
            console.log('Error changing last_name column (might already be NOT NULL):', error.message);
        }

        // 4. Agregar índices de forma segura
        try {
            await queryInterface.addIndex(CUSTOMER_TABLE, ['first_name', 'last_name'], {
                name: 'idx_customer_names'
            });
        } catch (error) {
            console.log('Index idx_customer_names might already exist:', error.message);
        }

        try {
            await queryInterface.addIndex(CUSTOMER_TABLE, ['nit'], {
                name: 'idx_customer_nit'
            });
        } catch (error) {
            console.log('Index idx_customer_nit might already exist:', error.message);
        }
    },

    async down(queryInterface, Sequelize) {
        // Eliminar índices
        try {
            await queryInterface.removeIndex(CUSTOMER_TABLE, 'idx_customer_names');
        } catch (e) { console.log(e.message); }

        try {
            await queryInterface.removeIndex(CUSTOMER_TABLE, 'idx_customer_nit');
        } catch (e) { console.log(e.message); }

        // Eliminar columnas
        const tableDescription = await queryInterface.describeTable(CUSTOMER_TABLE);

        if (tableDescription.first_name) {
            await queryInterface.removeColumn(CUSTOMER_TABLE, 'first_name');
        }
        if (tableDescription.last_name) {
            await queryInterface.removeColumn(CUSTOMER_TABLE, 'last_name');
        }
        if (tableDescription.is_final_consumer) {
            await queryInterface.removeColumn(CUSTOMER_TABLE, 'is_final_consumer');
        }
        if (tableDescription.nit) {
            await queryInterface.removeColumn(CUSTOMER_TABLE, 'nit');
        }
    }
};
