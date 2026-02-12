# Ejemplos curl para Alta Rápida de Productos

## Variables
```bash
export TOKEN="your-jwt-token-here"
export BASE_URL="http://localhost:3000/api/v1"
```

---

## Test 1: Alta Rápida Básica (6 campos mínimos)

**Request:**
```bash
curl -X POST $BASE_URL/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Computadora HP 15",
    "sku": "HP15-2026",
    "cost": 850,
    "price": 1000,
    "subcategoryId": 1,
    "unitId": 1
  }'
```

**Resultado esperado:**
- Status: 201 Created
- brandId: ID de "GENÉRICA" (creada automáticamente)
- utility: 150 (1000 - 850)
- stock: 0
- stockMin: 0

---

## Test 2: Alta Rápida con Marca Específica

**Request:**
```bash
curl -X POST $BASE_URL/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Mouse Logitech M185",
    "sku": "LOG-M185",
    "cost": 15.50,
    "price": 25.00,
    "subcategoryId": 1,
    "unitId": 1,
    "brandId": 2,
    "description": "Mouse inalámbrico"
  }'
```

**Resultado esperado:**
- Status: 201 Created
- brandId: 2 (proporcionado)
- utility: 9.50 (25.00 - 15.50)
- stock: 0
- stockMin: 0

---

## Test 3: Modo Completo (Todos los campos)

**Request:**
```bash
curl -X POST $BASE_URL/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Teclado Mecánico Razer BlackWidow",
    "sku": "RAZ-KB-001",
    "cost": 120.00,
    "price": 180.00,
    "utility": 60.00,
    "stock": 15,
    "stockMin": 5,
    "brandId": 3,
    "subcategoryId": 1,
    "unitId": 1,
    "description": "Teclado mecánico RGB con switches Cherry MX",
    "imageUrl": "https://example.com/razer-kb.jpg"
  }'
```

**Resultado esperado:**
- Status: 201 Created
- Todos los campos como fueron enviados
- No se aplican defaults

---

## Test 4: Error - SKU Duplicado

**Request:**
```bash
curl -X POST $BASE_URL/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Producto Duplicado",
    "sku": "HP15-2026",
    "cost": 100,
    "price": 150,
    "subcategoryId": 1,
    "unitId": 1
  }'
```

**Resultado esperado:**
- Status: 409 Conflict
- Error: "El SKU 'HP15-2026' ya está registrado..."

---

## Test 5: Error - Price menor que Cost

**Request:**
```bash
curl -X POST $BASE_URL/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Producto Error Precio",
    "sku": "ERROR-PRICE-01",
    "cost": 100,
    "price": 50,
    "subcategoryId": 1,
    "unitId": 1
  }'
```

**Resultado esperado:**
- Status: 400 Bad Request
- Error de validación Joi: "price must be greater than or equal to ref:cost"

---

## Test 6: Error - Campos Requeridos Faltantes

**Request:**
```bash
curl -X POST $BASE_URL/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Producto Incompleto",
    "sku": "INCOMPLETE-01",
    "cost": 100
  }'
```

**Resultado esperado:**
- Status: 400 Bad Request
- Error: campos requeridos faltantes (price, subcategoryId, unitId)

---

## Test 7: Alta Rápida con Stock Personalizado

**Request:**
```bash
curl -X POST $BASE_URL/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Monitor Samsung 24 pulgadas",
    "sku": "SAM-MON-24",
    "cost": 200,
    "price": 280,
    "subcategoryId": 1,
    "unitId": 1,
    "stock": 8,
    "stockMin": 2
  }'
```

**Resultado esperado:**
- Status: 201 Created
- brandId: ID de "GENÉRICA"
- utility: 80 (280 - 200)
- stock: 8 (proporcionado)
- stockMin: 2 (proporcionado)

---

## Test 8: Listar Productos (verificar creación)

**Request:**
```bash
curl -X GET "$BASE_URL/products?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:**
- Lista de productos creados
- Incluye marca "GENÉRICA" en los creados sin brandId

---

## Test 9: Buscar por SKU

**Request:**
```bash
curl -X GET "$BASE_URL/products/search?search=HP15-2026" \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:**
- Producto con SKU "HP15-2026"
- Con todos los detalles incluyendo brand, subcategory, unit

---

## Test 10: Verificar Marca Genérica Creada

**Request:**
```bash
curl -X GET "$BASE_URL/brands?search=GENÉRICA" \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:**
- Marca "GENÉRICA" con code "GEN"
- Creada automáticamente tras primer producto en modo quick sin brandId

---

## Notas Importantes

1. **Token**: Reemplazar `$TOKEN` con un JWT válido obtenido del login
2. **IDs**: Ajustar `subcategoryId`, `unitId`, `brandId` según tu BD
3. **SKUs**: Deben ser únicos - cambiar en tests repetidos
4. **Orden**: Ejecutar Test 1 primero para crear marca "GENÉRICA"

---

## Respuesta de Éxito Típica

```json
{
  "data": {
    "id": 123,
    "name": "Computadora HP 15",
    "sku": "HP15-2026",
    "slug": "computadora-hp-15",
    "cost": "850.00",
    "price": "1000.00",
    "utility": "150.00",
    "stock": 0,
    "stockMin": 0,
    "expirationDate": null,
    "imageUrl": null,
    "brandId": 1,
    "subcategoryId": 1,
    "unitId": 1,
    "brand": {
      "id": 1,
      "name": "GENÉRICA"
    },
    "subcategory": {
      "id": 1,
      "name": "General",
      "categoryId": 1
    },
    "unit": {
      "id": 1,
      "symbol": "Und"
    }
  },
  "message": "Producto registrado con éxito"
}
```
