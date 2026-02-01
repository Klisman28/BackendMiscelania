const { Model, DataTypes } = require('sequelize');

const WAREHOUSE_TABLE = 'warehouses';

const WarehouseSchema = {
    id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    name: {
        allowNull: false,
        type: DataTypes.STRING,
        unique: true
    },
    address: {
        allowNull: true,
        type: DataTypes.STRING
    },
    active: {
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
};

class Warehouse extends Model {
    static associate(models) {
        this.hasMany(models.InventoryBalance, {
            as: 'inventory',
            foreignKey: 'warehouseId'
        });
        this.hasMany(models.Sale, {
            as: 'sales',
            foreignKey: 'warehouseId'
        });
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: WAREHOUSE_TABLE,
            modelName: 'Warehouse',
            timestamps: false
        }
    }
}

module.exports = { WAREHOUSE_TABLE, WarehouseSchema, Warehouse };
