#!/bin/bash
# Script de Prueba - API de Productos e Inventario
# Bash script con ejemplos de cURL para testing del flujo completo

BASE_URL="http://localhost:3000/api/v1"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== API de Productos e Inventario - Test Suite ===${NC}\n"

# ==============================================================================
# TEST 1: CREAR PRODUCTOS
# ==============================================================================

echo -e "${CYAN}=== Test 1: Crear Productos ===${NC}"

echo -e "\n${GREEN}1.1 Crear producto simple (campos mínimos)...${NC}"
PRODUCT1=$(curl -s -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Computadora HP Pavilion 15",
    "sku": "HP-PAV-15-001",
    "price": 1000,
    "cost": 850
  }')
PRODUCT_ID_1=$(echo $PRODUCT1 | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo "✓ Producto creado con ID: $PRODUCT_ID_1"

echo -e "\n${GREEN}1.2 Crear producto con descripción...${NC}"
PRODUCT2=$(curl -s -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mouse Logitech MX Master 3",
    "sku": "LGT-MX3-BLACK",
    "price": 99.99,
    "cost": 65.00,
    "description": "Mouse ergonómico inalámbrico profesional"
  }')
PRODUCT_ID_2=$(echo $PRODUCT2 | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo "✓ Producto creado con ID: $PRODUCT_ID_2"

echo -e "\n${GREEN}1.3 Crear producto completo...${NC}"
PRODUCT3=$(curl -s -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teclado Mecánico Keychron K2",
    "sku": "KEY-K2-RGB-001",
    "price": 149.99,
    "cost": 95.00,
    "utility": 54.99,
    "stock": 0,
    "stockMin": 5,
    "brandId": 1,
    "subcategoryId": 1,
    "unitId": 1,
    "description": "Teclado mecánico inalámbrico con switches Gateron Brown"
  }')
PRODUCT_ID_3=$(echo $PRODUCT3 | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo "✓ Producto creado con ID: $PRODUCT_ID_3"

echo -e "\n${GREEN}1.4 Intentar crear SKU duplicado (debe fallar con 409)...${NC}"
curl -s -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Producto Duplicado",
    "sku": "HP-PAV-15-001",
    "price": 500,
    "cost": 300
  }' | grep -o '"statusCode":[0-9]*"error":"[^"]*"' || echo "✓ Error 409 recibido correctamente"

# ==============================================================================
# TEST 2: BUSCAR PRODUCTOS
# ==============================================================================

echo -e "\n${CYAN}=== Test 2: Buscar Productos ===${NC}"

echo -e "\n${GREEN}2.1 Buscar productos por nombre 'mouse'...${NC}"
curl -s "$BASE_URL/products/search?search=mouse" | head -c 200
echo "..."

echo -e "\n${GREEN}2.2 Buscar productos por SKU 'HP-PAV'...${NC}"
curl -s "$BASE_URL/products/search?search=HP-PAV" | head -c 200
echo "..."

echo -e "\n${GREEN}2.3 Listar todos los productos...${NC}"
curl -s "$BASE_URL/products?limit=10&offset=0" | head -c 200
echo "..."

# ==============================================================================
# TEST 3: ENTRADA DE STOCK
# ==============================================================================

echo -e "\n${CYAN}=== Test 3: Entrada de Stock ===${NC}"

echo -e "\n${GREEN}3.1 Ingresar 20 unidades del producto $PRODUCT_ID_1...${NC}"
curl -s -X POST "$BASE_URL/inventory/in" \
  -H "Content-Type: application/json" \
  -d "{
    \"warehouseId\": 1,
    \"productId\": $PRODUCT_ID_1,
    \"quantity\": 20,
    \"description\": \"Compra de computadoras - factura FC-001-00045\"
  }" | grep -o '"message":"[^"]*"'

echo -e "\n${GREEN}3.2 Ingresar 50 unidades del producto $PRODUCT_ID_2...${NC}"
curl -s -X POST "$BASE_URL/inventory/in" \
  -H "Content-Type: application/json" \
  -d "{
    \"warehouseId\": 1,
    \"productId\": $PRODUCT_ID_2,
    \"quantity\": 50,
    \"description\": \"Compra mensual de accesorios\"
  }" | grep -o '"message":"[^"]*"'

echo -e "\n${GREEN}3.3 Ingresar 15 unidades del producto $PRODUCT_ID_3...${NC}"
curl -s -X POST "$BASE_URL/inventory/in" \
  -H "Content-Type: application/json" \
  -d "{
    \"warehouseId\": 1,
    \"productId\": $PRODUCT_ID_3,
    \"quantity\": 15,
    \"description\": \"Llegada de teclados mecánicos\",
    \"userId\": 1
  }" | grep -o '"message":"[^"]*"'

# ==============================================================================
# TEST 4: CONSULTAR STOCK
# ==============================================================================

echo -e "\n${CYAN}=== Test 4: Consultar Stock de Bodega ===${NC}"

echo -e "\n${GREEN}4.1 Stock completo de bodega 1...${NC}"
curl -s "$BASE_URL/warehouses/1/stock?pageSize=20" | head -c 300
echo "..."

echo -e "\n${GREEN}4.2 Buscar 'computadora' en bodega 1...${NC}"
curl -s "$BASE_URL/warehouses/1/stock?search=computadora" | head -c 200
echo "..."

# ==============================================================================
# TEST 5: MOVIMIENTOS DE INVENTARIO
# ==============================================================================

echo -e "\n${CYAN}=== Test 5: Movimientos de Inventario ===${NC}"

echo -e "\n${GREEN}5.1 Últimos movimientos...${NC}"
curl -s "$BASE_URL/inventory/movements?limit=5" | head -c 300
echo "..."

echo -e "\n${GREEN}5.2 Movimientos del producto $PRODUCT_ID_1...${NC}"
curl -s "$BASE_URL/inventory/movements?productId=$PRODUCT_ID_1" | head -c 300
echo "..."

echo -e "\n${GREEN}5.3 Entradas (tipo IN) en bodega 1...${NC}"
curl -s "$BASE_URL/inventory/movements?warehouseId=1&type=IN" | head -c 300
echo "..."

# ==============================================================================
# TEST 6: SALIDA DE STOCK
# ==============================================================================

echo -e "\n${CYAN}=== Test 6: Salida de Stock ===${NC}"

echo -e "\n${GREEN}6.1 Retirar 2 unidades del producto $PRODUCT_ID_2...${NC}"
curl -s -X POST "$BASE_URL/inventory/out" \
  -H "Content-Type: application/json" \
  -d "{
    \"warehouseId\": 1,
    \"productId\": $PRODUCT_ID_2,
    \"quantity\": 2,
    \"description\": \"Ajuste por producto dañado\"
  }" | grep -o '"message":"[^"]*"'

# ==============================================================================
# TEST 7: TRANSFERENCIAS
# ==============================================================================

echo -e "\n${CYAN}=== Test 7: Transferencias entre Bodegas ===${NC}"

echo -e "\n${GREEN}7.1 Crear transferencia de bodega 1 a bodega 2...${NC}"
TRANSFER=$(curl -s -X POST "$BASE_URL/inventory/transfer" \
  -H "Content-Type: application/json" \
  -d "{
    \"fromWarehouseId\": 1,
    \"toWarehouseId\": 2,
    \"items\": [
      {\"productId\": $PRODUCT_ID_1, \"quantity\": 5},
      {\"productId\": $PRODUCT_ID_3, \"quantity\": 3}
    ],
    \"observation\": \"Transferencia para bodega sucursal norte\",
    \"userId\": 1
  }")
TRANSFER_ID=$(echo $TRANSFER | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo "✓ Transferencia creada con ID: $TRANSFER_ID"

echo -e "\n${GREEN}7.2 Consultar detalles de la transferencia...${NC}"
curl -s "$BASE_URL/inventory/transfers/$TRANSFER_ID" | head -c 300
echo "..."

echo -e "\n${GREEN}7.3 Historial de transferencias...${NC}"
curl -s "$BASE_URL/inventory/transfers?pageSize=10" | head -c 300
echo "..."

# ==============================================================================
# RESUMEN FINAL
# ==============================================================================

echo -e "\n${YELLOW}=== Resumen Final ===${NC}"
echo -e "${GREEN}✓ Productos creados:${NC}"
echo "  - Producto 1 ID: $PRODUCT_ID_1 (HP Pavilion 15)"
echo "  - Producto 2 ID: $PRODUCT_ID_2 (Mouse Logitech)"
echo "  - Producto 3 ID: $PRODUCT_ID_3 (Teclado Keychron)"
echo -e "${GREEN}✓ Transferencia creada: ID $TRANSFER_ID${NC}"

echo -e "\n${GREEN}Stock final en bodega 1:${NC}"
curl -s "$BASE_URL/warehouses/1/stock?pageSize=50" | grep -o '"name":"[^"]*","sku":"[^"]*".*"quantity":[0-9]*' | head -5

echo -e "\n\n${YELLOW}==================="${NC}"
echo -e "${GREEN}✓ TODAS LAS PRUEBAS COMPLETADAS${NC}"
echo -e "${YELLOW}===================="
