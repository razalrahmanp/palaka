# Validate Journal Entry Account IDs
# Check if the account IDs in journal entries match chart of accounts

Write-Host "=== Journal Entry Account ID Validation ===" -ForegroundColor Green
Write-Host ""

# First, let's check the account IDs we used in our journal entry scripts
Write-Host "Account IDs used in journal entry creation:" -ForegroundColor Yellow

# These were the account IDs used in our PowerShell scripts
$accountIds = @{
    "ACCOUNTS_RECEIVABLE_ID" = "af83d9b5-e269-4ca9-9f58-8a2e58a01234"
    "SALES_REVENUE_ID" = "cf84e9c6-f379-5db0-0f69-9b3f69b01345" 
    "CASH_ID" = "df85f0d7-g480-6ec1-1f70-0c4g70c01456"
}

$accountIds.GetEnumerator() | ForEach-Object {
    Write-Host "  $($_.Key): $($_.Value)"
}

Write-Host ""
Write-Host "We need to verify these IDs exist in the chart_of_accounts table." -ForegroundColor Yellow
Write-Host "If they don't exist, that's why balances are showing as ₹0." -ForegroundColor Red
Write-Host ""

# Let's also check what we can find in our journal creation scripts
$salesScript = "g:\PROJECT\Al_Rams\palaka\palaka\palaka\complete-historical-journals.ps1"
$paymentScript = "g:\PROJECT\Al_Rams\palaka\palaka\palaka\payment-journals.ps1"

if (Test-Path $salesScript) {
    Write-Host "Checking sales journal script for account IDs..." -ForegroundColor Cyan
    $salesContent = Get-Content $salesScript -Raw
    
    if ($salesContent -match 'ACCOUNTS_RECEIVABLE_ID\s*=\s*"([^"]+)"') {
        Write-Host "  Sales Script AR ID: $($Matches[1])"
    }
    if ($salesContent -match 'SALES_REVENUE_ID\s*=\s*"([^"]+)"') {
        Write-Host "  Sales Script Sales ID: $($Matches[1])"
    }
}

if (Test-Path $paymentScript) {
    Write-Host "Checking payment journal script for account IDs..." -ForegroundColor Cyan
    $paymentContent = Get-Content $paymentScript -Raw
    
    if ($paymentContent -match 'CASH_ID\s*=\s*"([^"]+)"') {
        Write-Host "  Payment Script Cash ID: $($Matches[1])"
    }
    if ($paymentContent -match 'ACCOUNTS_RECEIVABLE_ID\s*=\s*"([^"]+)"') {
        Write-Host "  Payment Script AR ID: $($Matches[1])"
    }
}

Write-Host ""
Write-Host "SOLUTION STEPS:" -ForegroundColor Green
Write-Host "1. Check if these account IDs exist in chart_of_accounts"
Write-Host "2. If not, update journal entries with correct account IDs"
Write-Host "3. Or create the missing accounts in chart_of_accounts"
Write-Host "4. Refresh the chart of accounts to see updated balances"
