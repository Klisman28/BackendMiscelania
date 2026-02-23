const { Strategy } = require('passport-local');
const UsersService = require('../../../services/auth/auth.service');

const service = new UsersService();

const LocalStrategy = new Strategy(
  {
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
  },
  async (req, username, password, done) => {
    try {
      // Permitir que el login envíe targetCompanyId para elegir empresa
      const targetCompanyId = req.body.companyId || null;
      const user = await service.getUser(username, password, targetCompanyId);
      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
);

module.exports = LocalStrategy;