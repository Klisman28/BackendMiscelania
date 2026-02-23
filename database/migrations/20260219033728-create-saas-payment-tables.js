'use strict';

const { COMPANY_TABLE } = require('./../models/company.model');

const PLANS_TABLE = 'plans';
const SUBSCRIPTIONS_TABLE = 'subscriptions';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Agregar stripe_customer_id a companies
    await queryInterface.addColumn(COMPANY_TABLE, 'stripe_customer_id', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });

    // 2. Crear tabla plans
    await queryInterface.createTable(PLANS_TABLE, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      slug: { // 'basic', 'pro', 'enterprise'
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      stripe_price_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING,
        defaultValue: 'usd'
      },
      features: {
        type: Sequelize.JSON, // Para guardar features del plan si se necesita visualmente
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 3. Crear tabla subscriptions
    await queryInterface.createTable(SUBSCRIPTIONS_TABLE, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: COMPANY_TABLE,
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      stripe_subscription_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      status: { // active, past_due, canceled, incomplete...
        type: Sequelize.STRING,
        allowNull: false
      },
      current_period_start: {
        type: Sequelize.DATE,
        allowNull: false
      },
      current_period_end: {
        type: Sequelize.DATE,
        allowNull: false
      },
      cancel_at_period_end: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable(SUBSCRIPTIONS_TABLE);
    await queryInterface.dropTable(PLANS_TABLE);
    await queryInterface.removeColumn(COMPANY_TABLE, 'stripe_customer_id');
  }
};
