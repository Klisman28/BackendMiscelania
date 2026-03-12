const axios = require('axios');
const boom = require('@hapi/boom');

class WhatsappService {
    constructor() {
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
        this.graphVersion = process.env.WHATSAPP_GRAPH_VERSION || 'v19.0';
        this.templateName = process.env.WHATSAPP_TEMPLATE_REMINDER || 'task_reminder_v1';
        this.templateLang = process.env.WHATSAPP_TEMPLATE_LANG || 'es';

        // Solo setear la URL si tenemos las variables necesarias
        if (this.phoneNumberId) {
            this.apiUrl = `https://graph.facebook.com/${this.graphVersion}/${this.phoneNumberId}/messages`;
        }
    }

    async sendTemplateMessage(toE164, templateParams) {
        if (!this.accessToken || !this.phoneNumberId) {
            console.warn('[WhatsappService] Falta configuración de Meta API');
            return { success: false, error: 'Configuración incompleta' };
        }

        try {
            // Normalizar número eliminando el '+' para la API de Meta
            const toPhone = toE164.replace('+', '');

            const payload = {
                messaging_product: 'whatsapp',
                to: toPhone,
                type: 'template',
                template: {
                    name: this.templateName,
                    language: {
                        code: this.templateLang
                    },
                    components: [
                        {
                            type: 'body',
                            parameters: templateParams.map(param => ({
                                type: 'text',
                                text: param
                            }))
                        }
                    ]
                }
            };

            const response = await axios.post(this.apiUrl, payload, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return {
                success: true,
                messageId: response.data.messages[0].id
            };
        } catch (error) {
            console.error('Error enviando WhatsApp:', error.response ? error.response.data : error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    verifyWebhook(mode, token, challenge) {
        if (mode === 'subscribe' && token === this.verifyToken) {
            return challenge;
        }
        throw boom.forbidden('Error verificando token de WhatsApp');
    }
}

module.exports = WhatsappService;
