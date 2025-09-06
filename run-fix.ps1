# Wait for server to be ready
Start-Sleep -Seconds 3

# Make the API call
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/finance/fix-journal-accounts" -Method POST -ContentType "application/json"
    Write-Host "✅ Fix executed successfully!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "❌ Error executing fix:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Read-Host "Press Enter to continue..."
