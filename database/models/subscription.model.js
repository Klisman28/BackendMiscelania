
const { Model, DataTypes, Sequelize } = require('sequelize');
const { COMPANY_TABLE } = require('./company.model');

const SUBSCRIPTIONS_TABLE = 'subscriptions';

const SubscriptionSchema = {
    id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    companyId: {
        field: 'company_id',
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: COMPANY_TABLE,
            key: 'id'
        }
    },
    stripeSubscriptionId: {
        field: 'stripe_subscription_id',
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false
    },
    currentPeriodStart: {
        field: 'current_period_start',
        type: DataTypes.DATE,
        allowNull: false
    },
    currentPeriodEnd: {
        field: 'current_period_end',
        type: DataTypes.DATE,
        allowNull: false
    },
    cancelAtPeriodEnd: {
        field: 'cancel_at_period_end',
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: Sequelize.NOW
    },
    updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'updated_at',
        defaultValue: Sequelize.NOW
    }
}

class Subscription extends Model {
    static associate(models) {
        this.belongsTo(models.Company, { as: 'company' });
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: SUBSCRIPTIONS_TABLE,
            modelName: 'Subscription',
            timestamps: true
        }
    }
}

module.exports = { SUBSCRIPTIONS_TABLE, SubscriptionSchema, Subscription }
