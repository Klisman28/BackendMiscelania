# API Productos e Inventario - Comandos Rápidos

## 🚀 Ejemplos cURL - Comandos Esenciales

### 1. Crear Producto (Modo Simple)

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

**Respuesta esperada:**
```json
{
  "error": false,
  "message": "Producto registrado con éxito",
  "statusCode": 201,
  "data": {
    "id": 123,
    "name": "Computadora HP 15",
    "sku": "HP15-2026",
    "price": 1000,
    "cost": 850
  }
}
```

---

### 2. Entrada de Stock (Recarga)

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

**Respuesta:**
```json
{
  "message": "Stock agregado correctamente"
}
```

---

### 3. Buscar Productos

```bash
# Por nombre o SKU
curl "http://localhost:3000/api/v1/products/search?search=HP15"
```

---

### 4. Ver Stock de Bodega

```bash
curl "http://localhost:3000/api/v1/warehouses/1/stock?pageSize=20"
```

---

### 5. Movimientos de Inventario (Auditoría)

```bash
# Todos los movimientos
curl "http://localhost:3000/api/v1/inventory/movements?limit=10"

# Por producto específico
curl "http://localhost:3000/api/v1/inventory/movements?productId=123"

# Por bodega
curl "http://localhost:3000/api/v1/inventory/movements?warehouseId=1"

# Solo entradas
curl "http://localhost:3000/api/v1/inventory/movements?type=IN"

# Por rango de fechas
curl "http://localhost:3000/api/v1/inventory/movements?dateFrom=2026-02-01&dateTo=2026-02-28"
```

---

### 6. Salida de Stock (Ajuste Manual)

```bash
curl -X POST http://localhost:3000/api/v1/inventory/out \
  -H "Content-Type: application/json" \
  -d '{
    "warehouseId": 1,
    "productId": 123,
    "quantity": 5,
    "description": "Producto dañado - ajuste"
  }'
```

---

### 7. Transferencia entre Bodegas

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
    "observation": "Transferencia para sucursal norte",
    "userId": 1
  }'
```

---

## 📋 Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/v1/products` | Crear producto (simple o completo) |
| `GET` | `/api/v1/products` | Listar productos con filtros |
| `GET` | `/api/v1/products/search` | Buscar por nombre/SKU |
| `GET` | `/api/v1/products/:id` | Obtener producto por ID |
| `PUT` | `/api/v1/products/:id` | Actualizar producto |
| `DELETE` | `/api/v1/products/:id` | Eliminar producto |
| `POST` | `/api/v1/inventory/in` | Entrada de stock |
| `POST` | `/api/v1/inventory/out` | Salida de stock |
| `POST` | `/api/v1/inventory/transfer` | Transferencia entre bodegas |
| `GET` | `/api/v1/inventory/movements` | Historial de movimientos |
| `GET` | `/api/v1/inventory/transfers` | Listar transferencias |
| `GET` | `/api/v1/inventory/transfers/:id` | Detalle de transferencia |
| `GET` | `/api/v1/warehouses/:id/stock` | Stock de bodega |
| `GET` | `/api/v1/warehouses` | Listar bodegas |

---

## 🎯 Flujo Completo: Recarga de Productos

### Paso 1: Crear el producto
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop Dell Inspiron",
    "sku": "DELL-INS-001",
    "price": 1200,
    "cost": 950
  }'
```

### Paso 2: Ingresar stock a bodega
```bash
curl -X POST http://localhost:3000/api/v1/inventory/in \
  -H "Content-Type: application/json" \
  -d '{
    "warehouseId": 1,
    "productId": 124,
    "quantity": 15,
    "description": "Compra mensual - factura FC-002"
  }'
```

### Paso 3: Verificar stock
```bash
curl "http://localhost:3000/api/v1/warehouses/1/stock?search=DELL"
```

### Paso 4: Ver historial de movimientos
```bash
curl "http://localhost:3000/api/v1/inventory/movements?productId=124"
```

---

## ⚡ Scripts de Testing

### PowerShell (Windows)
```powershell
.\test-product-inventory.ps1
```

### Bash (Linux/Mac)
```bash
chmod +x test-product-inventory.sh
./test-product-inventory.sh
```

---

## 🔍 Validaciones Implementadas

- ✅ SKU único (error 409 si duplicado)
- ✅ Price >= Cost
- ✅ Quantity > 0 en entradas/salidas
- ✅ Stock suficiente para salidas/transferencias
- ✅ Bodegas activas
- ✅ Productos y bodegas existen
- ✅ Operaciones transaccionales

---

## 📖 Documentación Completa

Ver archivo: **[PRODUCT_INVENTORY_API.md](./PRODUCT_INVENTORY_API.md)**

---

## 🐛 Errores Comunes

### Error 409 - SKU Duplicado
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "El SKU \"HP15-2026\" ya está registrado en el producto: Computadora HP 15"
}
```

### Error 400 - Stock Insuficiente
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Stock insuficiente. Disponible: 5"
}
```

### Error 404 - Producto No Encontrado
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Producto no encontrado"
}
```

---

**Última actualización:** 2026-02-04
