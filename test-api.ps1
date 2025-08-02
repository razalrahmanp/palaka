$data = Invoke-RestMethod 'http://localhost:3000/api/sales/representatives'
Write-Host "Total Sales Representatives found: $($data.Count)"
Write-Host "First 3 representatives:"
$data | Select-Object -First 3 | ForEach-Object {
    Write-Host "  Email: $($_.email) | Role: $($_.role)"
}
