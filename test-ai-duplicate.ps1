$body = @{
    productName = 'Modern Oak Chair'
    category = 'Furniture'
    subcategory = 'Chairs'
    description = 'Comfortable wooden chair'
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:3000/api/products/check-duplicates' -Method POST -Body $body -ContentType 'application/json'
    
    Write-Host "=== AI Duplicate Detection Result ==="
    Write-Host "Risk Level: $($response.riskLevel)"
    Write-Host "Duplicates Found: $($response.duplicateCount)"
    Write-Host "Message: $($response.message)"
    
    if ($response.duplicates -and $response.duplicates.Count -gt 0) {
        Write-Host "`nTop Matches:"
        $response.duplicates | Select-Object -First 3 | ForEach-Object {
            Write-Host "  - $($_.product_name) ($($_.similarity_score)% similarity)"
            Write-Host "    SKU: $($_.sku)"
            Write-Host "    Reasons: $($_.reasons -join ', ')"
            Write-Host ""
        }
    }
} catch {
    Write-Host "Error testing API: $($_.Exception.Message)"
}
