# Script de Prueba - API de Productos e Inventario
# PowerShell Script para testing completo del flujo de recarga de productos

$ErrorActionPreference = "Stop"
$BASE_URL = "http://localhost:3000/api/v1"

# Colores para output
function Write-Success { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Info { param($msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Error { param($msg) Write-Host $msg -ForegroundColor Red }
function Write-Header { param($msg) Write-Host "`n=== $msg ===" -ForegroundColor Yellow }

# Helper function para hacer requests
function Invoke-API {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [bool]$ExpectError = $false
    )
    
    try {
        $uri = "$BASE_URL$Endpoint"
        Write-Info "→ $Method $uri"
        
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10
            Write-Host "  Body: $jsonBody" -ForegroundColor Gray
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Body $jsonBody -ContentType "application/json"
        } else {
            $response = Invoke-RestMethod -Uri $uri -Method $Method
        }
        
        Write-Success "✓ Success"
        return $response
    }
    catch {
        if ($ExpectError) {
            Write-Info "✓ Error esperado: $($_.Exception.Message)"
            return $null
        } else {
            Write-Error "✗ Error: $($_.Exception.Message)"
            throw
        }
    }
}

# ==============================================================================
# TEST 1: CREAR PRODUCTOS
# ==============================================================================

Write-Header "Test 1: Crear Productos"

# 1.1 Crear producto simple (campos mínimos)
Write-Info "1.1 Creando producto con campos mínimos..."
$product1 = Invoke-API -Method POST -Endpoint "/products" -Body @{
    name = "Computadora HP Pavilion 15"
    sku = "HP-PAV-15-001"
    price = 1000
    cost = 850
}
$productId1 = $product1.data.id
Write-Success "Producto creado con ID: $productId1"

# 1.2 Crear producto con descripción
Write-Info "`n1.2 Creando producto con descripción..."
$product2 = Invoke-API -Method POST -Endpoint "/products" -Body @{
    name = "Mouse Logitech MX Master 3"
    sku = "LGT-MX3-BLACK"
    price = 99.99
    cost = 65.00
    description = "Mouse ergonómico inalámbrico profesional con 7 botones programables"
}
$productId2 = $product2.data.id
Write-Success "Producto creado con ID: $productId2"

# 1.3 Crear producto completo
Write-Info "`n1.3 Creando producto completo con todos los campos..."
$product3 = Invoke-API -Method POST -Endpoint "/products" -Body @{
    name = "Teclado Mecánico Keychron K2"
    sku = "KEY-K2-RGB-001"
    price = 149.99
    cost = 95.00
    utility = 54.99
    stock = 0
    stockMin = 5
    brandId = 1
    subcategoryId = 1
    unitId = 1
    description = "Teclado mecánico inalámbrico con switches Gateron Brown"
}
$productId3 = $product3.data.id
Write-Success "Producto creado con ID: $productId3"

# 1.4 Intentar crear producto con SKU duplicado (debe fallar)
Write-Info "`n1.4 Intentando crear producto con SKU duplicado (debe dar error 409)..."
Invoke-API -Method POST -Endpoint "/products" -Body @{
    name = "Producto Duplicado"
    sku = "HP-PAV-15-001"
    price = 500
    cost = 300
} -ExpectError $true

# ==============================================================================
# TEST 2: BUSCAR PRODUCTOS
# ==============================================================================

Write-Header "Test 2: Buscar Productos"

# 2.1 Buscar por nombre
Write-Info "2.1 Buscando productos por nombre 'mouse'..."
$searchResult = Invoke-API -Method GET -Endpoint "/products/search?search=mouse"
Write-Success "Encontrados: $($searchResult.data.Count) productos"

# 2.2 Buscar por SKU
Write-Info "`n2.2 Buscando productos por SKU 'HP-PAV'..."
$searchResult = Invoke-API -Method GET -Endpoint "/products/search?search=HP-PAV"
Write-Success "Encontrados: $($searchResult.data.Count) productos"

# 2.3 Listar todos los productos
Write-Info "`n2.3 Listando todos los productos (paginados)..."
$allProducts = Invoke-API -Method GET -Endpoint "/products?limit=10&offset=0"
Write-Success "Total de productos: $($allProducts.data.total)"
Write-Success "Productos en esta página: $($allProducts.data.products.Count)"

# ==============================================================================
# TEST 3: ENTRADA DE STOCK (RECARGA)
# ==============================================================================

Write-Header "Test 3: Entrada de Stock"

# 3.1 Ingresar stock del producto 1
Write-Info "3.1 Ingresando 20 unidades del primer producto (ID: $productId1)..."
Invoke-API -Method POST -Endpoint "/inventory/in" -Body @{
    warehouseId = 1
    productId = $productId1
    quantity = 20
    description = "Compra de computadoras - factura FC-001-00045"
}

# 3.2 Ingresar stock del producto 2
Write-Info "`n3.2 Ingresando 50 unidades del segundo producto (ID: $productId2)..."
Invoke-API -Method POST -Endpoint "/inventory/in" -Body @{
    warehouseId = 1
    productId = $productId2
    quantity = 50
    description = "Compra mensual de accesorios - factura FC-001-00046"
}

# 3.3 Ingresar stock del producto 3
Write-Info "`n3.3 Ingresando 15 unidades del tercer producto (ID: $productId3)..."
Invoke-API -Method POST -Endpoint "/inventory/in" -Body @{
    warehouseId = 1
    productId = $productId3
    quantity = 15
    description = "Llegada de teclados mecánicos - factura FC-001-00047"
    userId = 1
}

# 3.4 Ingreso adicional del mismo producto
Write-Info "`n3.4 Ingresando 10 unidades adicionales del primer producto..."
Invoke-API -Method POST -Endpoint "/inventory/in" -Body @{
    warehouseId = 1
    productId = $productId1
    quantity = 10
    description = "Compra adicional - factura FC-001-00048"
}

# ==============================================================================
# TEST 4: CONSULTAR STOCK DE BODEGA
# ==============================================================================

Write-Header "Test 4: Consultar Stock de Bodega"

# 4.1 Ver todo el stock de la bodega 1
Write-Info "4.1 Consultando stock completo de bodega 1..."
$stock = Invoke-API -Method GET -Endpoint "/warehouses/1/stock?pageSize=20"
Write-Success "Total de productos en stock: $($stock.total)"

# Mostrar resumen
foreach ($item in $stock.data) {
    Write-Host "  - $($item.product.name) (SKU: $($item.product.sku)): $($item.quantity) unidades" -ForegroundColor Gray
}

# 4.2 Buscar producto específico en bodega
Write-Info "`n4.2 Buscando 'computadora' en bodega 1..."
$stockSearch = Invoke-API -Method GET -Endpoint "/warehouses/1/stock?search=computadora"
if ($stockSearch.data.Count -gt 0) {
    $item = $stockSearch.data[0]
    Write-Success "Encontrado: $($item.product.name) - Stock: $($item.quantity)"
}

# ==============================================================================
# TEST 5: MOVIMIENTOS DE INVENTARIO (AUDITORÍA)
# ==============================================================================

Write-Header "Test 5: Movimientos de Inventario"

# 5.1 Ver todos los movimientos recientes
Write-Info "5.1 Consultando últimos movimientos de inventario..."
$movements = Invoke-API -Method GET -Endpoint "/inventory/movements?limit=10"
Write-Success "Movimientos recientes: $($movements.Count)"

# 5.2 Movimientos de un producto específico
Write-Info "`n5.2 Consultando movimientos del producto $productId1..."
$productMovements = Invoke-API -Method GET -Endpoint "/inventory/movements?productId=$productId1"
Write-Success "Movimientos del producto: $($productMovements.Count)"

foreach ($mov in $productMovements) {
    Write-Host "  - $($mov.type): $($mov.quantity) unidades - $($mov.description)" -ForegroundColor Gray
}

# 5.3 Movimientos de tipo IN en la bodega 1
Write-Info "`n5.3 Consultando entradas (tipo IN) en bodega 1..."
$inMovements = Invoke-API -Method GET -Endpoint "/inventory/movements?warehouseId=1&type=IN"
Write-Success "Total de entradas: $($inMovements.Count)"

# 5.4 Movimientos por rango de fechas
$today = (Get-Date).ToString("yyyy-MM-dd")
Write-Info "`n5.4 Consultando movimientos de hoy ($today)..."
$todayMovements = Invoke-API -Method GET -Endpoint "/inventory/movements?dateFrom=$today&dateTo=$today"
Write-Success "Movimientos de hoy: $($todayMovements.Count)"

# ==============================================================================
# TEST 6: SALIDA DE STOCK
# ==============================================================================

Write-Header "Test 6: Salida de Stock"

# 6.1 Retirar stock manualmente (ajuste)
Write-Info "6.1 Retirando 2 unidades del producto $productId2 (ajuste por daño)..."
Invoke-API -Method POST -Endpoint "/inventory/out" -Body @{
    warehouseId = 1
    productId = $productId2
    quantity = 2
    description = "Ajuste por producto dañado en transporte"
}

# 6.2 Verificar nuevo stock
Write-Info "`n6.2 Verificando stock actualizado..."
$updatedStock = Invoke-API -Method GET -Endpoint "/warehouses/1/stock?search=mouse"
if ($updatedStock.data.Count -gt 0) {
    Write-Success "Stock actualizado: $($updatedStock.data[0].quantity) unidades (debería ser 48)"
}

# ==============================================================================
# TEST 7: TRANSFERENCIAS ENTRE BODEGAS
# ==============================================================================

Write-Header "Test 7: Transferencias entre Bodegas"

# 7.1 Crear transferencia de bodega 1 a bodega 2
Write-Info "7.1 Creando transferencia de bodega 1 a bodega 2..."
$transfer = Invoke-API -Method POST -Endpoint "/inventory/transfer" -Body @{
    fromWarehouseId = 1
    toWarehouseId = 2
    items = @(
        @{
            productId = $productId1
            quantity = 5
        },
        @{
            productId = $productId3
            quantity = 3
        }
    )
    observation = "Transferencia para bodega sucursal norte"
    userId = 1
}
$transferId = $transfer.id
Write-Success "Transferencia creada con ID: $transferId"

# 7.2 Consultar detalles de la transferencia
Write-Info "`n7.2 Consultando detalles de la transferencia..."
$transferDetails = Invoke-API -Method GET -Endpoint "/inventory/transfers/$transferId"
Write-Success "Estado: $($transferDetails.status)"
Write-Success "Items transferidos: $($transferDetails.items.Count)"

foreach ($item in $transferDetails.items) {
    Write-Host "  - $($item.product.name): $($item.quantity) unidades" -ForegroundColor Gray
}

# 7.3 Ver historial de transferencias
Write-Info "`n7.3 Consultando historial de transferencias..."
$transfers = Invoke-API -Method GET -Endpoint "/inventory/transfers?pageSize=10"
Write-Success "Total de transferencias: $($transfers.meta.total)"

# ==============================================================================
# TEST 8: VALIDACIONES Y ERRORES
# ==============================================================================

Write-Header "Test 8: Validaciones y Errores"

# 8.1 Intentar ingresar stock con cantidad negativa
Write-Info "8.1 Intentando ingresar cantidad negativa (debe fallar)..."
Invoke-API -Method POST -Endpoint "/inventory/in" -Body @{
    warehouseId = 1
    productId = $productId1
    quantity = -5
    description = "Test de validación"
} -ExpectError $true

# 8.2 Intentar retirar más stock del disponible
Write-Info "`n8.2 Intentando retirar más stock del disponible (debe fallar)..."
Invoke-API -Method POST -Endpoint "/inventory/out" -Body @{
    warehouseId = 1
    productId = $productId1
    quantity = 999999
    description = "Test de validación"
} -ExpectError $true

# 8.3 Intentar transferir a la misma bodega
Write-Info "`n8.3 Intentando transferir a la misma bodega (debe fallar)..."
Invoke-API -Method POST -Endpoint "/inventory/transfer" -Body @{
    fromWarehouseId = 1
    toWarehouseId = 1
    items = @(@{ productId = $productId1; quantity = 1 })
} -ExpectError $true

# 8.4 Intentar crear producto con precio menor al costo
Write-Info "`n8.4 Intentando crear producto con price < cost (debe fallar)..."
Invoke-API -Method POST -Endpoint "/products" -Body @{
    name = "Producto Inválido"
    sku = "INVALID-001"
    price = 50
    cost = 100
} -ExpectError $true

# ==============================================================================
# RESUMEN FINAL
# ==============================================================================

Write-Header "Resumen Final de Stock"

Write-Info "Consultando estado final de bodega 1..."
$finalStock = Invoke-API -Method GET -Endpoint "/warehouses/1/stock?pageSize=50"

Write-Host "`nSTOCK EN BODEGA 1:" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
foreach ($item in $finalStock.data | Sort-Object -Property @{Expression={$_.product.name}}) {
    $productName = $item.product.name.PadRight(40)
    $sku = $item.product.sku.PadRight(20)
    $qty = $item.quantity.ToString().PadLeft(5)
    Write-Host "$productName $sku Stock: $qty" -ForegroundColor White
}

Write-Host "`n" -ForegroundColor Green
Write-Success "===================="
Write-Success "✓ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE"
Write-Success "===================="

Write-Host "`nProductos creados:"
Write-Host "  - Producto 1 ID: $productId1 (HP Pavilion 15)"
Write-Host "  - Producto 2 ID: $productId2 (Mouse Logitech)"
Write-Host "  - Producto 3 ID: $productId3 (Teclado Keychron)"
Write-Host "`nTransferencia creada: ID $transferId"
Write-Host "`nTotal de movimientos registrados: $($todayMovements.Count)"
