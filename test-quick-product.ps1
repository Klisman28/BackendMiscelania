# Script de prueba para Alta Rápida de Productos
# Reemplazar {{token}} con un JWT válido

$TOKEN = "{{token}}"
$BASE_URL = "http://localhost:3000/api/v1"

Write-Host "=== Tests de Alta Rápida de Productos ===" -ForegroundColor Cyan

# Test 1: Alta rápida básica (solo campos mínimos)
Write-Host "`n[Test 1] Alta rápida básica (6 campos mínimos)" -ForegroundColor Yellow
$body1 = @{
    name = "Computadora HP 15"
    sku = "HP15-2026-TEST"
    cost = 850
    price = 1000
    subcategoryId = 1
    unitId = 1
} | ConvertTo-Json

curl.exe -X POST "$BASE_URL/products" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $TOKEN" `
  -d $body1

# Test 2: Alta rápida con marca específica
Write-Host "`n`n[Test 2] Alta rápida con brandId opcional" -ForegroundColor Yellow
$body2 = @{
    name = "Mouse Logitech M185"
    sku = "LOG-M185-TEST"
    cost = 15.50
    price = 25.00
    subcategoryId = 1
    unitId = 1
    brandId = 1
    description = "Mouse inalámbrico"
} | ConvertTo-Json

curl.exe -X POST "$BASE_URL/products" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $TOKEN" `
  -d $body2

# Test 3: Alta completa (modo original)
Write-Host "`n`n[Test 3] Alta completa (todos los campos)" -ForegroundColor Yellow
$body3 = @{
    name = "Teclado Mecánico Razer"
    sku = "RAZ-KB-001-TEST"
    cost = 120.00
    price = 180.00
    utility = 60.00
    stock = 15
    stockMin = 5
    brandId = 1
    subcategoryId = 1
    unitId = 1
    description = "Teclado mecánico RGB"
} | ConvertTo-Json

curl.exe -X POST "$BASE_URL/products" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $TOKEN" `
  -d $body3

# Test 4: Error - SKU duplicado
Write-Host "`n`n[Test 4] Error esperado - SKU duplicado" -ForegroundColor Yellow
$body4 = @{
    name = "Producto Duplicado"
    sku = "HP15-2026-TEST"
    cost = 100
    price = 150
    subcategoryId = 1
    unitId = 1
} | ConvertTo-Json

curl.exe -X POST "$BASE_URL/products" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $TOKEN" `
  -d $body4

# Test 5: Error - price < cost
Write-Host "`n`n[Test 5] Error esperado - price < cost" -ForegroundColor Yellow
$body5 = @{
    name = "Producto Error Precio"
    sku = "ERROR-PRICE-01"
    cost = 100
    price = 50
    subcategoryId = 1
    unitId = 1
} | ConvertTo-Json

curl.exe -X POST "$BASE_URL/products" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $TOKEN" `
  -d $body5

Write-Host "`n`n=== Tests Completados ===" -ForegroundColor Cyan
Write-Host "Verifica las respuestas arriba. Los Tests 4 y 5 deben mostrar errores esperados." -ForegroundColor Green
