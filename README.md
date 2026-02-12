# Backend POS Multi-Bodega

Sistema POS (Point of Sale) con gestión multi-bodega.

## Características Principales

- **Gestión de Productos**: CRUD completo con alta rápida de productos
- **Movimientos de Caja**: Registro de ingresos/egresos en aperturas
- **Multi-bodega**: Sistema de inventario con múltiples almacenes
- **Transacciones**: Ventas, compras, aperturas de caja
- **Catálogos**: Marcas, categorías, subcategorías, propiedades

## Documentación Disponible

- [**Alta Rápida de Productos**](./QUICK_PRODUCT_CREATION.md) - Creación rápida con campos mínimos
- [**Movimientos de Caja**](./CASH_MOVEMENTS_IMPLEMENTATION.md) - Ingresos/egresos en aperturas
- [**Paginación**](./PAGINATION_QUICK_REFERENCE.md) - Referencia de paginación
- [**Inventario de Productos**](./PRODUCT_INVENTORY_API.md) - API de inventario multi-bodega

## Requisitos

- Node.js >= 18.x
- MySQL o PostgreSQL
- npm o yarn

## Instalación

```bash
# Clonar repositorio
git clone <repo-url>

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar migraciones
npm run migrations:run

# Modo desarrollo
npm run dev

# Modo producción
npm start
```

## Scripts Disponibles

```bash
npm run dev                  # Desarrollo con nodemon
npm run start                # Producción
npm run migrations:run       # Ejecutar migraciones
npm run migrations:revert    # Revertir última migración
npm run migrations:delete    # Revertir todas las migraciones
npm run lint                 # ESLint
```

## Estructura del Proyecto

```
.
├── config/              # Configuraciones
├── database/
│   ├── migrations/      # Migraciones de BD
│   └── models/          # Modelos Sequelize
├── middlewares/         # Middlewares Express
├── routes/              # Rutas de la API
│   ├── auth/
│   ├── catalogue/
│   ├── client/
│   ├── organization/
│   ├── transaction/
│   └── api.js
├── schemas/             # Validaciones Joi
├── services/            # Lógica de negocio
└── utils/               # Utilidades
```

## API Endpoints Principales

### Autenticación
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`

### Productos
- `GET /api/v1/products` - Listar productos
- `POST /api/v1/products` - Crear producto (soporta modo rápido)
- `GET /api/v1/products/:id` - Obtener producto
- `PUT /api/v1/products/:id` - Actualizar producto
- `DELETE /api/v1/products/:id` - Eliminar producto

### Aperturas de Caja
- `GET /api/v1/openings` - Listar aperturas
- `POST /api/v1/openings` - Crear apertura
- `GET /api/v1/openings/:id/summary` - Resumen de apertura
- `POST /api/v1/openings/:id/movements` - Registrar movimiento
- `GET /api/v1/openings/:id/movements` - Listar movimientos

### Inventario
- `GET /api/v1/inventory/warehouses/:id/products` - Productos por bodega
- `POST /api/v1/inventory/movements` - Registrar movimiento de inventario

## Variables de Entorno

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pos_db
DB_USER=root
DB_PASSWORD=

# JWT
JWT_SECRET=your-secret-key

# Aplicación
PORT=3000
NODE_ENV=development
```

## Licencia

MIT

## Autor

Ccoropuna