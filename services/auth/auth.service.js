const boom = require('@hapi/boom');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// const nodemailer = require('nodemailer');

const { models } = require('../../libs/sequelize'); // Import models
const config = require('../../config/auth.config');
const UserService = require('../organization/users.service');
const service = new UserService();

class AuthService {

  async getUser(username, password, targetCompanyId = null) {
    const user = await service.findByUsername(username);
    console.log('[AuthService] User found:', user ? user.toJSON() : 'Not found');
    if (!user) {
      throw boom.unauthorized("Las credenciales son incorrectas");
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw boom.unauthorized("Las credenciales son incorrectas");
    }

    delete user.dataValues.password;
    const flatRoles = (user.roles || []).map(role => role.name.toUpperCase());

    // Obtener roles de la tabla intermedia para determinar isSuperAdmin real
    const roleLinks = await models.RoleUser.findAll({
      where: { userId: user.id },
      include: [{ model: models.Role, as: 'role', attributes: ['name'] }]
    });
    const rolesDB = roleLinks.map(r => r.role?.name).filter(Boolean);
    const isSuperAdmin = rolesDB.some(name => name.toLowerCase() === 'superadmin');

    // Combinar roles 
    const finalRoles = [...new Set([...flatRoles, ...rolesDB.map(r => r.toUpperCase())])];

    let activeCompanyId = null;
    let tenantRole = null;

    if (isSuperAdmin) {
      // Login de SuperAdmin SIN exigir company_users
      // Opcional targetCompanyId (impersonación durante login)
      if (targetCompanyId) {
        const companyExists = await models.Company.findByPk(targetCompanyId);
        if (!companyExists) throw boom.notFound('La empresa solicitada no existe');
        activeCompanyId = parseInt(targetCompanyId);
      }
      tenantRole = 'superadmin';
    } else {
      // --- Lógica normal (SaaS): Exigir membresía activa ---
      const memberships = await models.CompanyUser.findAll({
        where: {
          userId: user.id,
          status: 'active'
        },
        include: ['company']
      });

      if (memberships.length === 0) {
        throw boom.forbidden('Usuario sin empresa asignada. Contacte al administrador.');
      }

      // Si el login trae targetCompanyId, validar que el user tenga membresía
      if (targetCompanyId) {
        const target = memberships.find(m => m.companyId === parseInt(targetCompanyId));
        if (!target) {
          throw boom.forbidden('No tienes acceso a la empresa solicitada');
        }
        activeCompanyId = target.companyId;
        tenantRole = target.role;
      } else {
        // Usar la primera company activa
        activeCompanyId = memberships[0].companyId;
        tenantRole = memberships[0].role;
      }
    }

    return { ...user.dataValues, roles: finalRoles, activeCompanyId, tenantRole, isSuperAdmin };
  }

  async impersonate(user, companyId) {
    if (!user.isSuperAdmin && !(user.roles && user.roles.includes('SUPERADMIN'))) {
      throw boom.forbidden('Solo superadmin puede impersonar');
    }
    const companyExists = await models.Company.findByPk(companyId);
    if (!companyExists) throw boom.notFound('Company no existe');

    const newUser = { ...user, activeCompanyId: parseInt(companyId), tenantRole: 'superadmin' };
    return this.signToken(newUser);
  }

  signToken(user) {
    const payload = {
      sub: user.id || user.sub, // SOPORTA user object from getUser o payload del passport
      roles: user.roles,
      companyId: user.activeCompanyId || user.companyId, // El tenant primario / DB original
      activeCompanyId: user.activeCompanyId || user.companyId,
      tenantRole: user.tenantRole,
      isSuperAdmin: user.isSuperAdmin
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
