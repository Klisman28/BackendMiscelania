'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('task_reminders', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            company_id: {
                allowNull: false,
                type: Sequelize.INTEGER,
                references: {
                    model: 'companies',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            note_id: {
                allowNull: false,
                type: Sequelize.INTEGER,
                references: {
                    model: 'Notes', // Letra MAYUSCULA tal cual la tabla
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            user_id: {
                allowNull: false,
                type: Sequelize.INTEGER,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            channel: {
                allowNull: false,
                type: Sequelize.STRING,
                defaultValue: 'WHATSAPP'
            },
            scheduled_for: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            status: {
                allowNull: false,
                type: Sequelize.ENUM('pending', 'processing', 'sent', 'failed', 'cancelled'),
                defaultValue: 'pending',
            },
            delivery_status: {
                allowNull: true,
                type: Sequelize.STRING,
            },
            wa_message_id: {
                allowNull: true,
                type: Sequelize.STRING,
            },
            error_text: {
                allowNull: true,
                type: Sequelize.TEXT,
            },
            sent_at: {
                allowNull: true,
                type: Sequelize.DATE,
            },
            cancelled_at: {
                allowNull: true,
                type: Sequelize.DATE,
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn('NOW')
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn('NOW')
            }
        });
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('task_reminders');
    }
};
