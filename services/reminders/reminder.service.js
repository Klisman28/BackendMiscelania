const boom = require('@hapi/boom');
const { models } = require('../../libs/sequelize');
const WhatsappService = require('../whatsapp/whatsapp.service');

class ReminderService {
    constructor() {
        this.whatsappService = new WhatsappService();
    }

    async createReminder(companyId, userId, noteId, data) {
        const company = await models.Company.findByPk(companyId);
        if (!company.whatsapp_reminders_enabled) {
            throw boom.forbidden('La empresa no tiene habilitada la función de recordatorios por WhatsApp');
        }

        const user = await models.User.findOne({ where: { id: userId, companyId } });
        if (!user || !user.whatsapp_phone_e164 || !user.whatsapp_opt_in_at) {
            throw boom.badRequest('El usuario no ha configurado o aceptado recibir mensajes por WhatsApp');
        }

        const note = await models.Note.findOne({ where: { id: noteId, companyId } });
        if (!note) {
            throw boom.notFound('Nota no encontrada');
        }

        if (note.status === 'FINALIZADO' || note.status === 'DONE') {
            throw boom.badRequest('No se pueden programar recordatorios para tareas completadas');
        }

        const reminder = await models.TaskReminder.create({
            companyId,
            userId,
            noteId,
            scheduledFor: data.scheduledFor,
            channel: 'WHATSAPP',
            status: 'pending'
        });

        return reminder;
    }

    async handleWebhookStatus(entry) {
        for (const change of entry[0].changes) {
            if (change.value && change.value.statuses) {
                for (const status of change.value.statuses) {
                    const waMessageId = status.id;
                    const deliveryStatus = status.status; // sent, delivered, read, failed

                    await models.TaskReminder.update(
                        { deliveryStatus },
                        { where: { waMessageId } }
                    );
                }
            }
        }
        return true;
    }
}

module.exports = ReminderService;
