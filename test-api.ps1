$response = Invoke-RestMethod -Uri 'http://localhost:3000/api/finance/journal-entries' -Method Get
Write-Host "API Status: Success"
Write-Host "Total entries:" $response.data.Count

if ($response.data.Count -gt 0) {
    $first = $response.data[0]
    Write-Host "First entry:"
    Write-Host "  ID:" $first.id
    Write-Host "  Entry Number:" $first.entry_number
    Write-Host "  Journal Number:" $first.journal_number
    Write-Host "  Transaction Date:" $first.transaction_date
    Write-Host "  Entry Date:" $first.entry_date
    Write-Host "  Total Amount:" $first.total_amount
    Write-Host "  Total Debit:" $first.total_debit
    Write-Host "  Total Credit:" $first.total_credit
    Write-Host "  Status:" $first.status
    Write-Host "  Lines Count:" $first.journal_entry_lines.Count
}
