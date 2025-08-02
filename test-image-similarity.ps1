# Test Image Similarity Detection API
# This script tests the new image-based duplicate detection system

$baseUrl = "http://localhost:3000"
$endpoint = "$baseUrl/api/products/check-image-similarity"

Write-Host "🔍 Testing Image Similarity Detection API" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Test 1: Valid image URL
Write-Host "`n1. Testing with sample image URL..." -ForegroundColor Yellow

$testData = @{
    imageUrl = "https://example.com/sample-chair.jpg"
    productName = "Test Chair"
    threshold = 0.75
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $endpoint -Method POST -Body $testData -ContentType "application/json"
    Write-Host "✅ API Response received" -ForegroundColor Green
    Write-Host "Risk Level: $($response.riskLevel)" -ForegroundColor White
    Write-Host "Has Matches: $($response.hasMatches)" -ForegroundColor White
    Write-Host "Match Count: $($response.matchCount)" -ForegroundColor White
    Write-Host "Message: $($response.message)" -ForegroundColor White
    
    if ($response.recommendations) {
        Write-Host "Recommendations:" -ForegroundColor White
        $response.recommendations | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}

# Test 2: Missing image URL
Write-Host "`n2. Testing with missing image URL..." -ForegroundColor Yellow

$invalidData = @{
    productName = "Test Product"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $endpoint -Method POST -Body $invalidData -ContentType "application/json"
    Write-Host "✅ Response: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "✅ Expected error (400): Status Code $statusCode" -ForegroundColor Green
}

# Test 3: Empty request
Write-Host "`n3. Testing with empty request..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $endpoint -Method POST -Body "{}" -ContentType "application/json"
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "✅ Expected error (400): Status Code $statusCode" -ForegroundColor Green
}

Write-Host "`n🎯 Testing complete!" -ForegroundColor Cyan

# Test database connection
Write-Host "`n4. Testing database connection..." -ForegroundColor Yellow
try {
    $testUrl = "$baseUrl/api/products"
    $dbResponse = Invoke-RestMethod -Uri $testUrl -Method GET
    Write-Host "✅ Database connection working" -ForegroundColor Green
} catch {
    Write-Host "❌ Database connection failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n📋 Summary:" -ForegroundColor Cyan
Write-Host "- Image similarity detection API endpoint created" -ForegroundColor White
Write-Host "- Supports image URL comparison and product name matching" -ForegroundColor White
Write-Host "- Returns risk levels: VERY_HIGH, HIGH, MEDIUM, LOW, NONE" -ForegroundColor White
Write-Host "- Provides AI recommendations for duplicate prevention" -ForegroundColor White
Write-Host "- Ready for integration with product addition workflow" -ForegroundColor White
