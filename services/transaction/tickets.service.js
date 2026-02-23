// services/tickets.service.js
const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');

class TicketsService {
  /**
   * Crea un ticket scoped por company_id.
   * @param {{ tipo: string, fecha: Date, … }} data
   * @param {number} companyId - del token
   * @returns {Promise<Model>} instancia del ticket con su id auto-incremental
   */
  async create(data, companyId) {
    try {
      const { companyId: _c, company_id: _ci, ...safe } = data;
      const ticket = await models.Ticket.create({ ...safe, companyId });
      return ticket;
    } catch (err) {
      throw boom.internal('Error creando ticket', err);
    }
  }

  /**
   * Próximo número de ticket para esta empresa.
   * @param {number} companyId - del token
   * @returns {Promise<number>} max(id) + 1 o 1 si no hay ninguno
   */
  async getNext(companyId) {
    try {
      const maxId = await models.Ticket.max('id', {
        where: { companyId }
      });
      return (maxId || 0) + 1;
    } catch (err) {
      throw boom.internal('Error obteniendo próximo número', err);
    }
  }
}

module.exports = TicketsService;
