const cron = require('node-cron');
const { Op } = require('sequelize');
const { models } = require('../libs/sequelize');
const WhatsappService = require('../services/whatsapp/whatsapp.service');

const whatsappService = new WhatsappService();

const startReminderWorker = () => {
    if (process.env.ENABLE_REMINDER_WORKER !== 'true') {
        console.log('[Worker] Worker de recordatorios de WhatsApp DESHABILITADO por env');
        return;
    }

    console.log('[Worker] Iniciando worker de recordatorios de WhatsApp');

    // Correr cada minuto
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();

            // Buscar recordatorios pendientes que ya pasaron su fecha programada
            const reminders = await models.TaskReminder.findAll({
                where: {
                    status: 'pending',
                    scheduledFor: {
                        [Op.lte]: now
                    }
                },
                include: [
                    { model: models.User, as: 'user', attributes: ['whatsapp_phone_e164', 'whatsapp_opt_in_at'] },
                    { model: models.Company, as: 'company', attributes: ['whatsapp_reminders_enabled'] },
                    { model: models.Note, as: 'note', attributes: ['clientName', 'status', 'designDescription'] }
                ]
            });

            for (const reminder of reminders) {
                // 1. Validar que la empresa aún tenga habilitada la función
                if (!reminder.company.whatsapp_reminders_enabled) {
                    await reminder.update({ status: 'cancelled', cancelledAt: now, errorText: 'Empresa deshabilitó WhatsApp' });
                    continue;
                }

                // 2. Validar que la tarea no esté completada ('FINALIZADO', 'DONE')
                if (reminder.note && (reminder.note.status === 'DONE' || reminder.note.status === 'FINALIZADO')) {
                    await reminder.update({ status: 'cancelled', cancelledAt: now, errorText: 'Tarea completada antes del recordatorio' });
                    continue;
                }

                // 3. Validar teléfono
                if (!reminder.user || !reminder.user.whatsapp_phone_e164 || !reminder.user.whatsapp_opt_in_at) {
                    await reminder.update({ status: 'failed', errorText: 'Usuario no tiene WhatsApp configurado o sin opt-in' });
                    continue;
                }

                // Bloquear temporalmente
                await reminder.update({ status: 'processing' });

                // Enviar WhatsApp (Los parámetros dependen de tu template de Meta)
                // Usaremos el id de nota y una porción de la descripción para el recordatorio
                const reminderDesc = (reminder.note.designDescription || 'Recordatorio programado').substring(0, 50);
                const templateParams = [
                    String(reminder.noteId),
                    reminderDesc
                ];

                const sendResult = await whatsappService.sendTemplateMessage(
                    reminder.user.whatsapp_phone_e164,
                    templateParams
                );

                if (sendResult.success) {
                    await reminder.update({
                        status: 'sent',
                        waMessageId: sendResult.messageId,
                        sentAt: new Date()
                    });
                } else {
                    await reminder.update({
                        status: 'failed',
                        errorText: sendResult.error
                    });
                }
            }
        } catch (error) {
            console.error('[Worker] Error procesando recordatorios:', error);
        }
    });
};

module.exports = { startReminderWorker };
