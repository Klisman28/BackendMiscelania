const { Model, DataTypes } = require('sequelize');
const { PRODUCT_TABLE } = require('./product.model');
const { WAREHOUSE_TABLE } = require('./warehouse.model');

const INVENTORY_BALANCE_TABLE = 'inventory_balances';

const InventoryBalanceSchema = {
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
    quantity: {
        allowNull: false,
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
};

class InventoryBalance extends Model {
    static associate(models) {
        this.belongsTo(models.Product, {
            as: 'product',
            foreignKey: 'productId'
        });
        this.belongsTo(models.Warehouse, {
            as: 'warehouse',
            foreignKey: 'warehouseId'
        });
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: INVENTORY_BALANCE_TABLE,
            modelName: 'InventoryBalance',
            timestamps: true, // Useful to know when it was last updated
            indexes: [
                {
                    unique: true,
                    fields: ['product_id', 'warehouse_id']
                }
            ]
        }
    }
}

module.exports = { INVENTORY_BALANCE_TABLE, InventoryBalanceSchema, InventoryBalance };
