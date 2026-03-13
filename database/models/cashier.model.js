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
    },
    code: {
        allowNull: true,
        type: DataTypes.STRING,
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
            timestamps: false,
            indexes: [
                { unique: true, fields: ['name', 'company_id'], name: 'cashiers_name_company_unique' },
                { unique: true, fields: ['code', 'company_id'], name: 'cashiers_code_company_unique' }
            ]
        }
    }
}


module.exports = { CASHIER_TABLE, CashierSchema, Cashier }