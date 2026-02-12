# Alta Rápida de Productos (Quick Product Creation)

Se ha implementado un modo de "alta rápida" para el endpoint `POST /api/v1/products` que permite crear productos con campos mínimos, ideal para el flujo de "Recargar Stock".

## Modo Quick vs Modo Completo

### Modo Quick (Alta Rápida)
**Solo requiere 6 campos:**
- `name` (mínimo 4 caracteres)
- `sku` (requerido, único)
- `cost` (requerido)
- `price` (requerido, debe ser >= cost)
- `subcategoryId` (requerido)
- `unitId` (requerido)

**Campos opcionales con defaults automáticos:**
- `brandId` → Si no viene, se asigna/crea marca "GENÉRICA"
- `utility` → Si no viene, se calcula como: `price - cost`
- `stock` → Si no viene, se asigna `0`
- `stockMin` → Si no viene, se asigna `0`
- `description` → Opcional
- `imageUrl` → Opcional
- `hasExpiration` → Opcional
- `expirationDate` → Opcional

### Modo Completo (Original)
Requiere todos los campos originales: `brandId`, `subcategoryId`, `unitId`, `utility`, `stock`, `stockMin`, etc.

## Estrategia de Validación

El endpoint usa una estrategia de validación dual:

1. **Primero** intenta validar con `createQuickProductSchema`
2. Si falla, intenta con `createProductSchema` (modo completo)
3. Si ambos fallan, retorna el error del schema completo

Esto mantiene **total compatibilidad** con el endpoint existente.

## Archivos Modificados

1. **Schema**: `schemas/catalogue/products.schema.js`
   - Agregado `createQuickProductSchema`

2. **Router**: `routes/catalogue/products.router.js`
   - Actualizada lógica de validación en `POST /`
   - Pasa flag `isQuickMode` al service

3. **Service**: `services/catalogue/products.service.js`
   - Método `create()` ahora acepta segundo parámetro `isQuickMode`
   - Si `isQuickMode === true`:
     - Busca/crea marca "GENÉRICA" si no viene `brandId`
     - Calcula `utility = price - cost` si no viene
     - Asigna `stock = 0` y `stockMin = 0` si no vienen
   - Retorna producto con includes de `brand`, `subcategory`, `unit`

## Validaciones Mantenidas

- **SKU único**: Error 409 si el SKU ya existe
- **Price >= Cost**: Validado por Joi
- **SubcategoryId y UnitId**: Deben existir en DB (FK constraint)

## Ejemplos de Uso

### Ejemplo 1: Alta Rápida (Modo Quick)
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{token}}" \
  -d '{
    "name": "Computadora HP 15",
    "sku": "HP15-2026",
    "cost": 850,
    "price": 1000,
    "subcategoryId": 3,
    "unitId": 1
  }'
```

**Resultado:**
- `brandId` → Asignado a marca "GENÉRICA" (creada automáticamente si no existe)
- `utility` → Calculado como `1000 - 850 = 150`
- `stock` → `0`
- `stockMin` → `0`

### Ejemplo 2: Alta con Marca Específica
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{token}}" \
  -d '{
    "name": "Mouse Logitech M185",
    "sku": "LOG-M185",
    "cost": 15.50,
    "price": 25.00,
    "subcategoryId": 5,
    "unitId": 1,
    "brandId": 7
  }'
```

**Resultado:**
- `brandId` → `7` (Logitech)
- `utility` → Calculado como `25.00 - 15.50 = 9.50`
- `stock` → `0`
- `stockMin` → `0`

### Ejemplo 3: Modo Completo (Todo explicito)
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{token}}" \
  -d '{
    "name": "Teclado Mecánico Razer",
    "sku": "RAZ-KB-001",
    "cost": 120.00,
    "price": 180.00,
    "utility": 60.00,
    "stock": 15,
    "stockMin": 5,
    "brandId": 8,
    "subcategoryId": 4,
    "unitId": 1,
    "description": "Teclado mecánico RGB"
  }'
```

## Respuesta del API

```json
{
  "data": {
    "id": 123,
    "name": "Computadora HP 15",
    "sku": "HP15-2026",
    "cost": "850.00",
    "price": "1000.00",
    "utility": "150.00",
    "stock": 0,
    "stockMin": 0,
    "brandId": 1,
    "subcategoryId": 3,
    "unitId": 1,
    "brand": {
      "id": 1,
      "name": "GENÉRICA"
    },
    "subcategory": {
      "id": 3,
      "name": "Laptops",
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

## Notas Importantes

1. **Marca "GENÉRICA"**: Se crea una sola vez con `code: 'GEN'`. Todas las creaciones rápidas sin `brandId` usarán esta misma marca.

2. **Utility**: Se calcula como diferencia absoluta (`price - cost`), no como porcentaje. Esto es consistente con el modelo actual del proyecto.

3. **CategoryId**: No se requiere porque se deriva automáticamente desde `subcategoryId` (relación en DB).

4. **Compatibilidad**: El endpoint mantiene 100% compatibilidad con el modo completo. Clients existentes no se afectan.

5. **Stock inicial en 0**: Los productos creados en modo rápido tienen `stock: 0`, lo cual es apropiado para el flujo "Recargar Stock" donde el stock se incrementará después vía otro endpoint.

## Testing

Probado con:
- ✅ Alta rápida básica (solo 6 campos)
- ✅ Alta rápida con brandId opcional
- ✅ Modo completo (todos los campos)
- ✅ Validación de SKU duplicado
- ✅ Creación automática de marca "GENÉRICA"
- ✅ Cálculo automático de utility
