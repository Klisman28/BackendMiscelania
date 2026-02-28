# Separación Tienda (POS) vs Bodega (Almacén)

## Resumen

Se agregó un campo `type` a la tabla `warehouses` para diferenciar entre:

| Tipo | Descripción | Puede vender |
|------|-------------|:------------:|
| `tienda` | Punto de venta (POS), muestra productos al público | ✅ |
| `bodega` | Almacén de respaldo / depósito | ❌ |

## Cambios realizados

### 1. Migración
**Archivo:** `database/migrations/20260226000000-add-type-to-warehouses.js`
- Agrega columna `type` (STRING(20), NOT NULL, default `'bodega'`) a la tabla `warehouses`
- Agrega índice `idx_warehouses_type` para filtrado rápido
- Los warehouses existentes quedan como `'bodega'` por defecto (backward-compatible)

### 2. Modelo Warehouse
**Archivo:** `database/models/warehouse.model.js`
- Campo `type` con validación `isIn: ['tienda', 'bodega']`

### 3. Schema Joi
**Archivo:** `schemas/organization/warehouse.schema.js`
- `type` agregado a `createWarehouseSchema` y `updateWarehouseSchema`
- Nuevo `queryWarehouseSchema` para filtro GET

### 4. Servicio de Warehouses
**Archivo:** `services/organization/warehouses.service.js`
- `find(companyId, query)` ahora acepta `?type=tienda` y `?active=true`
- `findStores(companyId)` → solo tiendas activas
- `getStoreProducts(companyId, query)` → productos con stock > 0 en tiendas (para "Nueva Venta")

### 5. Router de Warehouses
**Archivo:** `routes/organization/warehouses.router.js`
- `GET /warehouses` → acepta `?type=tienda|bodega`
- `GET /warehouses/stores` → solo tiendas activas
- `GET /warehouses/stores/products` → productos vendibles con stock en tiendas

### 6. Servicio de Ventas (Validación)
**Archivo:** `services/transaction/sales.service.js`
- Al crear venta, valida que `warehouseId` sea de tipo `tienda`
- Si es `bodega`, retorna error 400: `Solo se pueden registrar ventas desde ubicaciones tipo "tienda"`

---

## Nuevos Endpoints

### `GET /api/v1/warehouses?type=tienda`
Lista solo las tiendas (útil para dropdown en frontend).

### `GET /api/v1/warehouses/stores`
Shortcut: devuelve solo tiendas activas.

### `GET /api/v1/warehouses/stores/products`
**Para "Nueva Venta"**: devuelve productos con stock > 0 en cualquier tienda activa.

Query params:
- `search` — buscar por nombre o SKU
- `pageIndex` — página (default 1)
- `pageSize` — tamaño (default 50, max 100)

Response:
```json
{
  "data": [
    {
      "productId": 5,
      "product": { "id": 5, "name": "Coca Cola 600ml", "sku": "CC600", "price": 15.00, ... },
      "warehouseId": 2,
      "warehouse": { "id": 2, "name": "Tienda Centro", "type": "tienda" },
      "storeStock": 48
    }
  ],
  "total": 150,
  "meta": { "pageIndex": 1, "pageSize": 50 }
}
```

---

## Flujo de trabajo típico

1. **Admin crea ubicaciones:**
   ```json
   POST /api/v1/warehouses
   { "name": "Tienda Centro", "type": "tienda", "address": "Av. Principal 123" }
   
   POST /api/v1/warehouses
   { "name": "Bodega Norte", "type": "bodega", "address": "Calle Industrial 45" }
   ```

2. **Transferir productos de bodega a tienda:**
   ```json
   POST /api/v1/inventory/transfer
   { "fromWarehouseId": 1, "toWarehouseId": 2, "items": [...] }
   ```

3. **"Nueva Venta" carga productos de tienda:**
   ```
   GET /api/v1/warehouses/stores/products?search=coca
   ```

4. **Registrar venta (solo desde tienda):**
   ```json
   POST /api/v1/sales
   { "warehouseId": 2, "products": [...], ... }
   ```
   - ✅ Si warehouseId=2 es tipo `tienda` → OK
   - ❌ Si warehouseId=1 es tipo `bodega` → Error 400

---

## Compatibilidad

- **Warehouses existentes** quedan como `bodega` (default)
- Para marcar un warehouse existente como tienda:
  ```
  PATCH /api/v1/warehouses/1
  { "type": "tienda" }
  ```
- **Ventas existentes** (históricas) no se tocan. Solo nuevas ventas pasan por la validación.
