# Warehouse Stock Pagination - Quick Reference

## 🔗 Endpoint
```
GET /api/v1/warehouses/:id/stock
```

## 📥 Request Parameters

```
?pageIndex=2&pageSize=5&search=laptop&sort=[{"key":"quantity","order":"asc"}]
```

| Param | Alias | Type | Default | Max | Description |
|-------|-------|------|---------|-----|-------------|
| pageIndex | page | number | 1 | - | Current page (1-indexed) |
| pageSize | limit | number | 10 | 100 | Items per page |
| search | - | string | - | - | Filter by name/SKU |
| sort | - | JSON | - | - | Sort configuration |

## 📤 Response Format

```json
{
  "data": [/* N items */],
  "total": 68
}
```

## 🎯 Example Scenarios

### Scenario 1: Get First Page
```bash
GET /api/v1/warehouses/1/stock
# or
GET /api/v1/warehouses/1/stock?pageIndex=1&pageSize=10
```

**Result:**
```
Total items in DB: 68
Returned items: 10 (items 1-10)
Response: { data: [10 items], total: 68 }
```

### Scenario 2: Get Second Page
```bash
GET /api/v1/warehouses/1/stock?pageIndex=2&pageSize=5
```

**Calculation:**
```
offset = (pageIndex - 1) * pageSize
offset = (2 - 1) * 5 = 5
limit = 5
SQL: ... LIMIT 5 OFFSET 5
```

**Result:**
```
Total items in DB: 68
Returned items: 5 (items 6-10)
Response: { data: [5 items], total: 68 }
```

### Scenario 3: Search + Pagination
```bash
GET /api/v1/warehouses/1/stock?search=laptop&pageSize=10
```

**Result:**
```
Total items in DB: 68
Matching search: 12 laptops
Returned items: 10 (laptops 1-10)
Response: { data: [10 items], total: 12 }
```

## 🔢 Pagination Math

```
Given:
- Total items: 68
- Page size: 10

Pages needed: ceil(68 / 10) = 7 pages

Page 1: offset=0,  limit=10  → items 1-10
Page 2: offset=10, limit=10  → items 11-20
Page 3: offset=20, limit=10  → items 21-30
Page 4: offset=30, limit=10  → items 31-40
Page 5: offset=40, limit=10  → items 41-50
Page 6: offset=50, limit=10  → items 51-60
Page 7: offset=60, limit=10  → items 61-68 (only 8 items)
```

## 📊 Sort Keys Whitelist

### Direct Columns
- ✅ `quantity`
- ✅ `createdAt`
- ✅ `updatedAt`

### Nested Columns (via Product)
- ✅ `product.name`
- ✅ `product.sku`

### Default Sort
```
createdAt DESC
```

## 🔍 Search Behavior

Searches in:
1. **Product Name** - partial match, case-insensitive
2. **Product SKU** - partial match, case-insensitive

Example:
```
search=lap
Matches: "Laptop Dell", "LAP-001", "Overlapping"
```

## ⚠️ Error Responses

### 404 - Warehouse Not Found
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Warehouse not found"
}
```

### 400 - Invalid Parameters
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Invalid pagination parameters"
}
```

## 🧪 Quick Test Commands

### Windows (PowerShell)
```powershell
# Basic
Invoke-RestMethod "http://localhost:3000/api/v1/warehouses/1/stock"

# Page 2, size 5
Invoke-RestMethod "http://localhost:3000/api/v1/warehouses/1/stock?pageIndex=2&pageSize=5"

# Search
Invoke-RestMethod "http://localhost:3000/api/v1/warehouses/1/stock?search=laptop"
```

### Linux/Mac (curl)
```bash
# Basic
curl http://localhost:3000/api/v1/warehouses/1/stock

# Page 2, size 5
curl "http://localhost:3000/api/v1/warehouses/1/stock?pageIndex=2&pageSize=5"

# Search
curl "http://localhost:3000/api/v1/warehouses/1/stock?search=laptop"
```

## 🎨 Frontend Example

```javascript
const DataTableWrapper = ({ warehouseId }) => {
  const [data, setData] = useState([]);
  const [paging, setPaging] = useState({
    pageIndex: 1,
    pageSize: 10,
    total: 0
  });

  const fetchData = async (pageIndex, pageSize) => {
    const res = await axios.get(
      `/api/v1/warehouses/${warehouseId}/stock`,
      { params: { pageIndex, pageSize } }
    );
    
    setData(res.data.data);
    setPaging({ pageIndex, pageSize, total: res.data.total });
  };

  return (
    <DataTable
      data={data}
      manualPagination={true}
      pagingData={paging}
      onPageChange={({ pageIndex, pageSize }) => {
        fetchData(pageIndex, pageSize);
      }}
    />
  );
};
```

## ✅ Verification Checklist

- [ ] Page 1 returns first N items
- [ ] Page 2 returns items N+1 to 2N
- [ ] Total count is consistent across pages
- [ ] Search reduces total count
- [ ] Sort changes order of results
- [ ] Invalid warehouse returns 404
- [ ] pageIndex=0 returns 400
- [ ] pageSize>100 caps at 100
- [ ] Empty results return `{ data: [], total: 0 }`

## 📚 Full Documentation

See `WAREHOUSE_STOCK_PAGINATION.md` for complete details.
See `IMPLEMENTATION_SUMMARY.md` for technical implementation.
