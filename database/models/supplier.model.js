const { Model, DataTypes } = require('sequelize');

const SUPPLIER_TABLE = 'suppliers';

const SupplierSchema = {
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
    ruc: {
        allowNull: true,
        type: DataTypes.STRING,
    },
    website: {
        type: DataTypes.STRING,
    },
    email: {
        allowNull: true,
        type: DataTypes.STRING,
    },
    telephone: {
        allowNull: true,
        type: DataTypes.STRING,
    },
    address: {
        type: DataTypes.STRING,
    },
    companyId: {
        field: 'company_id',
        allowNull: true,
        type: DataTypes.INTEGER,
        defaultValue: 1
    }
}

class Supplier extends Model {
    // static associate(models) {
    //     this.hasMany(models.Subcategory, {
    //         as: 'subcategories',
    //         foreignKey: 'categoryId'
    //     });
    // }
    static associate(models) {
        this.belongsTo(models.Company, { as: 'company', foreignKey: 'companyId' });
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: SUPPLIER_TABLE,
            modelName: 'Supplier',
            timestamps: false,
            indexes: [
                { unique: true, fields: ['ruc', 'company_id'], name: 'suppliers_ruc_company_unique' }
            ]
        }
    }
}

module.exports = { SUPPLIER_TABLE, SupplierSchema, Supplier }