'use strict';

const { ROLE_TABLE } = require('../models/role.model');

module.exports = {
    async up(queryInterface, Sequelize) {
        // Canonical roles for RBAC system
        const canonicalRoles = [
            { name: 'admin' },
            { name: 'sales' },
            { name: 'warehouse' }
        ];

        // Para evitar duplicados, primero verificar cuáles ya existen
        const existingRoles = await queryInterface.sequelize.query(
            `SELECT name FROM ${ROLE_TABLE}`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        const existingRoleNames = existingRoles.map(r => r.name);

        // Filtrar solo los roles que no existen
        const rolesToInsert = canonicalRoles.filter(
            role => !existingRoleNames.includes(role.name)
        );

        if (rolesToInsert.length > 0) {
            await queryInterface.bulkInsert(ROLE_TABLE, rolesToInsert, {});
            console.log(`Inserted ${rolesToInsert.length} canonical roles:`, rolesToInsert.map(r => r.name).join(', '));
        } else {
            console.log('All canonical roles already exist, skipping insert.');
        }
    },

    async down(queryInterface, Sequelize) {
        // Solo eliminar los roles canónicos creados por este seed
        await queryInterface.bulkDelete(ROLE_TABLE, {
            name: ['admin', 'sales', 'warehouse']
        }, {});
    }
};
