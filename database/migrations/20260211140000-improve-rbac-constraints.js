'use strict';

const { ROLE_USER_TABLE } = require('../models/role-user.model');

module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Agregar timestamps a roles_users si no existen
        const tableDescription = await queryInterface.describeTable(ROLE_USER_TABLE);

        if (!tableDescription.created_at) {
            await queryInterface.addColumn(ROLE_USER_TABLE, 'created_at', {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            });
        }

        if (!tableDescription.updated_at) {
            await queryInterface.addColumn(ROLE_USER_TABLE, 'updated_at', {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
            });
        }

        // 2. Cambiar roleId y userId a NOT NULL (primero verificar que no haya NULLs)
        await queryInterface.sequelize.query(
            `DELETE FROM ${ROLE_USER_TABLE} WHERE role_id IS NULL OR user_id IS NULL`
        );

        await queryInterface.changeColumn(ROLE_USER_TABLE, 'role_id', {
            type: Sequelize.INTEGER,
            allowNull: false
        });

        await queryInterface.changeColumn(ROLE_USER_TABLE, 'user_id', {
            type: Sequelize.INTEGER,
            allowNull: false
        });

        // 3. Agregar índice único compuesto (role_id, user_id)
        // Primero eliminar duplicados si existen
        await queryInterface.sequelize.query(`
      DELETE t1 FROM ${ROLE_USER_TABLE} t1
      INNER JOIN ${ROLE_USER_TABLE} t2 
      WHERE t1.id > t2.id 
      AND t1.role_id = t2.role_id 
      AND t1.user_id = t2.user_id
    `);

        try {
            await queryInterface.addIndex(ROLE_USER_TABLE, ['role_id', 'user_id'], {
                unique: true,
                name: 'unique_role_user'
            });
        } catch (error) {
            // Index might already exist, continue
            console.log('Index unique_role_user already exists or failed to create:', error.message);
        }

        // 4. Agregar índices individuales para mejor performance en queries
        try {
            await queryInterface.addIndex(ROLE_USER_TABLE, ['role_id'], {
                name: 'idx_role_id'
            });
        } catch (error) {
            console.log('Index idx_role_id already exists:', error.message);
        }

        try {
            await queryInterface.addIndex(ROLE_USER_TABLE, ['user_id'], {
                name: 'idx_user_id'
            });
        } catch (error) {
            console.log('Index idx_user_id already exists:', error.message);
        }

        // 5. Hacer name de roles NOT NULL y unique (si no lo es ya)
        const rolesTableDescription = await queryInterface.describeTable('roles');

        await queryInterface.changeColumn('roles', 'name', {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        });
    },

    async down(queryInterface, Sequelize) {
        // Revertir en orden inverso

        // Eliminar índices
        try {
            await queryInterface.removeIndex(ROLE_USER_TABLE, 'unique_role_user');
        } catch (error) {
            console.log('Could not remove index unique_role_user:', error.message);
        }

        try {
            await queryInterface.removeIndex(ROLE_USER_TABLE, 'idx_role_id');
        } catch (error) {
            console.log('Could not remove index idx_role_id:', error.message);
        }

        try {
            await queryInterface.removeIndex(ROLE_USER_TABLE, 'idx_user_id');
        } catch (error) {
            console.log('Could not remove index idx_user_id:', error.message);
        }

        // Permitir NULL en role_id y user_id
        await queryInterface.changeColumn(ROLE_USER_TABLE, 'role_id', {
            type: Sequelize.INTEGER,
            allowNull: true
        });

        await queryInterface.changeColumn(ROLE_USER_TABLE, 'user_id', {
            type: Sequelize.INTEGER,
            allowNull: true
        });

        // Eliminar timestamps
        const tableDescription = await queryInterface.describeTable(ROLE_USER_TABLE);

        if (tableDescription.created_at) {
            await queryInterface.removeColumn(ROLE_USER_TABLE, 'created_at');
        }

        if (tableDescription.updated_at) {
            await queryInterface.removeColumn(ROLE_USER_TABLE, 'updated_at');
        }
    }
};
