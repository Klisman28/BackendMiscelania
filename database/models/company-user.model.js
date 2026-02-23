const { Model, DataTypes, Sequelize } = require('sequelize');

const { COMPANY_TABLE } = require('./company.model');
const { USER_TABLE } = require('./user.model');

const COMPANY_USER_TABLE = 'company_users';

const CompanyUserSchema = {
    id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    companyId: {
        field: 'company_id',
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
            model: COMPANY_TABLE,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    userId: {
        field: 'user_id',
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
            model: USER_TABLE,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    role: {
        allowNull: false,
        type: DataTypes.STRING,
        defaultValue: 'staff' // owner, admin, staff
    },
    status: {
        allowNull: false,
        type: DataTypes.STRING,
        defaultValue: 'active' // active, suspended, pending
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: Sequelize.NOW
    },
    updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'updated_at',
        defaultValue: Sequelize.NOW
    }
}

class CompanyUser extends Model {
    static associate(models) {
        // belongsTo Company
        this.belongsTo(models.Company, {
            as: 'company',
            foreignKey: 'companyId'
        });
        // belongsTo User
        this.belongsTo(models.User, {
            as: 'user',
            foreignKey: 'userId'
        });
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: COMPANY_USER_TABLE,
            modelName: 'CompanyUser',
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ['company_id', 'user_id']
                }
            ]
        }
    }
}

module.exports = { COMPANY_USER_TABLE, CompanyUserSchema, CompanyUser };
