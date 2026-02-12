# Implementación de Movimientos de Caja (Cash Movements)

Se ha implementado el módulo de movimientos de caja para registrar ingresos y egresos de dinero asociados a una apertura de caja.

## Archivos Creados/Modificados

1.  **Migration**: `database/migrations/20260211123500-create-cash-movements.js` (Ejecutada correctamente)
2.  **Model**: `database/models/cash-movement.model.js`
3.  **Schema**: `schemas/transaction/cash-movement.schema.js`
4.  **Service**: `services/transaction/cash-movement.service.js`
5.  **Router**: `routes/transaction/openings.router.js` (Se agregaron endpoints)
6.  **Associations**: `database/models/opening.model.js` y `database/models/index.js` actualizados.

## Endpoints Implementados

### 1. Crear Movimiento
**POST** `/api/v1/openings/:id/movements`

Body:
```json
{
  "type": "CASH_IN", // o "CASH_OUT"
  "amount": 50.00,
  "description": "Ingreso extra por cambio"
}
```
*Validaciones:*
- La apertura debe existir y estar activa (`status: 1`).
- `amount` debe ser mayor a 0.
- `type` debe ser válido.

### 2. Listar Movimientos
**GET** `/api/v1/openings/:id/movements`

Query params opcionales: `limit`, `offset`.

### 3. Resumen de Apertura
**GET** `/api/v1/openings/:id/summary`

Respuesta:
```json
{
  "openingId": 123,
  "initBalance": "100.00",
  "totalSales": "500.00",
  "totalCashIn": "50.00",
  "totalCashOut": "20.00",
  "expectedCash": "630.00"
}
```

## Pruebas (Curl)

Reemplazar `{{token}}` y `{{opening_id}}` con valores válidos.

### Crear Movimiento (Egreso)
```bash
curl -X POST http://localhost:3000/api/v1/openings/{{opening_id}}/movements \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{token}}" \
  -d '{"type": "CASH_OUT", "amount": 25.50, "description": "Pago proveedor menor"}'
```

### Listar Movimientos
```bash
curl -X GET "http://localhost:3000/api/v1/openings/{{opening_id}}/movements?limit=10&offset=0" \
  -H "Authorization: Bearer {{token}}"
```

### Obtener Resumen
```bash
curl -X GET "http://localhost:3000/api/v1/openings/{{opening_id}}/summary" \
  -H "Authorization: Bearer {{token}}"
```
