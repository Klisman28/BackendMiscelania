const { Model, DataTypes } = require('sequelize');
const { TRANSFER_TABLE } = require('./transfer.model');
const { PRODUCT_TABLE } = require('./product.model');

const TRANSFER_ITEM_TABLE = 'transfer_items';

const TransferItemSchema = {
    id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    transferId: {
        field: 'transfer_id',
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
            model: TRANSFER_TABLE,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
        onDelete: 'NO ACTION'
    },
    quantity: {
        allowNull: false,
        type: DataTypes.INTEGER
    }
};

class TransferItem extends Model {
    static associate(models) {
        this.belongsTo(models.Product, { as: 'product', foreignKey: 'productId' });
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: TRANSFER_ITEM_TABLE,
            modelName: 'TransferItem',
            timestamps: false
        }
    }
}

module.exports = { TRANSFER_ITEM_TABLE, TransferItemSchema, TransferItem };
