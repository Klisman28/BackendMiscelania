# API de Productos e Inventario - Documentación Completa

## Resumen

Este documento describe los endpoints implementados para la gestión de productos e inventario multi-bodega.

---

## 1. Crear Producto

### Endpoint
```
POST /api/v1/products
```

### Descripción
Crea un nuevo producto en el sistema. Soporta dos modos:
- **Modo Simple**: Solo campos básicos (name, sku, price, cost)
- **Modo Completo**: Todos los campos incluyendo brand, category, stock, etc.

### Validaciones
- ✅ SKU único (error 409 Conflict si ya existe)
- ✅ Validación Joi automática según campos enviados
- ✅ Price debe ser >= cost

### Body Mínimo (Modo Simple)

```json
{
  "name": "Computadora HP 15",
  "sku": "HP15-2026",
  "price": 1000,
  "cost": 850
}
```

**Campos opcionales con defaults:**
- `brandId`: 1
- `subcategoryId`: 1
- `unitId`: 1
- `stock`: 0
- `stockMin`: 0
- `utility`: 0
- `description`: ""
- `imageUrl`: ""
- `hasExpiration`: false

### Body Completo (Modo Avanzado)

```json
{
  "name": "Laptop Dell Inspiron 15",
  "sku": "DELL-INS-15-2026",
  "price": 1200,
  "cost": 950,
  "utility": 250,
  "stock": 0,
  "stockMin": 5,
  "brandId": 2,
  "subcategoryId": 5,
  "unitId": 1,
  "description": "Laptop para uso profesional con procesador i7",
  "imageUrl": "https://example.com/image.jpg",
  "hasExpiration": false
}
```

### Respuestas

**Éxito (201 Created):**
```json
{
  "error": false,
  "message": "Producto registrado con éxito",
  "statusCode": 201,
  "data": {
    "id": 123,
    "name": "Computadora HP 15",
    "sku": "HP15-2026",
    "slug": "computadora-hp-15",
    "price": 1000,
    "cost": 850,
    "utility": 0,
    "stock": 0,
    "stockMin": 0,
    "brandId": 1,
    "subcategoryId": 1,
    "unitId": 1
  }
}
```

**Error - SKU Duplicado (409 Conflict):**
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "El SKU \"HP15-2026\" ya está registrado en el producto: Computadora HP 15"
}
```

**Error - Validación (400 Bad Request):**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "\"price\" must be greater than or equal to ref:cost"
}
```

### Ejemplos cURL

**Crear producto simple:**
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Computadora HP 15",
    "sku": "HP15-2026",
    "price": 1000,
    "cost": 850
  }'
```

**Crear producto con descripción:**
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mouse Logitech MX Master 3",
    "sku": "LGT-MX3-001",
    "price": 99.99,
    "cost": 65.00,
    "description": "Mouse ergonómico inalámbrico profesional"
  }'
```

**Crear producto completo:**
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop Dell Inspiron 15",
    "sku": "DELL-INS-15-2026",
    "price": 1200,
    "cost": 950,
    "utility": 250,
    "stock": 0,
    "stockMin": 5,
    "brandId": 2,
    "subcategoryId": 5,
    "unitId": 1,
    "description": "Laptop para uso profesional",
    "imageUrl": "https://example.com/dell-inspiron.jpg"
  }'
```

---

## 2. Entrada de Stock (Recarga)

### Endpoint
```
POST /api/v1/inventory/in
```

### Descripción
Registra una entrada de stock a una bodega específica. Usado típicamente al recibir compras o realizar ajustes de inventario positivos.

### Validaciones
- ✅ `warehouseId` debe existir y estar activo
- ✅ `productId` debe existir
- ✅ `quantity` debe ser > 0
- ✅ Operación transaccional (atomicidad garantizada)

### Body

```json
{
  "warehouseId": 1,
  "productId": 123,
  "quantity": 20,
  "description": "Compra de computadoras - factura 001-00045",
  "userId": 1
}
```

**Campos:**
- `warehouseId` (required): ID de la bodega
- `productId` (required): ID del producto
- `quantity` (required): Cantidad a ingresar (> 0)
- `description` (optional): Descripción del movimiento
- `userId` (optional): ID del usuario que realiza la operación

### Comportamiento
1. Verifica que la bodega exista y esté activa
2. Verifica que el producto exista
3. Registra un movimiento tipo `IN` en `InventoryMovement`
4. Actualiza o crea el balance en `InventoryBalance`
   - Si existe: incrementa la cantidad
   - Si no existe: crea nuevo registro

### Respuestas

**Éxito (201 Created):**
```json
{
  "message": "Stock agregado correctamente"
}
```

**Error - Bodega no encontrada (404):**
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Bodega no encontrada"
}
```

**Error - Bodega inactiva (400):**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Bodega inactiva"
}
```

**Error - Producto no encontrado (404):**
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Producto no encontrado"
}
```

### Ejemplos cURL

**Entrada básica:**
```bash
curl -X POST http://localhost:3000/api/v1/inventory/in \
  -H "Content-Type: application/json" \
  -d '{
    "warehouseId": 1,
    "productId": 123,
    "quantity": 20,
    "description": "Compra de computadoras - factura 001-00045"
  }'
```

**Entrada con usuario específico:**
```bash
curl -X POST http://localhost:3000/api/v1/inventory/in \
  -H "Content-Type: application/json" \
  -d '{
    "warehouseId": 2,
    "productId": 456,
    "quantity": 50,
    "description": "Reabastecimiento mensual - proveedor XYZ",
    "userId": 5
  }'
```

**Ajuste de inventario:**
```bash
curl -X POST http://localhost:3000/api/v1/inventory/in \
  -H "Content-Type: application/json" \
  -d '{
    "warehouseId": 1,
    "productId": 789,
    "quantity": 5,
    "description": "Ajuste por inventario físico"
  }'
```

---

## 3. Buscar Productos

### Endpoint
```
GET /api/v1/products/search?search={term}
```

### Descripción
Busca productos por nombre o SKU. Endpoint optimizado para autocomplete y búsquedas rápidas.

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `search` | string | ✅ Sí | Término de búsqueda (busca en name y sku) |
| `limit` | number | ❌ No | Número máximo de resultados |
| `offset` | number | ❌ No | Offset para paginación |

### Respuesta

```json
{
  "error": false,
  "statusCode": 200,
  "data": [
    {
      "id": 123,
      "name": "Computadora HP 15",
      "sku": "HP15-2026",
      "slug": "computadora-hp-15",
      "price": 1000.00,
      "cost": 850.00,
      "stock": 0,
      "brand": {
        "name": "HP"
      },
      "subcategory": {
        "name": "Laptops"
      },
      "unit": {
        "symbol": "UND"
      }
    }
  ]
}
```

### Ejemplos cURL

**Buscar por nombre:**
```bash
curl "http://localhost:3000/api/v1/products/search?search=computadora"
```

**Buscar por SKU:**
```bash
curl "http://localhost:3000/api/v1/products/search?search=HP15"
```

**Buscar con límite:**
```bash
curl "http://localhost:3000/api/v1/products/search?search=laptop&limit=5"
```

**Buscar con paginación:**
```bash
curl "http://localhost:3000/api/v1/products/search?search=mouse&limit=10&offset=0"
```

---

## 4. Listar Productos (con filtros y paginación)

### Endpoint
```
GET /api/v1/products
```

### Descripción
Lista todos los productos con soporte completo para búsqueda, filtrado, ordenamiento y paginación.

### Query Parameters

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `offset` | number | Offset para paginación | 0 |
| `limit` | number | Límite de resultados | 10 |
| `search` | string | Buscar por nombre | "laptop" |
| `sortColumn` | string | Columna para ordenar | "name", "price", "stock" |
| `sortDirection` | string | Dirección del orden | "ASC", "DESC" |
| `filterField` | string | Campo a filtrar | "price", "stock", "cost" |
| `filterType` | string | Tipo de filtro | "eq", "lt", "gt", "lte", "gte" |
| `filterValue` | string/number | Valor del filtro | "100" |

### Respuesta

```json
{
  "error": false,
  "statusCode": 200,
  "data": {
    "products": [
      {
        "id": 123,
        "name": "Computadora HP 15",
        "sku": "HP15-2026",
        "price": 1000.00,
        "cost": 850.00,
        "stock": 25,
        "stockMin": 5,
        "brand": { "name": "HP" },
        "subcategory": { "name": "Laptops" },
        "unit": { "symbol": "UND" }
      }
    ],
    "total": 150
  }
}
```

### Ejemplos cURL

**Listar todos:**
```bash
curl "http://localhost:3000/api/v1/products"
```

**Con paginación:**
```bash
curl "http://localhost:3000/api/v1/products?limit=20&offset=0"
```

**Buscar y ordenar:**
```bash
curl "http://localhost:3000/api/v1/products?search=laptop&sortColumn=price&sortDirection=ASC"
```

**Filtrar por precio mayor a 500:**
```bash
curl "http://localhost:3000/api/v1/products?filterField=price&filterType=gt&filterValue=500"
```

**Filtrar stock bajo:**
```bash
curl "http://localhost:3000/api/v1/products?filterField=stock&filterType=lt&filterValue=10"
```

---

## 5. Obtener Stock de Bodega

### Endpoint
```
GET /api/v1/warehouses/:id/stock
```

### Descripción
Obtiene el inventario disponible en una bodega específica con paginación server-side.

### Path Parameters
- `id`: ID de la bodega

### Query Parameters

| Parámetro | Tipo | Descripción | Default |
|-----------|------|-------------|---------|
| `pageIndex` | number | Índice de página (1-based) | 1 |
| `pageSize` | number | Tamaño de página | 10 |
| `search` | string | Buscar por nombre o SKU del producto | - |
| `sort` | JSON string | Ordenamiento | `[{"key":"createdAt","order":"DESC"}]` |

### Respuesta

```json
{
  "data": [
    {
      "id": 1,
      "warehouseId": 1,
      "productId": 123,
      "quantity": 25,
      "createdAt": "2026-02-01T10:00:00.000Z",
      "updatedAt": "2026-02-04T15:30:00.000Z",
      "product": {
        "id": 123,
        "name": "Computadora HP 15",
        "sku": "HP15-2026",
        "price": 1000.00
      }
    }
  ],
  "total": 50
}
```

### Ejemplos cURL

**Stock de bodega 1:**
```bash
curl "http://localhost:3000/api/v1/warehouses/1/stock"
```

**Con paginación:**
```bash
curl "http://localhost:3000/api/v1/warehouses/1/stock?pageIndex=1&pageSize=20"
```

**Buscar producto en bodega:**
```bash
curl "http://localhost:3000/api/v1/warehouses/1/stock?search=laptop"
```

**Ordenar por cantidad:**
```bash
curl "http://localhost:3000/api/v1/warehouses/1/stock?sort=%5B%7B%22key%22%3A%22quantity%22%2C%22order%22%3A%22DESC%22%7D%5D"
```

---

## 6. Movimientos de Inventario (Auditoría)

### Endpoint
```
GET /api/v1/inventory/movements
```

### Descripción
Obtiene el historial de movimientos de inventario para auditoría y trazabilidad.

### Query Parameters

| Parámetro | Tipo | Descripción | Valores Permitidos |
|-----------|------|-------------|-------------------|
| `warehouseId` | number | Filtrar por bodega | - |
| `productId` | number | Filtrar por producto | - |
| `type` | string | Tipo de movimiento | IN, OUT, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT_IN, ADJUSTMENT_OUT |
| `dateFrom` | ISO date | Fecha inicio (inclusive) | 2026-02-01 |
| `dateTo` | ISO date | Fecha fin (inclusive) | 2026-02-28 |
| `limit` | number | Límite de resultados | Default: 10 |
| `offset` | number | Offset | Default: 0 |

### Respuesta

```json
[
  {
    "id": 1,
    "productId": 123,
    "warehouseId": 1,
    "type": "IN",
    "quantity": 20,
    "referenceId": null,
    "description": "Compra de computadoras - factura 001-00045",
    "userId": 1,
    "createdAt": "2026-02-04T10:30:00.000Z",
    "product": {
      "id": 123,
      "name": "Computadora HP 15",
      "sku": "HP15-2026"
    },
    "warehouse": {
      "id": 1,
      "name": "Bodega Principal",
      "code": "BP-001"
    }
  }
]
```

### Ejemplos cURL

**Todos los movimientos:**
```bash
curl "http://localhost:3000/api/v1/inventory/movements"
```

**Movimientos de una bodega:**
```bash
curl "http://localhost:3000/api/v1/inventory/movements?warehouseId=1"
```

**Movimientos de un producto:**
```bash
curl "http://localhost:3000/api/v1/inventory/movements?productId=123"
```

**Solo entradas:**
```bash
curl "http://localhost:3000/api/v1/inventory/movements?type=IN"
```

**Por rango de fechas:**
```bash
curl "http://localhost:3000/api/v1/inventory/movements?dateFrom=2026-02-01&dateTo=2026-02-28"
```

**Combinando filtros:**
```bash
curl "http://localhost:3000/api/v1/inventory/movements?warehouseId=1&productId=123&type=IN&dateFrom=2026-02-01"
```

**Con paginación:**
```bash
curl "http://localhost:3000/api/v1/inventory/movements?limit=50&offset=0"
```

---

## 7. Salida de Stock

### Endpoint
```
POST /api/v1/inventory/out
```

### Descripción
Registra una salida manual de stock (diferente de ventas). Útil para ajustes, mermas, donaciones, etc.

### Body

```json
{
  "warehouseId": 1,
  "productId": 123,
  "quantity": 5,
  "description": "Producto dañado - ajuste de inventario",
  "userId": 1
}
```

### Validaciones
- ✅ Stock suficiente en la bodega
- ✅ Operación transaccional

### Respuesta

```json
{
  "message": "Stock retirado correctamente"
}
```

### Ejemplos cURL

```bash
curl -X POST http://localhost:3000/api/v1/inventory/out \
  -H "Content-Type: application/json" \
  -d '{
    "warehouseId": 1,
    "productId": 123,
    "quantity": 5,
    "description": "Producto dañado - ajuste de inventario"
  }'
```

---

## 8. Transferencia entre Bodegas

### Endpoint
```
POST /api/v1/inventory/transfer
```

### Descripción
Transfiere productos de una bodega a otra. Crea registros de transferencia y actualiza los balances de ambas bodegas de forma transaccional.

### Body

```json
{
  "fromWarehouseId": 1,
  "toWarehouseId": 2,
  "items": [
    {
      "productId": 123,
      "quantity": 10
    },
    {
      "productId": 456,
      "quantity": 5
    }
  ],
  "observation": "Transferencia para bodega sucursal norte",
  "userId": 1
}
```

### Validaciones
- ✅ Bodegas diferentes
- ✅ Stock suficiente en origen
- ✅ Operación transaccional completa

### Respuesta

```json
{
  "id": 15,
  "fromWarehouseId": 1,
  "toWarehouseId": 2,
  "userId": 1,
  "status": "COMPLETED",
  "observation": "Transferencia para bodega sucursal norte",
  "date": "2026-02-04T17:00:00.000Z"
}
```

### Ejemplos cURL

```bash
curl -X POST http://localhost:3000/api/v1/inventory/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "fromWarehouseId": 1,
    "toWarehouseId": 2,
    "items": [
      {"productId": 123, "quantity": 10},
      {"productId": 456, "quantity": 5}
    ],
    "observation": "Transferencia para bodega sucursal norte",
    "userId": 1
  }'
```

---

## Flujo Completo de Trabajo

### Ejemplo: Recarga de productos desde una compra

```bash
# 1. Crear el producto (si no existe)
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Computadora HP 15",
    "sku": "HP15-2026",
    "price": 1000,
    "cost": 850,
    "description": "Laptop profesional HP"
  }'

# Respuesta: { "id": 123, "name": "Computadora HP 15", ... }

# 2. Registrar entrada de stock
curl -X POST http://localhost:3000/api/v1/inventory/in \
  -H "Content-Type: application/json" \
  -d '{
    "warehouseId": 1,
    "productId": 123,
    "quantity": 20,
    "description": "Compra de computadoras - factura 001-00045"
  }'

# 3. Verificar el stock en la bodega
curl "http://localhost:3000/api/v1/warehouses/1/stock?search=HP15"

# 4. Ver movimientos del producto
curl "http://localhost:3000/api/v1/inventory/movements?productId=123"
```

---

## Notas de Implementación

### Transaccionalidad
Todos los endpoints de inventario (IN, OUT, TRANSFER) utilizan transacciones de Sequelize para garantizar:
- ✅ Atomicidad: Todo se ejecuta o nada
- ✅ Consistencia de datos
- ✅ Rollback automático en caso de error

### Tipos de Movimientos
- `IN`: Entrada manual/compra
- `OUT`: Salida manual/ajuste
- `SALE`: Venta (manejado por SalesService)
- `TRANSFER_IN`: Entrada por transferencia
- `TRANSFER_OUT`: Salida por transferencia
- `ADJUSTMENT_IN`: Ajuste positivo
- `ADJUSTMENT_OUT`: Ajuste negativo

### Validaciones de Negocio
1. SKU único a nivel de base de datos y aplicación
2. Stock no puede ser negativo
3. Bodegas deben estar activas para operaciones
4. Price >= Cost en productos
5. Transferencias requieren stock suficiente en origen

---

## PowerShell Script para Testing

```powershell
# Variables
$BASE_URL = "http://localhost:3000/api/v1"

# 1. Crear Producto
$productData = @{
    name = "Computadora HP 15"
    sku = "HP15-2026"
    price = 1000
    cost = 850
} | ConvertTo-Json

$product = Invoke-RestMethod -Uri "$BASE_URL/products" -Method POST -Body $productData -ContentType "application/json"
$productId = $product.data.id

Write-Host "Producto creado con ID: $productId"

# 2. Entrada de Stock
$stockData = @{
    warehouseId = 1
    productId = $productId
    quantity = 20
    description = "Compra inicial"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BASE_URL/inventory/in" -Method POST -Body $stockData -ContentType "application/json"

Write-Host "Stock agregado correctamente"

# 3. Consultar Stock
$stock = Invoke-RestMethod -Uri "$BASE_URL/warehouses/1/stock?search=HP15"
Write-Host "Stock actual:" $stock.data[0].quantity

# 4. Ver movimientos
$movements = Invoke-RestMethod -Uri "$BASE_URL/inventory/movements?productId=$productId"
Write-Host "Movimientos registrados:" $movements.Count
```

---

## Estado de Implementación

| Endpoint | Estado | Notas |
|----------|--------|-------|
| POST /api/v1/products | ✅ Implementado | Validación SKU único con error 409 |
| POST /api/v1/inventory/in | ✅ Implementado | Transaccional, validaciones completas |
| GET /api/v1/products/search | ✅ Implementado | Búsqueda por name o SKU |
| GET /api/v1/products | ✅ Implementado | Con filtros y paginación |
| GET /api/v1/warehouses/:id/stock | ✅ Implementado | Paginación server-side |
| GET /api/v1/inventory/movements | ✅ Implementado | Filtros completos para auditoría |
| POST /api/v1/inventory/out | ✅ Implementado | Salida manual de stock |
| POST /api/v1/inventory/transfer | ✅ Implementado | Transferencia multi-item transaccional |

---

**Última actualización:** 2026-02-04
**Versión:** 1.0.0
