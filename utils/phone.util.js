/**
 * Normaliza un número de teléfono a formato E.164 (Guatemala por defecto).
 * @param {string} phone - Número de teléfono crudo.
 * @returns {string|null} - Número normalizado o null si es inválido.
 */
function normalizeToE164GT(phone) {
    if (!phone) return null;
    // Eliminar todo lo que no sea dígito
    const digitsOnly = phone.replace(/\D/g, '');

    if (digitsOnly.length === 8) {
        return `+502${digitsOnly}`;
    }

    if (digitsOnly.length > 8 && digitsOnly.startsWith('502')) {
        return `+${digitsOnly}`;
    }

    // Si ya tiene código de país distinto o es muy corto/largo, forzamos +
    return `+${digitsOnly}`;
}

module.exports = { normalizeToE164GT };
