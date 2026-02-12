const { Model, DataTypes } = require('sequelize');

const { ROLE_TABLE } = require('./role.model');
const { USER_TABLE } = require('./user.model');

const ROLE_USER_TABLE = 'roles_users';

const RoleUserSchema = {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },
  roleId: {
    field: 'role_id',
    allowNull: false,
    type: DataTypes.INTEGER,
    references: {
      model: ROLE_TABLE,
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
  createdAt: {
    allowNull: false,
    type: DataTypes.DATE,
    field: 'created_at',
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    allowNull: false,
    type: DataTypes.DATE,
    field: 'updated_at',
    defaultValue: DataTypes.NOW
  }
}

class RoleUser extends Model {
  static associate(models) {
    // Many-to-one: RoleUser -> Role
    this.belongsTo(models.Role, {
      as: 'role',
      foreignKey: 'roleId'
    });

    // Many-to-one: RoleUser -> User
    this.belongsTo(models.User, {
      as: 'user',
      foreignKey: 'userId'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: ROLE_USER_TABLE,
      modelName: 'RoleUser',
      timestamps: true
    }
  }
}

module.exports = { RoleUser, RoleUserSchema, ROLE_USER_TABLE };