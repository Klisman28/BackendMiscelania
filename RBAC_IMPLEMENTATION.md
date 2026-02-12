# Implementación de RBAC (Role-Based Access Control)

Mejoras implementadas al sistema de autenticación y autorización basado en roles.

---

## 📋 Cambios Realizados

### 1. **Modelos Actualizados con Constraints Correctas**

#### `Role` Model (`database/models/role.model.js`)
```javascript
const RoleSchema = {
    id: {
        allowNull: false,  // ✅ Cambiado de true a false
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    name: {
        allowNull: false,  // ✅ Cambiado de true a false
        type: DataTypes.STRING,
        unique: true,       // ✅ Ya estaba, mantenido
    }
}
```

**Asociaciones agregadas:**
- `Role.belongsToMany(User)` through `RoleUser`
- `Role.hasMany(RoleUser)` para queries directas

#### `RoleUser` Model (`database/models/role-user.model.js`)
```javascript
const RoleUserSchema = {
    roleId: {
        allowNull: false,  // ✅ Cambiado de true a false
        // ...
    },
    userId: {
        allowNull: false,  // ✅ Cambiado de true a false
        // ...
    },
    createdAt: {          // ✅ NUEVO
        allowNull: false,
        type: DataTypes.DATE,
        field: 'created_at'
    },
    updatedAt: {          // ✅ NUEVO
        allowNull: false,
        type: DataTypes.DATE,
        field: 'updated_at'
    }
}
```

**Asociaciones agregadas:**
- `RoleUser.belongsTo(Role)`
- `RoleUser.belongsTo(User)`

**Timestamps:** Ahora habilitados (`timestamps: true`)

#### `User` Model (`database/models/user.model.js`)
**Asociaciones agregadas:**
- `User.hasMany(RoleUser)` para queries directas

---

### 2. **Migration para Constraints e Índices**

**Archivo:** `database/migrations/20260211140000-improve-rbac-constraints.js`

**Cambios aplicados:**
1. ✅ Agregar `created_at` y `updated_at` a `roles_users`
2. ✅ Cambiar `role_id` y `user_id` a `NOT NULL`
3. ✅ Índice único compuesto: `UNIQUE (role_id, user_id)` previene asignaciones duplicadas
4. ✅ Índices individuales: `idx_role_id`, `idx_user_id` para mejor performance
5. ✅ Hacer `name` en tabla `roles` NOT NULL y unique

**Ejecutar migration:**
```bash
npm run migrations:run
```

---

### 3. **Seed de Roles Canónicos**

**Archivo:** `database/seeders/20260211140100-canonical-roles.js`

**Roles creados:**
- ✅ `admin` - Administrador del sistema
- ✅ `sales` - Ventas/Cajero
- ✅ `warehouse` - Almacenero

**Prevención de duplicados:** El seed verifica roles existentes antes de insertar.

**Ejecutar seeds:**
```bash
npm run sd:run
```

---

### 4. **Middleware Mejorado para Autorización**

**Archivo:** `middlewares/auth.handler.js`

**Función:** `checkRoles(...roles)` o `authorizeRoles(...roles)`

**Características:**
- ✅ Verifica que el usuario tenga al menos uno de los roles especificados
- ✅ Maneja correctamente casos sin roles asignados
- ✅ Mensajes de error descriptivos
- ✅ Documentación JSDoc completa

**Ejemplo de uso:**
```javascript
const { checkRoles } = require('./middlewares/auth.handler');

// Solo admin
router.delete('/products/:id', 
  passport.authenticate('jwt', { session: false }),
  checkRoles('admin'),
  productsController.delete
);

// Admin o sales
router.post('/sales', 
  passport.authenticate('jwt', { session: false }),
  checkRoles('admin', 'sales'),
  salesController.create
);

// Admin, sales o warehouse
router.get('/inventory', 
  passport.authenticate('jwt', { session: false }),
  checkRoles('admin', 'sales', 'warehouse'),
  inventoryController.list
);
```

---

### 5. **Auth Service con Roles en JWT**

**Archivo:** `services/auth/auth.service.js`

**Ya implementado correctamente:**
```javascript
async getUser(username, password) {
  const user = await service.findByUsername(username);
  // ...
  const flatRoles = user.roles.map(role => role.name);
  return {...user.dataValues, roles: flatRoles};
}

signToken(user) {
  const payload = {
    sub: user.id,
    roles: user.roles  // ✅ Roles incluidos en JWT
  }
  const token = jwt.sign(payload, config.jwtSecret);
  return { user, token };
}
```

**Response de login:**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "roles": ["admin", "sales"]
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🔍 Consultas Sequelize Útiles

### Obtener usuario con roles
```javascript
const user = await models.User.findByPk(userId, {
  include: [
    {
      model: models.Role,
      as: 'roles',
      attributes: ['id', 'name'],
      through: { attributes: [] } // Excluir campos de la tabla pivote
    }
  ]
});

// Extraer solo nombres de roles
const roleNames = user.roles.map(r => r.name);
// ['admin', 'sales']
```

### Obtener usuarios por rol
```javascript
const admins = await models.User.findAll({
  include: [
    {
      model: models.Role,
      as: 'roles',
      where: { name: 'admin' },
      through: { attributes: [] }
    }
  ]
});
```

### Asignar rol a usuario
```javascript
const user = await models.User.findByPk(userId);
const role = await models.Role.findOne({ where: { name: 'admin' } });
await user.addRole(role);
```

### Remover todos los roles de un usuario
```javascript
const user = await models.User.findByPk(userId);
await user.setRoles([]); // O await user.removeRoles()
```

### Verificar si usuario tiene rol específico
```javascript
const user = await models.User.findByPk(userId, {
  include: [{ model: models.Role, as: 'roles' }]
});

const isAdmin = user.roles.some(r => r.name === 'admin');
```

---

## 🧪 Testing

### 1. Verificar roles en base de datos
```sql
SELECT * FROM roles;
```

**Resultado esperado:**
```
+----+----------+
| id | name     |
+----+----------+
|  1 | admin    |
|  2 | cajero   |
|  3 | almacenero |
|  4 | gerente  |
|  5 | sales    |
|  6 | warehouse|
+----+----------+
```

### 2. Verificar asignaciones de roles
```sql
SELECT 
  u.id, 
  u.username, 
  r.name as role_name
FROM users u
JOIN roles_users ru ON u.id = ru.user_id
JOIN roles r ON ru.role_id = r.id;
```

### 3. Test de Login con Roles
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-password"
  }'
```

**Response esperada:**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "status": "Activo",
    "roles": ["admin"],
    "employee": {
      "fullname": "Admin User",
      "id": 1
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 4. Test de Autorización
```bash
# Obtener JWT del login anterior
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Intentar acceder a endpoint protegido
curl -X GET http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Mapeo de Roles a Funcionalidades

### `admin`
- ✅ Acceso completo a todos los módulos
- ✅ Gestión de usuarios y roles
- ✅ Configuración del sistema
- ✅ Reportes avanzados
- ✅ Eliminación de registros críticos

### `sales` (equivalente a `cajero`)
- ✅ Gestión de ventas
- ✅ Aperturas de caja
- ✅ Movimientos de efectivo
- ✅ Emisión de boletas/facturas
- ✅ Consulta de productos
- ❌ Compras
- ❌ Configuración

### `warehouse` (equivalente a `almacenero`)
- ✅ Gestión de inventario
- ✅ Compras
- ✅ Transferencias entre bodegas
- ✅ Productos (crear/editar)
- ✅ Categorías y marcas
- ❌ Ventas
- ❌ Aperturas de caja

---

## 🔒 Mejores Prácticas de Seguridad

### 1. **Siempre validar roles en backend**
```javascript
// ❌ MAL: Solo confiar en el frontend
if (userRole === 'admin') {
  // Mostrar botón eliminar
}

// ✅ BIEN: Backend valida con middleware
router.delete('/products/:id',
  passport.authenticate('jwt', { session: false }),
  checkRoles('admin'),  // ← Validación en backend
  controller.delete
);
```

### 2. **Principio de mínimo privilegio**
```javascript
// ❌ MAL: Dar acceso a todos
checkRoles('admin', 'sales', 'warehouse', 'gerente')

// ✅ BIEN: Solo roles necesarios
checkRoles('admin')  // Solo admin puede eliminar
```

### 3. **Auditoría de asignaciones de roles**
```javascript
// Log cuando se asignan/remueven roles
await user.addRole(role);
console.log(`[AUDIT] Role ${role.name} assigned to user ${user.id} by ${req.user.id}`);
```

---

## 🚀 Próximos Pasos (Opcional)

1. **Permisos granulares**: Implementar tabla `permissions` y relación `role_permissions`
2. **Roles jerárquicos**: Admin > Manager > User
3. **Roles dinámicos**: Permitir crear roles desde UI
4. **Auditoría**: Tabla `role_assignments_log` para tracking
5. **Rate limiting por rol**: Limits diferentes según rol

---

## 📚 Archivos Modificados

| Archivo | Descripción |
|---------|-------------|
| `database/models/role.model.js` | Constraints + Asociaciones |
| `database/models/role-user.model.js` | Constraints + Timestamps + Asociaciones |
| `database/models/user.model.js` | Asociación hasMany |
| `database/models/index.js` | Registrar asociaciones |
| `database/migrations/20260211140000-improve-rbac-constraints.js` | Migration nueva |
| `database/seeders/20260211140100-canonical-roles.js` | Seed canónico |
| `middlewares/auth.handler.js` | Mejorado + Documentado |

---

## ✅ Checklist de Implementación

- [x] Modelos con constraints correctas
- [x] Asociaciones bidireccionales completas
- [x] Migration para constraints e índices
- [x] Seed de roles canónicos
- [x] Middleware `checkRoles()` documentado
- [x] Auth service incluye roles en JWT
- [x] Users service carga roles correctamente
- [x] Documentación completa

---

**Implementado por:** Antigravity AI Assistant  
**Fecha:** 2026-02-11  
**Versión:** 2.0.0
