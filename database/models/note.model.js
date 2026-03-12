const { Model, DataTypes } = require('sequelize');

// Nombre de la tabla en la base de datos
const NOTE_TABLE = 'Notes';

// Definición del esquema de columnas
const NoteSchema = {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER,
  },
  orderDate: {
    allowNull: false,
    type: DataTypes.DATEONLY, // fecha de pedido
    field: 'order_date',
  },
  dueDate: {
    allowNull: false,
    type: DataTypes.DATEONLY, // fecha finalización
    field: 'due_date',
  },
  clientName: {
    allowNull: false,
    type: DataTypes.STRING(150), // nombre del cliente
    field: 'client_name',
  },
  phone: {
    allowNull: false,
    type: DataTypes.STRING(20), // número teléfono
  },
  designDescription: {
    allowNull: false,
    type: DataTypes.TEXT, // descripción del diseño
    field: 'design_description',
  },
  status: {
    allowNull: false,
    type: DataTypes.STRING(50),
    defaultValue: 'INICIO', // 'INICIO' | 'PROGRESO' | 'FINALIZADO'
  },
  companyId: { // Para SaaS Multi-tenant
    allowNull: true,
    type: DataTypes.INTEGER,
    field: 'company_id',
    references: {
      model: 'companies',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  createdAt: {
    allowNull: false,
    type: DataTypes.DATE,
    field: 'created_at',
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    allowNull: false,
    type: DataTypes.DATE,
    field: 'updated_at',
    defaultValue: DataTypes.NOW,
  },
};

class Note extends Model {
  static associate(models) {
    // Aquí defines relaciones, por ejemplo, si tienes otra tabla
    // this.belongsTo(models.User, { ... });
  }

  static config(sequelize) {
    return {
      sequelize,              // instancia de conexión
      tableName: NOTE_TABLE, // nombre de la tabla
      modelName: 'Note',     // nombre del modelo
      timestamps: true,       // indica que tendrá createdAt y updatedAt
      hooks: {
        afterUpdate: async (note, options) => {
          if (note.changed('status') && (note.status === 'DONE' || note.status === 'FINALIZADO')) {
            const now = new Date();
            await sequelize.models.TaskReminder.update(
              { status: 'cancelled', cancelledAt: now, errorText: 'Cancelado automáticamente al finalizar tarea' },
              { where: { noteId: note.id, status: 'pending', companyId: note.companyId }, transaction: options.transaction }
            );
          }
        }
      }
    };
  }
}

module.exports = { NOTE_TABLE, NoteSchema, Note };
