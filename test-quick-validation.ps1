# Test Rápido - Validar Implementación

# URL base
$BASE_URL = "http://localhost:3000/api/v1"

Write-Host "`n=== TEST RÁPIDO DE VALIDACIÓN ===" -ForegroundColor Yellow
Write-Host "Probando los endpoints principales..." -ForegroundColor Cyan

# Test 1: Health check
Write-Host "`n1. Health Check..." -ForegroundColor Green
try {
    $health = Invoke-RestMethod -Uri "$BASE_URL/healthcheck" -Method GET
    Write-Host "✓ API está activa - Uptime: $([math]::Round($health.uptime, 2))s" -ForegroundColor Green
} catch {
    Write-Host "✗ Error en health check" -ForegroundColor Red
    exit 1
}

# Test 2: Crear producto simple (sin autenticación para testing)
# Nota: Si tienes autenticación activada, necesitarás un token JWT
Write-Host "`n2. Intentando crear producto de prueba..." -ForegroundColor Green
Write-Host "   (Si falla con 401, es porque requiere autenticación JWT)" -ForegroundColor Gray

$productTest = @{
    name = "TEST-PRODUCTO-$(Get-Random -Maximum 9999)"
    sku = "TEST-SKU-$(Get-Random -Maximum 9999)"
    price = 100
    cost = 80
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/products" -Method POST -Body $productTest -ContentType "application/json"
    Write-Host "✓ Producto creado exitosamente!" -ForegroundColor Green
    Write-Host "   ID: $($response.data.id)" -ForegroundColor White
    Write-Host "   SKU: $($response.data.sku)" -ForegroundColor White
} catch {
    $errorMessage = $_.Exception.Message
    if ($errorMessage -like "*401*" -or $errorMessage -like "*Unauthorized*") {
        Write-Host "⚠ Endpoint requiere autenticación (esperado en producción)" -ForegroundColor Yellow
        Write-Host "   Para testing completo, obtén un token JWT primero" -ForegroundColor Gray
    } else {
        Write-Host "✗ Error: $errorMessage" -ForegroundColor Red
    }
}

Write-Host "`n=== VALIDACIÓN COMPLETADA ===" -ForegroundColor Yellow
Write-Host "`nPara testing completo con autenticación:" -ForegroundColor Cyan
Write-Host "1. Obtén un token JWT via POST /api/v1/auth/login" -ForegroundColor White
Write-Host "2. Ejecuta: .\test-product-inventory.ps1" -ForegroundColor White
Write-Host "`nDocumentación completa:" -ForegroundColor Cyan
Write-Host "- PRODUCT_INVENTORY_API.md" -ForegroundColor White
Write-Host "- PRODUCT_INVENTORY_QUICKSTART.md" -ForegroundColor White
Write-Host ""
