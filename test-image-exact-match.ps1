$headers = @{
    "Content-Type" = "application/json"
}

# Test 1: With exact same image URL (should find exact match)
Write-Host "Test 1: Testing with exact same image URL..." -ForegroundColor Cyan
$body1 = @{
    imageUrl = "https://my-erp-po-uploads.s3.eu-north-1.amazonaws.com/product_images/f085e033-89bf-4018-847f-f18738ffa987.png"
    productName = "SOFA SETTY"
    threshold = 0.75
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "http://localhost:3000/api/products/check-image-similarity" -Method POST -Headers $headers -Body $body1
    Write-Host "✅ Response:" -ForegroundColor Green
    Write-Host "  Risk Level: $($response1.riskLevel)" -ForegroundColor Yellow
    Write-Host "  Has Matches: $($response1.hasMatches)" -ForegroundColor Yellow
    Write-Host "  Match Count: $($response1.matchCount)" -ForegroundColor Yellow
    Write-Host "  Message: $($response1.message)" -ForegroundColor White
    
    if ($response1.matches) {
        Write-Host "  Matches Found:" -ForegroundColor Cyan
        $response1.matches | ForEach-Object { 
            Write-Host "    - $($_.product_name) (SKU: $($_.sku)) - $($_.similarity_score)% match" -ForegroundColor Gray 
        }
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: With completely different image
Write-Host "`nTest 2: Testing with different image URL..." -ForegroundColor Cyan
$body2 = @{
    imageUrl = "https://example.com/different-chair.jpg"
    productName = "Different Chair"
    threshold = 0.75
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "http://localhost:3000/api/products/check-image-similarity" -Method POST -Headers $headers -Body $body2
    Write-Host "✅ Response:" -ForegroundColor Green
    Write-Host "  Risk Level: $($response2.riskLevel)" -ForegroundColor Yellow
    Write-Host "  Has Matches: $($response2.hasMatches)" -ForegroundColor Yellow
    Write-Host "  Match Count: $($response2.matchCount)" -ForegroundColor Yellow
    Write-Host "  Message: $($response2.message)" -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Testing complete!" -ForegroundColor Cyan
