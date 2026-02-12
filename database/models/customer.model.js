const { Model, DataTypes } = require('sequelize');

const CUSTOMER_TABLE = 'customers';

const CustomerSchema = {
    id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    // ===== NUEVOS CAMPOS (PRINCIPALES) =====
    firstName: {
        allowNull: false,
        type: DataTypes.STRING,
        field: 'first_name',
        get() {
            const value = this.getDataValue('firstName');
            return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
        },
        set(value) {
            this.setDataValue('firstName', value ? value.toLowerCase().trim() : value);
        }
    },
    lastName: {
        allowNull: false,
        type: DataTypes.STRING,
        field: 'last_name',
        get() {
            const value = this.getDataValue('lastName');
            return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
        },
        set(value) {
            this.setDataValue('lastName', value ? value.toLowerCase().trim() : value);
        }
    },
    isFinalConsumer: {
        allowNull: false,
        type: DataTypes.BOOLEAN,
        field: 'is_final_consumer',
        defaultValue: false
    },
    nit: {
        allowNull: true,
        type: DataTypes.STRING,
    },
    // ===== CAMPOS DE CONTACTO (OPCIONALES) =====
    email: {
        allowNull: true,
        type: DataTypes.STRING,
    },
    telephone: {
        allowNull: true,
        type: DataTypes.STRING,
    },
    address: {
        allowNull: true,
        type: DataTypes.STRING,
    },
    // ===== CAMPOS ANTIGUOS (DEPRECADOS, MANTENER PARA COMPATIBILIDAD) =====
    name: {
        allowNull: true,
        type: DataTypes.STRING,
        get() {
            const newValue = this.getDataValue('name');
            return newValue ? newValue[0].toUpperCase() + newValue.slice(1) : newValue;
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
            return newValue ? newValue[0].toUpperCase() + newValue.slice(1) : newValue;
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
            return newValue ? newValue[0].toUpperCase() + newValue.slice(1) : newValue;
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
    }
}

class Customer extends Model {
    static associate(models) {
        // Asociaciones futuras si son necesarias
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: CUSTOMER_TABLE,
            modelName: 'Customer',
            timestamps: false
        }
    }
}

module.exports = { CUSTOMER_TABLE, CustomerSchema, Customer }