# 🚀 RBAC Quick Reference Card

## 1️⃣ Check User Roles (Sequelize)

```javascript
const user = await models.User.findByPk(userId, {
  include: [{ model: models.Role, as: 'roles', through: { attributes: [] } }]
});

const roleNames = user.roles.map(r => r.name); // ['admin', 'sales']
```

## 2️⃣ Protect Routes (Express)

```javascript
const { checkRoles } = require('./middlewares/auth.handler');

// Solo admin
router.delete('/resource/:id',
  passport.authenticate('jwt', { session: false }),
  checkRoles('admin'),
  controller.delete
);

// Admin O sales
router.post('/sales',
  passport.authenticate('jwt', { session: false }),
  checkRoles('admin', 'sales'),
  controller.create
);
```

## 3️⃣ Assign/Remove Roles

```javascript
// Asignar rol
const user = await models.User.findByPk(userId);
const role = await models.Role.findOne({ where: { name: 'admin' } });
await user.addRole(role);

// Remover rol
await user.removeRole(role);

// Reemplazar todos los roles
const roles = await models.Role.findAll({ where: { name: ['admin', 'sales'] } });
await user.setRoles(roles);
```

## 4️⃣ JWT Payload

```javascript
// Ya incluye roles automáticamente
{
  "sub": 1,              // userId
  "roles": ["admin"],    // ← Array de roles
  "iat": 1234567890
}
```

## 5️⃣ Available Roles

| Role | Descripción | Permisos Típicos |
|------|-------------|------------------|
| `admin` | Administrador | Todo |
| `sales` | Cajero/Ventas | Ventas, caja |
| `warehouse` | Almacenero | Inventario, compras |

## 6️⃣ SQL Queries

```sql
-- Ver asignaciones
SELECT u.username, r.name
FROM users u
JOIN roles_users ru ON u.id = ru.user_id
JOIN roles r ON ru.role_id = r.id;

-- Ver usuarios de un rol
SELECT u.* FROM users u
JOIN roles_users ru ON u.id = ru.user_id
JOIN roles r ON ru.role_id = r.id
WHERE r.name = 'admin';
```

## 7️⃣ Middleware Custom

```javascript
// Admin O propietario del recurso
function checkAdminOrOwner(resourceParam = 'id') {
  return (req, res, next) => {
    if (req.user.roles.includes('admin')) return next();
    if (req.user.sub === parseInt(req.params[resourceParam])) return next();
    next(boom.forbidden('Acceso denegado'));
  };
}
```

## 8️⃣ Archivos Clave

| Tipo | Archivo |
|------|---------|
| **Models** | `database/models/role.model.js`<br>`database/models/role-user.model.js`<br>`database/models/user.model.js` |
| **Middleware** | `middlewares/auth.handler.js` |
| **Service** | `services/auth/auth.service.js`<br>`services/organization/users.service.js` |
| **Migration** | `database/migrations/20260211140000-improve-rbac-constraints.js` |
| **Seed** | `database/seeders/20260211140100-canonical-roles.js` |

## 9️⃣ Common Patterns

```javascript
// Verificar si tiene rol
const hasAdmin = user.roles.some(r => r.name === 'admin');

// Obtener usuarios por rol
const admins = await models.User.findAll({
  include: [{ model: models.Role, as: 'roles', where: { name: 'admin' } }]
});

// Crear usuario con roles
const service = new UsersService();
await service.create({
  username: 'newuser',
  password: '123456',
  roles: [1, 2]  // Array de role IDs
});
```

## 🔟 Testing

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"pass"}'

# Response includes roles
{
  "user": { "id": 1, "roles": ["admin"] },
  "token": "eyJ..."
}

# Use token in protected routes
curl http://localhost:3000/api/v1/protected \
  -H "Authorization: Bearer eyJ..."
```

---

📚 **Docs Completas**: Ver `RBAC_IMPLEMENTATION.md`  
💡 **Ejemplos**: Ver `RBAC_EXAMPLES.js`
