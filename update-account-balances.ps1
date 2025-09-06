# Update Account Balances from Journal Entries
# This script calculates the current balance for each account based on journal entries

$baseUrl = "http://localhost:3000"

# Function to make API calls
function Invoke-ApiCall($method, $endpoint, $body = $null) {
    try {
        $uri = "$baseUrl$endpoint"
        $headers = @{ "Content-Type" = "application/json" }
        
        if ($body) {
            $response = Invoke-RestMethod -Uri $uri -Method $method -Body ($body | ConvertTo-Json -Depth 10) -Headers $headers
        } else {
            $response = Invoke-RestMethod -Uri $uri -Method $method -Headers $headers
        }
        return $response
    }
    catch {
        Write-Host "API Error: $($_.Exception.Message)"
        return $null
    }
}

Write-Host "=== Account Balance Update Tool ===" -ForegroundColor Green
Write-Host ""

# First, let's fetch all journal entries to see what we have
Write-Host "1. Fetching journal entries..." -ForegroundColor Yellow
$journalResponse = Invoke-ApiCall "GET" "/api/finance/journal-entries"

if ($journalResponse -and $journalResponse.data) {
    Write-Host "   Found $($journalResponse.data.Count) journal entries" -ForegroundColor Green
    
    # Let's also check one entry structure
    if ($journalResponse.data.Count -gt 0) {
        $firstEntry = $journalResponse.data[0]
        Write-Host "   Sample entry structure:" -ForegroundColor Cyan
        Write-Host "     ID: $($firstEntry.id)"
        Write-Host "     Entry Number: $($firstEntry.entry_number)"
        Write-Host "     Journal Number: $($firstEntry.journal_number)"
        Write-Host "     Total Amount: $($firstEntry.total_amount)"
        Write-Host "     Total Debit: $($firstEntry.total_debit)"
        Write-Host "     Total Credit: $($firstEntry.total_credit)"
        Write-Host "     Lines Count: $($firstEntry.journal_entry_lines.Count)"
    }
} else {
    Write-Host "   No journal entries found or API error" -ForegroundColor Red
}

Write-Host ""

# Now fetch all accounts
Write-Host "2. Fetching chart of accounts..." -ForegroundColor Yellow
$accountsResponse = Invoke-ApiCall "GET" "/api/finance/chart-of-accounts"

if ($accountsResponse -and $accountsResponse.data) {
    Write-Host "   Found $($accountsResponse.data.Count) accounts" -ForegroundColor Green
    
    # Show current balances
    Write-Host "   Current account balances:" -ForegroundColor Cyan
    $accountsResponse.data | ForEach-Object {
        Write-Host "     $($_.account_code) - $($_.account_name): ₹$($_.current_balance)"
    }
} else {
    Write-Host "   No accounts found or API error" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Analysis Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps needed:" -ForegroundColor Yellow
Write-Host "1. Create API endpoint to calculate account balances from journal entries"
Write-Host "2. Update account balances based on posted journal entries"
Write-Host "3. Consider implementing triggers for automatic balance updates"
