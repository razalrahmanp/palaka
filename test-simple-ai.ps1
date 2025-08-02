$body = @{
    productName = 'Test Chair'
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:3000/api/products/check-duplicates' -Method POST -Body $body -ContentType 'application/json'
    Write-Host "Success! Risk Level: $($response.riskLevel)"
    Write-Host "Message: $($response.message)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)"
    }
}
