const { Model, DataTypes } = require('sequelize');

const UNIT_TABLE = 'units';

const UnitSchema = {
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
    symbol: {
        allowNull: true,
        type: DataTypes.STRING,
        unique: true
    },
    companyId: {
        field: 'company_id',
        allowNull: true,
        type: DataTypes.INTEGER,
        defaultValue: 1
    }
}

class Unit extends Model {
    static associate(models) {
        this.belongsTo(models.Company, { as: 'company', foreignKey: 'companyId' });
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: UNIT_TABLE,
            modelName: 'Unit',
            timestamps: false
        }
    }
}


module.exports = { UNIT_TABLE, UnitSchema, Unit }