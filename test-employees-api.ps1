$data = Invoke-RestMethod 'http://localhost:3000/api/sales/representatives'
Write-Host "Sales Representatives found: $($data.Count)"
$data | Select-Object -First 3 | ForEach-Object {
    Write-Host "  Email: $($_.email) | Role: $($_.role) | ID: $($_.id)"
}
