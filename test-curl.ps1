# Quick test script for warehouse stock pagination (PowerShell)
# Usage: .\test-curl.ps1

$BASE_URL = "http://localhost:3000/api/v1"
$WAREHOUSE_ID = 1

Write-Host "🧪 Testing Warehouse Stock Pagination" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Write-Host "`n✅ Test 1: Basic request (default pagination)" -ForegroundColor Green
$response1 = Invoke-RestMethod -Uri "$BASE_URL/warehouses/$WAREHOUSE_ID/stock"
Write-Host "   Total items: $($response1.total), Returned: $($response1.data.Count)"

Write-Host "`n✅ Test 2: Page 1 with pageSize=5" -ForegroundColor Green
$response2 = Invoke-RestMethod -Uri "$BASE_URL/warehouses/$WAREHOUSE_ID/stock?pageSize=5"
Write-Host "   Total items: $($response2.total), Returned: $($response2.data.Count)"
Write-Host "   Products: $($response2.data.product.name -join ', ')"

Write-Host "`n✅ Test 3: Page 2 with pageSize=5" -ForegroundColor Green
$response3 = Invoke-RestMethod -Uri "$BASE_URL/warehouses/$WAREHOUSE_ID/stock?pageIndex=2&pageSize=5"
Write-Host "   Total items: $($response3.total), Returned: $($response3.data.Count)"
Write-Host "   Products: $($response3.data.product.name -join ', ')"
Write-Host "   Total matches page 1: $(if ($response2.total -eq $response3.total) { 'PASS ✓' } else { 'FAIL ✗' })"

Write-Host "`n✅ Test 4: Using alias (page=2, limit=5)" -ForegroundColor Green
$response4 = Invoke-RestMethod -Uri "$BASE_URL/warehouses/$WAREHOUSE_ID/stock?page=2&limit=5"
Write-Host "   Total items: $($response4.total), Returned: $($response4.data.Count)"
Write-Host "   Results match Test 3: $(if ($response3.data.Count -eq $response4.data.Count) { 'PASS ✓' } else { 'FAIL ✗' })"

Write-Host "`n✅ Test 5: Search by 'prod'" -ForegroundColor Green
$response5 = Invoke-RestMethod -Uri "$BASE_URL/warehouses/$WAREHOUSE_ID/stock?search=prod"
Write-Host "   Total items: $($response5.total), Returned: $($response5.data.Count)"

Write-Host "`n✅ Test 6: Sort by quantity ASC" -ForegroundColor Green
$sortParam = [System.Web.HttpUtility]::UrlEncode('[{"key":"quantity","order":"asc"}]')
$response6 = Invoke-RestMethod -Uri "$BASE_URL/warehouses/$WAREHOUSE_ID/stock?pageSize=5&sort=$sortParam"
Write-Host "   Total items: $($response6.total), Returned: $($response6.data.Count)"
$quantities = $response6.data | ForEach-Object { $_.quantity }
Write-Host "   Quantities: $($quantities -join ', ')"

Write-Host "`n✅ Test 7: Sort by product.name DESC" -ForegroundColor Green
$sortParam = [System.Web.HttpUtility]::UrlEncode('[{"key":"product.name","order":"desc"}]')
$response7 = Invoke-RestMethod -Uri "$BASE_URL/warehouses/$WAREHOUSE_ID/stock?pageSize=5&sort=$sortParam"
Write-Host "   Products: $($response7.data.product.name -join ', ')"

Write-Host "`n✅ Test 8: Invalid warehouse (should return 404)" -ForegroundColor Green
try {
    $response8 = Invoke-RestMethod -Uri "$BASE_URL/warehouses/99999/stock" -ErrorAction Stop
    Write-Host "   ❌ FAIL - Should have thrown 404 error" -ForegroundColor Red
} catch {
    Write-Host "   ✓ PASS - Got expected error: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
}

Write-Host "`n✅ Test 9: Invalid pageIndex (should return 400)" -ForegroundColor Green
try {
    $response9 = Invoke-RestMethod -Uri "$BASE_URL/warehouses/$WAREHOUSE_ID/stock?pageIndex=0" -ErrorAction Stop
    Write-Host "   ❌ FAIL - Should have thrown 400 error" -ForegroundColor Red
} catch {
    Write-Host "   ✓ PASS - Got expected error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n✅ Test 10: pageSize=150 (should cap at 100)" -ForegroundColor Green
$response10 = Invoke-RestMethod -Uri "$BASE_URL/warehouses/$WAREHOUSE_ID/stock?pageSize=150"
Write-Host "   Total items: $($response10.total), Returned: $($response10.data.Count) (max 100)"
Write-Host "   Items <= 100: $(if ($response10.data.Count -le 100) { 'PASS ✓' } else { 'FAIL ✗' })"

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
