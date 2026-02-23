const { Model, DataTypes, Sequelize } = require('sequelize');

const COMPANY_TABLE = 'companies';

const CompanySchema = {
    id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    name: {
        allowNull: false,
        type: DataTypes.STRING,
    },
    slug: {
        allowNull: false,
        type: DataTypes.STRING,
        unique: true
    },
    status: {
        allowNull: false,
        type: DataTypes.STRING, // 'active', 'suspended', 'trial'
        defaultValue: 'active'
    },
    ownerId: {
        allowNull: true,
        field: 'owner_id',
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
    },
    plan: {
        allowNull: false,
        type: DataTypes.STRING,
        defaultValue: 'basic'
    },
    seats: {
        allowNull: false,
        type: DataTypes.INTEGER,
        defaultValue: 2
    },
    subscriptionEnd: {
        allowNull: true,
        type: DataTypes.DATE,
        field: 'subscription_end'
    },
    stripeCustomerId: {
        allowNull: true,
        type: DataTypes.STRING,
        field: 'stripe_customer_id'
    }
}

class Company extends Model {
    static associate(models) {
        this.hasMany(models.User, {
            as: 'users',
            foreignKey: 'companyId'
        });
        this.hasMany(models.Subscription, {
            as: 'subscriptions',
            foreignKey: 'companyId'
        });
        this.belongsTo(models.User, {
            as: 'owner',
            foreignKey: 'ownerId'
        });
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: COMPANY_TABLE,
            modelName: 'Company',
            timestamps: true
        }
    }
}

module.exports = { COMPANY_TABLE, CompanySchema, Company }
