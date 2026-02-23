const { Model, DataTypes } = require('sequelize');

const CASHIER_TABLE = 'cashiers';

const CashierSchema = {
    id: {
        allowNull: true,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    name: {
        allowNull: true,
        type: DataTypes.STRING,
        unique: true
    },
    code: {
        allowNull: true,
        type: DataTypes.STRING,
        unique: true
    },
    status: {
        allowNull: true,
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    companyId: {
        field: 'company_id',
        allowNull: true,
        type: DataTypes.INTEGER,
        defaultValue: 1
    }
}

class Cashier extends Model {
    static associate(models) {
        this.hasMany(models.Opening, {
            as: 'openings',
            foreignKey: 'cashierId'
        });

        this.belongsTo(models.Company, { as: 'company', foreignKey: 'companyId' });
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: CASHIER_TABLE,
            modelName: 'Cashier',
            timestamps: false
        }
    }
}


module.exports = { CASHIER_TABLE, CashierSchema, Cashier }