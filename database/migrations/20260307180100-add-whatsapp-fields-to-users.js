'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('users', 'whatsapp_phone_e164', {
            type: Sequelize.STRING,
            allowNull: true,
        });

        await queryInterface.addColumn('users', 'whatsapp_opt_in_at', {
            type: Sequelize.DATE,
            allowNull: true,
        });

        await queryInterface.addColumn('users', 'timezone', {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'America/Guatemala',
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('users', 'whatsapp_phone_e164');
        await queryInterface.removeColumn('users', 'whatsapp_opt_in_at');
        await queryInterface.removeColumn('users', 'timezone');
    }
};
