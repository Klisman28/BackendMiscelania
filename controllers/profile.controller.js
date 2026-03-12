const { models } = require('../libs/sequelize');
const boom = require('@hapi/boom');
const { normalizeToE164GT } = require('../utils/phone.util');

const updateWhatsappProfile = async (req, res, next) => {
    try {
        const { phone, optIn, timezone } = req.body;
        const userId = req.user.id || req.user.sub;
        const companyId = req.user.companyId || req.user.company_id;

        // Buscar el usuario validando que pertenezca a la empresa
        const user = await models.User.findOne({
            where: {
                id: userId,
                companyId: companyId
            }
        });

        if (!user) {
            throw boom.notFound('Usuario no encontrado o no pertenece a la empresa');
        }

        const normalizedPhone = normalizeToE164GT(phone);

        if (phone && !normalizedPhone) {
            throw boom.badRequest('Formato de teléfono inválido');
        }

        const optInDate = optIn ? new Date() : null;
        const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Guatemala';

        await user.update({
            whatsapp_phone_e164: normalizedPhone,
            whatsapp_opt_in_at: optInDate,
            timezone: tz
        });

        res.status(200).json({
            message: 'Configuración de WhatsApp guardada exitosamente.',
            data: {
                whatsapp_phone: user.whatsapp_phone_e164,
                opt_in: !!user.whatsapp_opt_in_at,
                timezone: user.timezone
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { updateWhatsappProfile };
