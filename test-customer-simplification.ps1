# Tests curl para Simplificación de Clientes

$BASE_URL = "http://localhost:3000/api/v1/customers"
$TOKEN = "{{your-jwt-token}}"  # Si requiere auth

Write-Host "=== Tests de Simplificación de Clientes ===" -ForegroundColor Cyan

# ================================================
# Test 1: Crear Consumidor Final (CF automático)
# ================================================
Write-Host "`n[Test 1] Crear Consumidor Final" -ForegroundColor Yellow
$body1 = @{
    firstName       = "María"
    lastName        = "López García"
    isFinalConsumer = $true
    email           = "maria.lopez@example.com"
    telephone       = "555-1234"
} | ConvertTo-Json

curl.exe -X POST "$BASE_URL" `
    -H "Content-Type: application/json" `
    -d $body1

Write-Host "`n✅ Esperado: nit = 'CF' (auto-asignado)" -ForegroundColor Green

# ================================================
# Test 2: Crear Cliente con NIT
# ================================================
Write-Host "`n`n[Test 2] Crear Cliente con NIT" -ForegroundColor Yellow
$body2 = @{
    firstName       = "Tech Solutions"
    lastName        = "S.A. de C.V."
    isFinalConsumer = $false
    nit             = "0614-230393-101-6"
    email           = "contacto@techsolutions.com"
    telephone       = "555-9999"
    address         = "Boulevard Los Próceres 123"
} | ConvertTo-Json

curl.exe -X POST "$BASE_URL" `
    -H "Content-Type: application/json" `
    -d $body2

Write-Host "`n✅ Esperado: nit = '0614-230393-101-6'" -ForegroundColor Green

# ================================================
# Test 3: Crear Cliente sin NIT (permitido)
# ================================================
Write-Host "`n`n[Test 3] Crear Cliente sin NIT" -ForegroundColor Yellow
$body3 = @{
    firstName       = "Carlos"
    lastName        = "Ramírez"
    isFinalConsumer = $false
    email           = "carlos@example.com"
} | ConvertTo-Json

curl.exe -X POST "$BASE_URL" `
    -H "Content-Type: application/json" `
    -d $body3

Write-Host "`n✅ Esperado: nit = null" -ForegroundColor Green

# ================================================
# Test 4: Backward Compatibility (campos antiguos)
# ================================================
Write-Host "`n`n[Test 4] Crear con Formato Antiguo" -ForegroundColor Yellow
$body4 = @{
    name           = "Pedro"
    firstLastname  = "González"
    secondLastname = "Martínez"
    email          = "pedro@example.com"
} | ConvertTo-Json

curl.exe -X POST "$BASE_URL" `
    -H "Content-Type: application/json" `
    -d $body4

Write-Host "`n✅ Esperado: firstName='Pedro', lastName='González Martínez'" -ForegroundColor Green

# ================================================
# Test 5: Crear con Email Inválido (Error)
# ================================================
Write-Host "`n`n[Test 5] Error - Email inválido" -ForegroundColor Yellow
$body5 = @{
    firstName = "Test"
    lastName  = "User"
    email     = "not-an-email"
} | ConvertTo-Json

curl.exe -X POST "$BASE_URL" `
    -H "Content-Type: application/json" `
    -d $body5

Write-Host "`n❌ Esperado: Error 400 - email must be valid" -ForegroundColor Red

# ================================================
# Test 6: Crear sin firstName (Error)
# ================================================
Write-Host "`n`n[Test 6] Error - firstName faltante" -ForegroundColor Yellow
$body6 = @{
    lastName = "Only Last Name"
} | ConvertTo-Json

curl.exe -X POST "$BASE_URL" `
    -H "Content-Type: application/json" `
    -d $body6

Write-Host "`n❌ Esperado: Error 400 - firstName is required" -ForegroundColor Red

# ================================================
# Test 7: Listar Clientes
# ================================================
Write-Host "`n`n[Test 7] Listar todos los clientes" -ForegroundColor Yellow
curl.exe -X GET "$BASE_URL?limit=10&offset=0"

# ================================================
# Test 8: Buscar por nombre
# ================================================
Write-Host "`n`n[Test 8] Buscar 'María'" -ForegroundColor Yellow
curl.exe -X GET "$BASE_URL?search=María"

# ================================================
# Test 9: Obtener Cliente por ID
# ================================================
Write-Host "`n`n[Test 9] Obtener cliente ID 1" -ForegroundColor Yellow
curl.exe -X GET "$BASE_URL/1"

# ================================================
# Test 10: Actualizar Cliente
# ================================================
Write-Host "`n`n[Test 10] Actualizar teléfono cliente ID 1" -ForegroundColor Yellow
$body10 = @{
    telephone = "555-7777"
    address   = "Nueva Dirección 456"
} | ConvertTo-Json

curl.exe -X PUT "$BASE_URL/1" `
    -H "Content-Type: application/json" `
    -d $body10

# ================================================
# Test 11: Cambiar de CF a Cliente con NIT
# ================================================
Write-Host "`n`n[Test 11] Cambiar CF a NIT" -ForegroundColor Yellow
$body11 = @{
    isFinalConsumer = $false
    nit             = "1234567-8"
} | ConvertTo-Json

curl.exe -X PUT "$BASE_URL/1" `
    -H "Content-Type: application/json" `
    -d $body11

Write-Host "`n✅ Esperado: nit cambia de 'CF' a '1234567-8'" -ForegroundColor Green

# ================================================
# Test 12: NIT con formato inválido (Error)
# ================================================
Write-Host "`n`n[Test 12] Error - NIT con caracteres inválidos" -ForegroundColor Yellow
$body12 = @{
    firstName       = "Test"
    lastName        = "Invalid NIT"
    isFinalConsumer = $false
    nit             = "abc@#$%"
} | ConvertTo-Json

curl.exe -X POST "$BASE_URL" `
    -H "Content-Type: application/json" `
    -d $body12

Write-Host "`n❌ Esperado: Error 400 - NIT pattern invalid" -ForegroundColor Red

# ================================================
# Test 13: Todos los campos opcionales
# ================================================
Write-Host "`n`n[Test 13] Solo campos requeridos" -ForegroundColor Yellow
$body13 = @{
    firstName = "Minimal"
    lastName  = "Test"
} | ConvertTo-Json

curl.exe -X POST "$BASE_URL" `
    -H "Content-Type: application/json" `
    -d $body13

Write-Host "`n✅ Esperado: Creación exitosa con defaults" -ForegroundColor Green

Write-Host "`n`n=== Tests Completados ===" -ForegroundColor Cyan
Write-Host "Revisar respuestas arriba para validar comportamiento" -ForegroundColor Green
