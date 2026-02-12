// ================================================
// EXAMPLES: RBAC Implementation Patterns
// ================================================

// ================================================
// 1. QUERY EXAMPLES
// ================================================

const { models } = require('../libs/sequelize');

// ---------------------------
// Obtener usuario con roles
// ---------------------------
async function getUserWithRoles(userId) {
    const user = await models.User.findByPk(userId, {
        attributes: {
            exclude: ['password', 'createdAt', 'updatedAt']
        },
        include: [
            {
                model: models.Role,
                as: 'roles',
                attributes: ['id', 'name'],
                through: { attributes: [] }  // Excluir campos de RoleUser
            },
            {
                model: models.Employee,
                as: 'employee',
                attributes: ['id', 'fullname', 'dni']
            }
        ]
    });

    // Extraer nombres de roles
    const roleNames = user.roles.map(r => r.name);

    return {
        ...user.toJSON(),
        roleNames
    };
}

// ---------------------------
// Obtener todos los usuarios de un rol específico
// ---------------------------
async function getUsersByRole(roleName) {
    const users = await models.User.findAll({
        attributes: {
            exclude: ['password']
        },
        include: [
            {
                model: models.Role,
                as: 'roles',
                where: { name: roleName },
                attributes: ['id', 'name'],
                through: { attributes: [] }
            }
        ]
    });

    return users;
}

// ---------------------------
// Verificar si usuario tiene rol específico
// ---------------------------
async function userHasRole(userId, roleName) {
    const user = await models.User.findByPk(userId, {
        include: [
            {
                model: models.Role,
                as: 'roles',
                where: { name: roleName },
                required: false,  // LEFT JOIN para no fallar si no tiene el rol
                through: { attributes: [] }
            }
        ]
    });

    return user && user.roles.length > 0;
}

// ---------------------------
// Asignar rol a usuario
// ---------------------------
async function assignRoleToUser(userId, roleName) {
    const user = await models.User.findByPk(userId);
    if (!user) {
        throw new Error('Usuario no encontrado');
    }

    const role = await models.Role.findOne({ where: { name: roleName } });
    if (!role) {
        throw new Error(`Rol "${roleName}" no encontrado`);
    }

    // Sequelize magic method: addRole (singular) o addRoles (plural)
    await user.addRole(role);

    return { userId, roleName, assigned: true };
}

// ---------------------------
// Remover rol de usuario
// ---------------------------
async function removeRoleFromUser(userId, roleName) {
    const user = await models.User.findByPk(userId);
    if (!user) {
        throw new Error('Usuario no encontrado');
    }

    const role = await models.Role.findOne({ where: { name: roleName } });
    if (!role) {
        throw new Error(`Rol "${roleName}" no encontrado`);
    }

    await user.removeRole(role);

    return { userId, roleName, removed: true };
}

// ---------------------------
// Reemplazar todos los roles de un usuario
// ---------------------------
async function setUserRoles(userId, roleNames) {
    const user = await models.User.findByPk(userId);
    if (!user) {
        throw new Error('Usuario no encontrado');
    }

    const roles = await models.Role.findAll({
        where: { name: roleNames }
    });

    if (roles.length !== roleNames.length) {
        throw new Error('Uno o más roles no encontrados');
    }

    // Reemplaza TODOS los roles con los nuevos
    await user.setRoles(roles);

    return { userId, roleNames, updated: true };
}

// ---------------------------
// Obtener estadísticas de roles
// ---------------------------
async function getRoleStatistics() {
    const roles = await models.Role.findAll({
        include: [
            {
                model: models.RoleUser,
                as: 'roleUsers',
                attributes: []
            }
        ],
        attributes: [
            'id',
            'name',
            [models.sequelize.fn('COUNT', models.sequelize.col('roleUsers.id')), 'userCount']
        ],
        group: ['Role.id', 'Role.name']
    });

    return roles;
}

// ================================================
// 2. ROUTE EXAMPLES
// ================================================

const express = require('express');
const passport = require('passport');
const { checkRoles, authorizeRoles } = require('../middlewares/auth.handler');

const router = express.Router();

// ---------------------------
// Solo ADMIN
// ---------------------------
router.post('/users',
    passport.authenticate('jwt', { session: false }),
    checkRoles('admin'),
    async (req, res, next) => {
        try {
            // Solo admin puede crear usuarios
            const newUser = await createUser(req.body);
            res.status(201).json({ data: newUser });
        } catch (error) {
            next(error);
        }
    }
);

// ---------------------------
// ADMIN o SALES
// ---------------------------
router.post('/sales',
    passport.authenticate('jwt', { session: false }),
    checkRoles('admin', 'sales'),
    async (req, res, next) => {
        try {
            // Admin o cajero pueden crear ventas
            const newSale = await createSale(req.body);
            res.status(201).json({ data: newSale });
        } catch (error) {
            next(error);
        }
    }
);

// ---------------------------
// ADMIN, SALES o WAREHOUSE
// ---------------------------
router.get('/inventory',
    passport.authenticate('jwt', { session: false }),
    checkRoles('admin', 'sales', 'warehouse'),
    async (req, res, next) => {
        try {
            // Cualquiera puede consultar inventario
            const inventory = await getInventory(req.query);
            res.json({ data: inventory });
        } catch (error) {
            next(error);
        }
    }
);

// ---------------------------
// Sin restricción (cualquier usuario autenticado)
// ---------------------------
router.get('/profile',
    passport.authenticate('jwt', { session: false }),
    async (req, res, next) => {
        try {
            // Cualquier usuario puede ver su propio perfil
            const user = await getUserProfile(req.user.sub);
            res.json({ data: user });
        } catch (error) {
            next(error);
        }
    }
);

// ================================================
// 3. SERVICE EXAMPLES
// ================================================

class UserService {
    // ---------------------------
    // Crear usuario con roles
    // ---------------------------
    async createUserWithRoles(data) {
        const { username, password, roleNames, ...otherData } = data;

        // 1. Hash password
        const hash = await bcrypt.hash(password, 10);

        // 2. Crear usuario
        const user = await models.User.create({
            username,
            password: hash,
            ...otherData
        });

        // 3. Asignar roles si fueron proporcionados
        if (roleNames && roleNames.length > 0) {
            const roles = await models.Role.findAll({
                where: { name: roleNames }
            });

            await user.addRoles(roles);
        }

        // 4. Retornar usuario con roles
        return await models.User.findByPk(user.id, {
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: models.Role,
                    as: 'roles',
                    attributes: ['id', 'name'],
                    through: { attributes: [] }
                }
            ]
        });
    }

    // ---------------------------
    // Actualizar roles de usuario
    // ---------------------------
    async updateUserRoles(userId, roleNames) {
        const user = await models.User.findByPk(userId);
        if (!user) {
            throw boom.notFound('Usuario no encontrado');
        }

        // Eliminar roles actuales
        await models.RoleUser.destroy({
            where: { userId }
        });

        // Asignar nuevos roles
        if (roleNames && roleNames.length > 0) {
            const roles = await models.Role.findAll({
                where: { name: roleNames }
            });

            await user.addRoles(roles);
        }

        // Retornar usuario actualizado
        return await models.User.findByPk(userId, {
            attributes: { exclude: ['password'] },
            include: [{ model: models.Role, as: 'roles' }]
        });
    }

    // ---------------------------
    // Validar que usuario tenga permiso
    // ---------------------------
    async validatePermission(userId, requiredRoles) {
        const user = await models.User.findByPk(userId, {
            include: [{ model: models.Role, as: 'roles' }]
        });

        if (!user) {
            throw boom.notFound('Usuario no encontrado');
        }

        const userRoles = user.roles.map(r => r.name);
        const hasPermission = requiredRoles.some(role => userRoles.includes(role));

        if (!hasPermission) {
            throw boom.forbidden(`Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}`);
        }

        return true;
    }
}

// ================================================
// 4. TEST EXAMPLES (para referencia)
// ================================================

// Test: Crear usuario con roles
async function testCreateUserWithRoles() {
    const service = new UserService();

    const newUser = await service.createUserWithRoles({
        username: 'testuser',
        password: '123456',
        roleNames: ['sales', 'warehouse']
    });

    console.log('Usuario creado:', newUser.username);
    console.log('Roles asignados:', newUser.roles.map(r => r.name));
}

// Test: Verificar rol
async function testUserHasRole() {
    const hasAdminRole = await userHasRole(1, 'admin');
    console.log('Usuario 1 es admin?', hasAdminRole);
}

// Test: Estadísticas
async function testRoleStats() {
    const stats = await getRoleStatistics();
    stats.forEach(role => {
        console.log(`${role.name}: ${role.dataValues.userCount} usuarios`);
    });
}

// ================================================
// 5. MIDDLEWARE CUSTOM EXAMPLE
// ================================================

/**
 * Middleware para verificar que el usuario sea admin O sea el propietario del recurso
 * @param {string} resourceIdParam - Nombre del parámetro de ruta (ej: 'userId')
 */
function checkAdminOrOwner(resourceIdParam = 'id') {
    return async (req, res, next) => {
        const currentUser = req.user;
        const resourceId = parseInt(req.params[resourceIdParam]);

        // Si es admin, permitir siempre
        if (currentUser.roles.includes('admin')) {
            return next();
        }

        // Si no es admin, verificar que sea el propietario
        if (currentUser.sub === resourceId) {
            return next();
        }

        // Ni admin ni propietario
        return next(boom.forbidden('Solo puedes acceder a tus propios recursos'));
    };
}

// Uso:
router.get('/users/:id/profile',
    passport.authenticate('jwt', { session: false }),
    checkAdminOrOwner('id'),
    async (req, res, next) => {
        // Admin puede ver cualquier perfil
        // Usuario solo puede ver su propio perfil
    }
);

// ================================================
// EXPORT (si se usa como módulo)
// ================================================

module.exports = {
    getUserWithRoles,
    getUsersByRole,
    userHasRole,
    assignRoleToUser,
    removeRoleFromUser,
    setUserRoles,
    getRoleStatistics,
    UserService,
    checkAdminOrOwner
};
