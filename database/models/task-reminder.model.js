const { Model, DataTypes, Sequelize } = require('sequelize');

const TASK_REMINDER_TABLE = 'task_reminders';

const TaskReminderSchema = {
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
            model: 'companies',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    noteId: {
        field: 'note_id',
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
            model: 'Notes',
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
            model: 'users',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    channel: {
        allowNull: false,
        type: DataTypes.STRING,
        defaultValue: 'WHATSAPP'
    },
    scheduledFor: {
        field: 'scheduled_for',
        allowNull: false,
        type: DataTypes.DATE,
    },
    status: {
        allowNull: false,
        type: DataTypes.ENUM('pending', 'processing', 'sent', 'failed', 'cancelled'),
        defaultValue: 'pending',
    },
    deliveryStatus: {
        field: 'delivery_status',
        allowNull: true,
        type: DataTypes.STRING,
    },
    waMessageId: {
        field: 'wa_message_id',
        allowNull: true,
        type: DataTypes.STRING,
    },
    errorText: {
        field: 'error_text',
        allowNull: true,
        type: DataTypes.TEXT,
    },
    sentAt: {
        field: 'sent_at',
        allowNull: true,
        type: DataTypes.DATE,
    },
    cancelledAt: {
        field: 'cancelled_at',
        allowNull: true,
        type: DataTypes.DATE,
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
};

class TaskReminder extends Model {
    static associate(models) {
        this.belongsTo(models.Company, { as: 'company', foreignKey: 'companyId' });
        this.belongsTo(models.User, { as: 'user', foreignKey: 'userId' });
        this.belongsTo(models.Note, { as: 'note', foreignKey: 'noteId' });
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: TASK_REMINDER_TABLE,
            modelName: 'TaskReminder',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
}

module.exports = { TASK_REMINDER_TABLE, TaskReminderSchema, TaskReminder };
