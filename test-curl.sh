#!/bin/bash
# Quick test script for warehouse stock pagination
# Make this file executable: chmod +x test-curl.sh (Linux/Mac)
# Or run directly: bash test-curl.sh

BASE_URL="http://localhost:3000/api/v1"
WAREHOUSE_ID=1

echo "🧪 Testing Warehouse Stock Pagination with cURL"
echo "================================================"

echo -e "\n✅ Test 1: Basic request (default pagination)"
curl -s "${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock" | jq '.total'

echo -e "\n✅ Test 2: Page 1 with pageSize=5"
curl -s "${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock?pageSize=5" | jq '{items: (.data | length), total}'

echo -e "\n✅ Test 3: Page 2 with pageSize=5"
curl -s "${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock?pageIndex=2&pageSize=5" | jq '{items: (.data | length), total}'

echo -e "\n✅ Test 4: Using alias (page=2, limit=5)"
curl -s "${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock?page=2&limit=5" | jq '{items: (.data | length), total}'

echo -e "\n✅ Test 5: Search by 'prod'"
curl -s "${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock?search=prod" | jq '{items: (.data | length), total}'

echo -e "\n✅ Test 6: Sort by quantity ASC"
curl -s "${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock?pageSize=5&sort=%5B%7B%22key%22%3A%22quantity%22%2C%22order%22%3A%22asc%22%7D%5D" | jq '.data[] | {name: .product.name, qty: .quantity}'

echo -e "\n✅ Test 7: Sort by product.name DESC"
curl -s "${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock?pageSize=5&sort=%5B%7B%22key%22%3A%22product.name%22%2C%22order%22%3A%22desc%22%7D%5D" | jq '.data[] | .product.name'

echo -e "\n✅ Test 8: Invalid warehouse (should return 404)"
curl -s "${BASE_URL}/warehouses/99999/stock" | jq '.'

echo -e "\n✅ Test 9: Invalid pageIndex (should return 400)"
curl -s "${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock?pageIndex=0" | jq '.'

echo -e "\n================================================"
echo "✅ Tests completed!"
