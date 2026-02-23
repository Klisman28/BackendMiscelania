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
    code: {
        allowNull: true,
        type: DataTypes.STRING(20)
    },
    address: {
        allowNull: true,
        type: DataTypes.STRING
    },
    active: {
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    companyId: {
        field: 'company_id',
        allowNull: true,
        type: DataTypes.INTEGER,
        defaultValue: 1
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
        this.belongsTo(models.Company, { as: 'company', foreignKey: 'companyId' });
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
