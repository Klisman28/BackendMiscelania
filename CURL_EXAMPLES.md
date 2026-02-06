# Ejemplos cURL - Copiar y Pegar

## Autenticación (Obtener Token JWT)

Primero necesitas autenticarte para obtener un token JWT:

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "tu_email@example.com", "password": "tu_password"}'

# Guardar el token de la respuesta
# TOKEN="el_token_que_recibes"
```

---

## Crear Productos

### Producto Simple
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Computadora HP Pavilion 15",
    "sku": "HP-PAV-15-2026",
    "price": 1000,
    "cost": 850
  }'
```

### Producto con Descripción
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Mouse Logitech MX Master 3",
    "sku": "LGT-MX3-001",
    "price": 99.99,
    "cost": 65.00,
    "description": "Mouse ergonómico profesional"
  }'
```

### Producto Completo
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Teclado Mecánico Keychron K2",
    "sku": "KEY-K2-001",
    "price": 149.99,
    "cost": 95.00,
    "utility": 54.99,
    "stock": 0,
    "stockMin": 5,
    "brandId": 1,
    "subcategoryId": 1,
    "unitId": 1,
    "description": "Teclado mecánico inalámbrico"
  }'
```

---

## Buscar Productos

### Por Nombre
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/products/search?search=mouse"
```

### Por SKU
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/products/search?search=HP-PAV"
```

### Listar Todos (con paginación)
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/products?limit=20&offset=0"
```

---

## Entrada de Stock

### Entrada Básica
```bash
curl -X POST http://localhost:3000/api/v1/inventory/in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "warehouseId": 1,
    "productId": 123,
    "quantity": 20,
    "description": "Compra - factura FC-001-00045"
  }'
```

### Entrada con Usuario
```bash
curl -X POST http://localhost:3000/api/v1/inventory/in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "warehouseId": 1,
    "productId": 456,
    "quantity": 50,
    "description": "Reabastecimiento mensual",
    "userId": 1
  }'
```

---

## Consultar Stock

### Stock de Bodega
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/warehouses/1/stock?pageSize=20"
```

### Buscar Producto en Bodega
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/warehouses/1/stock?search=laptop"
```

### Con Paginación
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/warehouses/1/stock?pageIndex=1&pageSize=10"
```

---

## Movimientos de Inventario

### Todos los Movimientos
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/inventory/movements?limit=10"
```

### Por Producto
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/inventory/movements?productId=123"
```

### Por Bodega
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/inventory/movements?warehouseId=1"
```

### Solo Entradas
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/inventory/movements?type=IN"
```

### Por Rango de Fechas
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/inventory/movements?dateFrom=2026-02-01&dateTo=2026-02-28"
```

### Combinando Filtros
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/inventory/movements?warehouseId=1&type=IN&dateFrom=2026-02-01"
```

---

## Salida de Stock

### Salida Manual
```bash
curl -X POST http://localhost:3000/api/v1/inventory/out \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "warehouseId": 1,
    "productId": 123,
    "quantity": 5,
    "description": "Producto dañado - ajuste"
  }'
```

---

## Transferencias entre Bodegas

### Crear Transferencia
```bash
curl -X POST http://localhost:3000/api/v1/inventory/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fromWarehouseId": 1,
    "toWarehouseId": 2,
    "items": [
      {"productId": 123, "quantity": 10},
      {"productId": 456, "quantity": 5}
    ],
    "observation": "Transferencia a sucursal norte",
    "userId": 1
  }'
```

### Ver Detalle de Transferencia
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/inventory/transfers/15"
```

### Listar Transferencias
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/inventory/transfers?pageSize=10"
```

---

## Flujo Completo

### 1. Crear Producto
```bash
PRODUCT=$(curl -s -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Laptop Dell Inspiron",
    "sku": "DELL-INS-001",
    "price": 1200,
    "cost": 950
  }')

# Extraer ID del producto
PRODUCT_ID=$(echo $PRODUCT | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo "Producto creado con ID: $PRODUCT_ID"
```

### 2. Ingresar Stock
```bash
curl -X POST http://localhost:3000/api/v1/inventory/in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"warehouseId\": 1,
    \"productId\": $PRODUCT_ID,
    \"quantity\": 15,
    \"description\": \"Compra inicial\"
  }"
```

### 3. Verificar Stock
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/warehouses/1/stock?search=DELL"
```

### 4. Ver Movimientos
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/inventory/movements?productId=$PRODUCT_ID"
```

---

## PowerShell (Windows)

Si estás en Windows, reemplaza `$TOKEN` con `$env:TOKEN` o usa comillas diferentes:

```powershell
# Crear producto
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/products" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $env:TOKEN"} `
  -Body (@{
    name = "Computadora HP"
    sku = "HP-001"
    price = 1000
    cost = 850
  } | ConvertTo-Json) `
  -ContentType "application/json"
```

---

## Notas Importantes

1. **Autenticación**: Todos los endpoints requieren JWT (excepto /auth/login)
2. **Formato**: Usar `Content-Type: application/json` siempre
3. **Token**: Obtener vía `/api/v1/auth/login`
4. **Variables**: Reemplazar `$TOKEN`, `$PRODUCT_ID`, etc. con valores reales
5. **Roles**: Verificar que tu usuario tenga rol 'almacenero' o 'admin'

---

## Ejemplos sin Autenticación (para desarrollo)

Si desactivas temporalmente la autenticación en `routes/api.js`, puedes usar:

```bash
# Sin header de Authorization
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","sku":"TEST-001","price":100,"cost":80}'
```

**⚠️ NO recomendado para producción**
