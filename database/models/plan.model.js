
const { Model, DataTypes, Sequelize } = require('sequelize');

const PLANS_TABLE = 'plans';

const PlanSchema = {
    id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    stripePriceId: {
        field: 'stripe_price_id',
        type: DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'usd'
    },
    features: {
        type: DataTypes.JSON,
        allowNull: true
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

class Plan extends Model {
    static associate(models) {
        // Podríamos asociar un Subscription a un Plan si quisiéramos
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: PLANS_TABLE,
            modelName: 'Plan',
            timestamps: true
        }
    }
}

module.exports = { PLANS_TABLE, PlanSchema, Plan }
