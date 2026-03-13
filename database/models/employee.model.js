'use strict';
const { Model, DataTypes } = require('sequelize');

const EMPPLOYEE_TABLE = 'employees';

const EmployeeSchema = {
    id: {
        allowNull: true,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    name: {
        allowNull: true,
        type: DataTypes.STRING,
        get() {
            const newValue = this.getDataValue('name');
            if (!newValue) return newValue;
            return newValue[0].toUpperCase() + newValue.slice(1);
        },
        set(value) {
            this.setDataValue('name', value ? value.toLowerCase().trim() : value);
        }
    },
    firstLastname: {
        allowNull: true,
        type: DataTypes.STRING,
        field: 'first_lastname',
        get() {
            const newValue = this.getDataValue('firstLastname');
            if (!newValue) return newValue;
            return newValue[0].toUpperCase() + newValue.slice(1);
        },
        set(value) {
            this.setDataValue('firstLastname', value ? value.toLowerCase().trim() : value);
        }
    },
    secondLastname: {
        allowNull: true,
        type: DataTypes.STRING,
        field: 'second_lastname',
        get() {
            const newValue = this.getDataValue('secondLastname');
            if (!newValue) return newValue;
            return newValue[0].toUpperCase() + newValue.slice(1);
        },
        set(value) {
            this.setDataValue('secondLastname', value ? value.toLowerCase().trim() : value);
        }
    },
    fullname: {
        allowNull: true,
        type: DataTypes.STRING,
    },
    dni: {
        allowNull: true,
        type: DataTypes.STRING,
    },
    birthdate: {
        type: DataTypes.DATEONLY,
    },
    gender: {
        type: DataTypes.STRING,
        get() {
            const newValue = this.getDataValue('gender');
            if (!newValue) return newValue;
            return newValue[0].toUpperCase() + newValue.slice(1);
        },
        set(value) {
            this.setDataValue('gender', value ? value.toLowerCase().trim() : value);
        }
    },
    email: {
        type: DataTypes.STRING,
    },
    telephone: {
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
};

class Employee extends Model {
    static associate(models) {
        // hasOne polimórfico
        this.hasOne(models.User, {
            as: 'user',
            foreignKey: 'userableId',
            constraints: false
        });
        this.belongsTo(models.Company, { as: 'company', foreignKey: 'companyId' });
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: EMPPLOYEE_TABLE,
            modelName: 'Employee',
            timestamps: false,
            indexes: [
                { unique: true, fields: ['dni', 'company_id'], name: 'employees_dni_company_unique' }
            ]
        };
    }
}

module.exports = { EMPPLOYEE_TABLE, EmployeeSchema, Employee };