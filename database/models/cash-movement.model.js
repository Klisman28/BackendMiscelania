const { Model, DataTypes } = require('sequelize');
const { OPENING_TABLE } = require('./opening.model');
const { USER_TABLE } = require('./user.model');

const CASH_MOVEMENT_TABLE = 'cash_movements';

const CashMovementSchema = {
    id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    openingId: {
        field: 'opening_id',
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
            model: OPENING_TABLE,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    type: {
        allowNull: false,
        type: DataTypes.ENUM('CASH_IN', 'CASH_OUT')
    },
    amount: {
        allowNull: false,
        type: DataTypes.DECIMAL(10, 2)
    },
    description: {
        allowNull: true,
        type: DataTypes.TEXT
    },
    userId: {
        field: 'user_id',
        allowNull: true,
        type: DataTypes.INTEGER,
        references: {
            model: USER_TABLE,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: DataTypes.NOW,
    },
    updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'updated_at',
        defaultValue: DataTypes.NOW,
    }
}

class CashMovement extends Model {
    static associate(models) {
        this.belongsTo(models.Opening, { as: 'opening' });
        this.belongsTo(models.User, { as: 'user' });
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: CASH_MOVEMENT_TABLE,
            modelName: 'CashMovement',
            timestamps: true
        }
    }
}

module.exports = { CASH_MOVEMENT_TABLE, CashMovementSchema, CashMovement };
