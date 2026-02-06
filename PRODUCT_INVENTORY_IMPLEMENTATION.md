# Product & Inventory Flow Implementation

## Overview
Implemented the complete flow for creating products and replenishing stock (Inventory IN), along with inventory movement auditing.

## 1. Create Product
**Endpoint**: `POST /api/v1/products`

**Description**: Creates a new product in the catalogue.

**Headers**:
- `Authorization`: `Bearer <token>`

**Body Example**:
```json
{
  "name": "Computadora HP 15",
  "sku": "HP15-2026",
  "price": 1000.00,
  "cost": 850.00,
  "stock": 0,
  "stockMin": 5,
  "utility": 150.00,
  "brandId": 1,
  "subcategoryId": 1,
  "unitId": 1
}
```

**Validation**:
- `sku` must be unique (Returns 409 if exists)
- `brandId`, `subcategoryId`, `unitId` are required relations.
- returns `201 Created`

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Computadora HP 15",
    "sku": "HP15-2026",
    "price": 1000,
    "cost": 850,
    "stock": 0,
    "stockMin": 5,
    "utility": 150,
    "brandId": 1,
    "subcategoryId": 1,
    "unitId": 1
  }'
```

## 2. Add Stock (Recarga / Compra)
**Endpoint**: `POST /api/v1/inventory/in`

**Description**: Adds physical stock to a specific warehouse and records the movement.

**Body Example**:
```json
{
  "warehouseId": 1,
  "productId": 123,
  "quantity": 20,
  "description": "Compra de computadoras - factura 001-00045"
}
```

**Logic**:
- Verifies Warehouse and Product exist.
- Creates `InventoryMovement` (type: 'IN').
- Updates or Creates `InventoryBalance` for that warehouse/product.
- Transactional operation.

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/v1/inventory/in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "warehouseId": 1,
    "productId": 123,
    "quantity": 20,
    "description": "Compra Factura 001"
  }'
```

## 3. Inventory Movements (Auditoría)
**Endpoint**: `GET /api/v1/inventory/movements`

**Query Parameters**:
- `warehouseId` (optional)
- `productId` (optional)
- `type` (optional: 'IN', 'OUT', 'TRANSFER_IN', etc)
- `dateFrom` (optional ISO date)
- `dateTo` (optional ISO date)
- `limit` (default 10)
- `offset` (default 0)

**cURL Example**:
```bash
curl "http://localhost:3000/api/v1/inventory/movements?warehouseId=1&type=IN&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 4. Product Search
**Endpoint**: `GET /api/v1/products?search=term`

**Description**: Search products by name or SKU.

**cURL Example**:
```bash
curl "http://localhost:3000/api/v1/products?search=HP15" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Files Modified/Created
- `schemas/transaction/inventory.schema.js`: Added `queryMovementSchema`.
- `services/transaction/inventory.service.js`: Updated `getMovements` with date filtering.
- `routes/transaction/inventory.router.js`: Added `GET /movements` endpoint.
- `routes/catalogue/products.router.js`: Confirmed existing implementation.
