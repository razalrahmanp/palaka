$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    imageUrl = "https://example.com/sample-chair.jpg"
    productName = "Test Chair"
    threshold = 0.75
} | ConvertTo-Json

try {
    Write-Host "Testing Image Similarity API..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/products/check-image-similarity" -Method POST -Headers $headers -Body $body
    
    Write-Host "✅ Success! API Response:" -ForegroundColor Green
    Write-Host "Risk Level: $($response.riskLevel)" -ForegroundColor Yellow
    Write-Host "Has Matches: $($response.hasMatches)" -ForegroundColor Yellow
    Write-Host "Match Count: $($response.matchCount)" -ForegroundColor Yellow
    Write-Host "Message: $($response.message)" -ForegroundColor White
    
    if ($response.recommendations) {
        Write-Host "Recommendations:" -ForegroundColor Cyan
        $response.recommendations | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}
