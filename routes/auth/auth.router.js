const express = require('express');
const passport = require('passport');
const { success } = require('../response');

const AuthService = require('../../services/auth/auth.service');

const router = express.Router();
const service = new AuthService();

router.post('/sign-in',
  passport.authenticate('local', { session: false }),
  async (req, res, next) => {
    try {
      const user = req.user;
      console.log('Data de inicio', user);

      const data = service.signToken(user);
      success(res, data, "Autenticación exitoso");
    } catch (error) {
      next(error);
    }
  }
);

// router.post('/recovery',
//   async (req, res, next) => {
//     try {
//       const { email } = req.body;
//       const rta = await service.sendRecovery(email);
//       res.json(rta);
//     } catch (error) {
//       next(error);
//     }
//   }
// );

router.post('/change-password',
  async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;
      const rta = await service.changePassword(token, newPassword);
      res.json(rta);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/impersonate',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const { companyId } = req.body;
      if (!companyId) throw require('@hapi/boom').badRequest('companyId es requerido');
      const data = await service.impersonate(req.user, companyId);
      success(res, data, "Impersonación exitosa");
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
