# Warehouse Stock Pagination - Implementation Guide

## Overview
This document describes the server-side pagination implementation for the warehouse stock endpoint.

## Endpoint
```
GET /api/v1/warehouses/:id/stock
```

## Query Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| pageIndex or page | number | 1 | - | Page number (1-indexed) |
| pageSize or limit | number | 10 | 100 | Items per page |
| search | string | - | - | Filter by product name or SKU |
| sort | JSON string | - | - | Sort configuration |

## Response Format

```json
{
  "data": [
    {
      "id": 1,
      "warehouseId": 1,
      "productId": 5,
      "quantity": 68,
      "createdAt": "2026-01-30T10:00:00.000Z",
      "updatedAt": "2026-02-01T15:30:00.000Z",
      "product": {
        "id": 5,
        "name": "Product Name",
        "sku": "PROD-001",
        "price": 99.99
      }
    }
  ],
  "total": 68
}
```

## Pagination Logic

- `pageIndex` defaults to 1
- `pageSize` defaults to 10, maximum 100
- `offset = (pageIndex - 1) * pageSize`
- `limit = pageSize`

## Sorting

Sort parameter format (URL encoded JSON):
```json
[{"key":"quantity","order":"asc"}]
```

### Allowed Sort Keys (Whitelist)
- `quantity` - Stock quantity
- `createdAt` - Record creation date
- `updatedAt` - Record update date
- `product.name` - Product name (nested)
- `product.sku` - Product SKU (nested)

Default sort: `createdAt DESC`

## Search

Search filters by:
- Product name (case-insensitive, partial match)
- Product SKU (case-insensitive, partial match)

## Validation

- Warehouse ID must be a valid integer (404 if not found)
- `pageIndex` must be >= 1
- `pageSize` must be >= 1 and <= 100
- Invalid parameters return 400 Bad Request

## cURL Examples

### Example 1: Basic Request (page 1, default size 10)
```bash
curl "http://localhost:3000/api/v1/warehouses/1/stock"
```

### Example 2: Page 1 with pageSize 5
```bash
curl "http://localhost:3000/api/v1/warehouses/1/stock?pageSize=5"
```

### Example 3: Page 2 with pageSize 5 (items 6-10)
```bash
curl "http://localhost:3000/api/v1/warehouses/1/stock?pageIndex=2&pageSize=5"
```

### Example 4: Using alias parameters (page and limit)
```bash
curl "http://localhost:3000/api/v1/warehouses/1/stock?page=2&limit=5"
```

### Example 5: With search filter
```bash
curl "http://localhost:3000/api/v1/warehouses/1/stock?pageSize=10&search=laptop"
```

### Example 6: With sorting by quantity ascending
```bash
curl "http://localhost:3000/api/v1/warehouses/1/stock?sort=%5B%7B%22key%22%3A%22quantity%22%2C%22order%22%3A%22asc%22%7D%5D"
```

#### Decoded sort parameter:
```json
[{"key":"quantity","order":"asc"}]
```

### Example 7: With sorting by product name descending
```bash
curl "http://localhost:3000/api/v1/warehouses/1/stock?sort=%5B%7B%22key%22%3A%22product.name%22%2C%22order%22%3A%22desc%22%7D%5D"
```

#### Decoded sort parameter:
```json
[{"key":"product.name","order":"desc"}]
```

### Example 8: Complete example with all parameters
```bash
curl "http://localhost:3000/api/v1/warehouses/1/stock?pageIndex=2&pageSize=10&search=prod&sort=%5B%7B%22key%22%3A%22product.name%22%2C%22order%22%3A%22asc%22%7D%5D"
```

## Testing Scenarios

### 1. Test Pagination Works
```bash
# Get page 1 with 5 items
curl "http://localhost:3000/api/v1/warehouses/1/stock?pageSize=5"
# Expected: data array with max 5 items, total = N

# Get page 2 with 5 items
curl "http://localhost:3000/api/v1/warehouses/1/stock?pageIndex=2&pageSize=5"
# Expected: different 5 items (6-10), same total = N
```

### 2. Test Total Count is Accurate
```bash
# Make multiple requests with different pageSize
curl "http://localhost:3000/api/v1/warehouses/1/stock?pageSize=5"
curl "http://localhost:3000/api/v1/warehouses/1/stock?pageSize=20"
# Expected: total should be the same in both responses
```

### 3. Test Search Filters Results
```bash
curl "http://localhost:3000/api/v1/warehouses/1/stock?search=laptop"
# Expected: total should be less than or equal to total without search
```

### 4. Test Invalid Warehouse
```bash
curl "http://localhost:3000/api/v1/warehouses/99999/stock"
# Expected: 404 Not Found
```

### 5. Test Invalid Pagination Parameters
```bash
curl "http://localhost:3000/api/v1/warehouses/1/stock?pageIndex=0"
# Expected: 400 Bad Request

curl "http://localhost:3000/api/v1/warehouses/1/stock?pageSize=101"
# Expected: Automatically capped to 100
```

## Implementation Details

### Files Modified

1. **schemas/transaction/inventory.schema.js**
   - Added `queryStockSchema` for validating query parameters
   - Supports both `pageIndex/page` and `pageSize/limit` aliases

2. **services/transaction/inventory.service.js**
   - Updated `getBalance()` method to accept query parameters
   - Implemented pagination with `findAndCountAll()`
   - Added search functionality (Product name/SKU)
   - Added sort whitelist validation
   - Returns `{ data: [...], total: N }` format

3. **routes/organization/warehouses.router.js**
   - Added query parameter validation
   - Passes query params to service
   - Validates warehouse exists before querying stock

### Key Features

✅ Server-side pagination with `findAndCountAll()`
✅ Support for both parameter naming conventions (pageIndex/page, pageSize/limit)
✅ Maximum pageSize enforced (100)
✅ Search by product name or SKU
✅ Safe sorting with whitelist
✅ Proper error handling (400, 404)
✅ Returns exact response format: `{ data: [], total: N }`

## Frontend Integration

Your DataTable with `manualPagination: true` should work seamlessly:

```javascript
const fetchStock = async (warehouseId, pageIndex, pageSize) => {
  const response = await axios.get(`/api/v1/warehouses/${warehouseId}/stock`, {
    params: { pageIndex, pageSize }
  });
  
  return {
    items: response.data.data,
    totalCount: response.data.total
  };
};
```
