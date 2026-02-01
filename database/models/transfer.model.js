const { Model, DataTypes } = require('sequelize');
const { WAREHOUSE_TABLE } = require('./warehouse.model');

const TRANSFER_TABLE = 'transfers';

const TransferSchema = {
    id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    fromWarehouseId: {
        field: 'from_warehouse_id',
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
            model: WAREHOUSE_TABLE,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
    },
    toWarehouseId: {
        field: 'to_warehouse_id',
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
            model: WAREHOUSE_TABLE,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
    },
    status: {
        allowNull: false,
        type: DataTypes.STRING, // COMPLETED, PENDING (if implementing approval workflow, but simple version is just COMPLETED)
        defaultValue: 'COMPLETED'
    },
    date: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    userId: {
        field: 'user_id',
        allowNull: true,
        type: DataTypes.INTEGER
    },
    observation: {
        type: DataTypes.TEXT,
        allowNull: true
    }
};

class Transfer extends Model {
    static associate(models) {
        this.belongsTo(models.Warehouse, { as: 'fromWarehouse', foreignKey: 'fromWarehouseId' });
        this.belongsTo(models.Warehouse, { as: 'toWarehouse', foreignKey: 'toWarehouseId' });
        this.belongsToMany(models.Product, {
            through: models.TransferItem,
            as: 'products',
            foreignKey: 'transferId',
            otherKey: 'productId'
        });
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: TRANSFER_TABLE,
            modelName: 'Transfer',
            timestamps: true
        }
    }
}

module.exports = { TRANSFER_TABLE, TransferSchema, Transfer };
