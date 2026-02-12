const { Model, DataTypes } = require('sequelize');

const ROLE_TABLE = 'roles';

const RoleSchema = {
    id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    name: {
        allowNull: false,
        type: DataTypes.STRING,
        unique: true,
    }
}

class Role extends Model {
    static associate(models) {
        // Many-to-many: Role <-> User through RoleUser
        this.belongsToMany(models.User, {
            as: 'users',
            through: models.RoleUser,
            foreignKey: 'roleId',
            otherKey: 'userId'
        });

        // One-to-many: Role -> RoleUser (optional, útil para queries directas)
        this.hasMany(models.RoleUser, {
            as: 'roleUsers',
            foreignKey: 'roleId'
        });
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: ROLE_TABLE,
            modelName: 'Role',
            timestamps: false
        }
    }
}

module.exports = { ROLE_TABLE, RoleSchema, Role }