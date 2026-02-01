const { Model, DataTypes } = require('sequelize');
const { PRODUCT_TABLE } = require('./product.model');
const { WAREHOUSE_TABLE } = require('./warehouse.model');

const INVENTORY_MOVEMENT_TABLE = 'inventory_movements';

const InventoryMovementSchema = {
    id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    productId: {
        field: 'product_id',
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
            model: PRODUCT_TABLE,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    warehouseId: {
        field: 'warehouse_id',
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
            model: WAREHOUSE_TABLE,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    type: {
        allowNull: false,
        type: DataTypes.STRING, // IN, OUT, SALE, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT
    },
    quantity: {
        allowNull: false,
        type: DataTypes.INTEGER
    },
    referenceId: {
        field: 'reference_id',
        allowNull: true,
        type: DataTypes.STRING // ID of Sale, Transfer, Purchase, etc.
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    userId: {
        field: 'user_id',
        type: DataTypes.INTEGER,
        allowNull: true
    }
};

class InventoryMovement extends Model {
    static associate(models) {
        this.belongsTo(models.Product, {
            as: 'product',
            foreignKey: 'productId'
        });
        this.belongsTo(models.Warehouse, {
            as: 'warehouse',
            foreignKey: 'warehouseId'
        });
        // Optional: Associate with User if you have a User model
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: INVENTORY_MOVEMENT_TABLE,
            modelName: 'InventoryMovement',
            timestamps: true,
            updatedAt: false // Ledger only needs createdAt
        }
    }
}

module.exports = { INVENTORY_MOVEMENT_TABLE, InventoryMovementSchema, InventoryMovement };
