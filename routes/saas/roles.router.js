const express = require('express');
const passport = require('passport');
const { requireSuperAdmin } = require('../../middlewares/auth.handler');
const { success } = require('../response');
const RolesService = require('../../services/saas/roles.service');

const router = express.Router();
const service = new RolesService();

// Todas las rutas protegidas para SuperAdmin
router.use(passport.authenticate('jwt', { session: false }), requireSuperAdmin);

router.get('/', async (req, res, next) => {
    try {
        const roles = await service.find();
        success(res, roles, 'Listado de roles');
    } catch (error) {
        next(error);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) throw require('@hapi/boom').badRequest('El nombre del rol es requerido');

        const newRole = await service.create({ name });
        success(res, newRole, 'Rol creado exitosamente', 201);
    } catch (error) {
        next(error);
    }
});

router.patch('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name) throw require('@hapi/boom').badRequest('El nombre del rol es requerido');

        const updatedRole = await service.update(id, { name });
        success(res, updatedRole, 'Rol actualizado exitosamente');
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await service.delete(id);
        success(res, result, 'Rol eliminado exitosamente');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
