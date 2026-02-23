const boom = require('@hapi/boom');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// const nodemailer = require('nodemailer');

const { models } = require('../../libs/sequelize'); // Import models
const config = require('../../config/auth.config');
const UserService = require('../organization/users.service');
const service = new UserService();

class AuthService {

  async getUser(username, password) {
    const user = await service.findByUsername(username);
    console.log('[AuthService] User found:', user ? user.toJSON() : 'Not found');
    if (!user) {
      throw boom.unauthorized("Las credenciales son incorrectas");
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw boom.unauthorized("Las credenciales son incorrectas");;
    }

    delete user.dataValues.password;
    const flatRoles = (user.roles || []).map(role => role.name.toUpperCase());

    // Fallback para usuarios legacy sin companyId
    if (!user.companyId) {
      user.companyId = 1;
    }

    // --- SaaS Logic: Determine Active Company ---
    // Buscar membresías activas en company_users
    const memberships = await models.CompanyUser.findAll({
      where: {
        userId: user.id,
        status: 'active'
      },
      include: ['company']
    });

    let activeCompanyId = user.companyId; // Default to legacy/home company

    if (memberships.length > 0) {
      // Prioritize the first active company found via pivot
      // In the future, we could accept a 'targetCompanyId' param in login to choose
      activeCompanyId = memberships[0].companyId;

      // If we found memberships, we might also want to know the role in that specific company
      // For now, we trust global roles, but ideally we should fetch role per company.
      // const activeRole = memberships[0].role; 
    }

    // Si es admin de la empresa administradora (ID 1), le damos rol SUPERADMIN para el frontend
    if (activeCompanyId === 1 && flatRoles.includes('ADMIN') && !flatRoles.includes('SUPERADMIN')) {
      flatRoles.push('SUPERADMIN');
    }

    return { ...user.dataValues, roles: flatRoles, activeCompanyId };
  }

  signToken(user) {
    const payload = {
      sub: user.id,
      roles: user.roles,
      companyId: user.activeCompanyId || user.companyId // Prefer activeCompanyId
    }
    const token = jwt.sign(payload, config.jwtSecret);
    return {
      user,
      token
    };
  }

  // async sendRecovery(email) {
  //   const user = await service.findByEmail(email);
  //   if (!user) {
  //     throw boom.unauthorized();
  //   }
  //   const payload = { sub: user.id };
  //   const token = jwt.sign(payload, config.jwtSecret, {expiresIn: '15min'});
  //   const link = `http://myfrontend.com/recovery?token=${token}`;
  //   await service.update(user.id, {recoveryToken: token});
  //   const mail = {
  //     from: config.smtpEmail,
  //     to: `${user.email}`,
  //     subject: "Email para recuperar contraseña",
  //     html: `<b>Ingresa a este link => ${link}</b>`,
  //   }
  //   const rta = await this.sendMail(mail);
  //   return rta;
  // }

  async changePassword(token, newPassword) {
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      const user = await service.findOne(payload.sub);
      if (user.recoveryToken !== token) {
        throw boom.unauthorized();
      }
      const hash = await bcrypt.hash(newPassword, 10);
      await service.update(user.id, { recoveryToken: null, password: hash });
      return { message: 'password changed' };
    } catch (error) {
      throw boom.unauthorized();
    }
  }

  // async sendMail(infoMail) {
  //   const transporter = nodemailer.createTransport({
  //     host: "smtp.gmail.com",
  //     secure: true,
  //     port: 465,
  //     auth: {
  //       user: config.smtpEmail,
  //       pass: config.smtpPassword
  //     }
  //   });
  //   await transporter.sendMail(infoMail);
  //   return { message: 'mail sent' };
  // }
}

module.exports = AuthService;
