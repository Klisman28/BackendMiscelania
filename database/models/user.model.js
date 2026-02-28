const { Model, DataTypes } = require('sequelize');

const USER_TABLE = 'users';

const UserSchema = {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },
  username: {
    allowNull: false,
    type: DataTypes.STRING,
    unique: true,
  },
  companyId: {
    field: 'company_id',
    allowNull: true, // Será false en el futuro cuando limpiemos datos
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  password: {
    allowNull: true,
    type: DataTypes.STRING
  },
  status: {
    allowNull: true,
    type: DataTypes.BOOLEAN,
    default: true,
    get() {
      const value = this.getDataValue('status');
      let statusText = '';
      if (value) {
        statusText = 'Activo';
      } else if (!value) {
        statusText = 'Inactivo'
      }
      return statusText;
    }
  },
  userableId: {
    allowNull: true,
    type: DataTypes.INTEGER,
    field: 'userable_id'
  },
  userableType: {
    allowNull: true,
    type: DataTypes.STRING,
    field: 'userable_type'
  },
  createdAt: {
    allowNull: true,
    type: DataTypes.DATE,
    field: 'created_at',
  },
  updatedAt: {
    allowNull: true,
    type: DataTypes.DATE,
    field: 'updated_at'
  }
}

class User extends Model {
  static associate(models) {
    // Many-to-many: User <-> Role through RoleUser
    this.belongsToMany(models.Role, {
      as: 'roles',
      through: models.RoleUser,
      foreignKey: 'userId',
      otherKey: 'roleId'
    });
    this.belongsTo(models.Company, {
      as: 'company',
      foreignKey: 'companyId'
    });

    // One-to-many: User -> RoleUser (optional, útil para queries directas)
    this.hasMany(models.RoleUser, {
      as: 'userRoles',
      foreignKey: 'userId'
    });

    this.hasMany(models.CompanyUser, {
      as: 'memberships',
      foreignKey: 'userId'
    });

    // Polymorphic association: User -> Employee
    this.belongsTo(models.Employee, {
      as: 'employee',
      foreignKey: "userableId",
      constraints: false
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: USER_TABLE,
      modelName: 'User',
      timestamps: true
    }
  }
}


module.exports = { USER_TABLE, UserSchema, User }