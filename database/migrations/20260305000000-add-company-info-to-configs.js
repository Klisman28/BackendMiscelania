'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('configs', 'company_name', {
            type: Sequelize.STRING,
            allowNull: true,
        });
        await queryInterface.addColumn('configs', 'logo_url', {
            type: Sequelize.STRING,
            allowNull: true,
        });
        await queryInterface.addColumn('configs', 'logo_key', {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('configs', 'company_name');
        await queryInterface.removeColumn('configs', 'logo_url');
        await queryInterface.removeColumn('configs', 'logo_key');
    }
};
