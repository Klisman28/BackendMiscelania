'use strict';

const { COMPANY_USER_TABLE, CompanyUserSchema } = require('../models/company-user.model');

module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable(COMPANY_USER_TABLE, CompanyUserSchema);

        // Add unique constraint separately if not handled by schema definition in createTable
        // Although schema has unique: true on fields or separate composite key definition if needed.
        // In our model definition we didn't explicitly add the unique index in the schema object 
        // passed to init, but we should add it here to be safe and performant.

        await queryInterface.addIndex(COMPANY_USER_TABLE, ['company_id', 'user_id'], {
            unique: true,
            name: 'company_users_company_id_user_id_unique'
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(COMPANY_USER_TABLE);
    }
};
