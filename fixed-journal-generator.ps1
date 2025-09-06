Write-Host "=== JOURNAL ENTRY GENERATOR - FIXED ===" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"
$headers = @{ "Content-Type" = "application/json" }

Write-Host "Testing server connection..." -ForegroundColor Green
try {
    # Use the finance sales orders endpoint which seems to work
    $test = Invoke-RestMethod -Uri "$baseUrl/api/finance/sales-orders" -Headers $headers
    Write-Host "Server is running" -ForegroundColor Green
} catch {
    Write-Host "Server not responding! Run: npm run dev" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "Getting chart of accounts..." -ForegroundColor Green
try {
    $accounts = Invoke-RestMethod -Uri "$baseUrl/api/finance/chart-of-accounts" -Headers $headers
    $accountsArray = if ($accounts.data -is [array]) { $accounts.data } else { @() }
    Write-Host "Found $($accountsArray.Count) accounts" -ForegroundColor Cyan
    
    # Create account code to ID mapping
    $accountMap = @{}
    foreach ($account in $accountsArray) {
        $accountMap[$account.account_code] = $account.id
    }
    
    Write-Host "Account mappings:" -ForegroundColor Yellow
    Write-Host "  1200 (AR): $($accountMap['1200'])" -ForegroundColor Gray
    Write-Host "  4010 (Sales): $($accountMap['4010'])" -ForegroundColor Gray
    Write-Host "  1010 (Cash): $($accountMap['1010'])" -ForegroundColor Gray
    
} catch {
    Write-Host "Failed to get chart of accounts: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "Getting sales orders..." -ForegroundColor Green
try {
    $salesResponse = Invoke-RestMethod -Uri "$baseUrl/api/finance/sales-orders" -Headers $headers
    $ordersArray = if ($salesResponse.orders -is [array]) { $salesResponse.orders } else { @() }
    Write-Host "Found $($ordersArray.Count) sales orders" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to get sales orders: $($_.Exception.Message)" -ForegroundColor Red
    $ordersArray = @()
}

Write-Host "Getting payments..." -ForegroundColor Green
try {
    $payments = Invoke-RestMethod -Uri "$baseUrl/api/finance/payments" -Headers $headers
    $paymentsArray = if ($payments -is [array]) { $payments } else { @() }
    Write-Host "Found $($paymentsArray.Count) payments" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to get payments: $($_.Exception.Message)" -ForegroundColor Red
    $paymentsArray = @()
}

$salesSuccess = 0
$paymentSuccess = 0
$counter = 1

# Verify required accounts exist
if (-not $accountMap['1200'] -or -not $accountMap['4010'] -or -not $accountMap['1010']) {
    Write-Host "Required accounts missing!" -ForegroundColor Red
    Write-Host "Please ensure these accounts exist in Chart of Accounts:" -ForegroundColor Yellow
    Write-Host "  1200 - Accounts Receivable" -ForegroundColor Gray
    Write-Host "  4010 - Sales Revenue" -ForegroundColor Gray  
    Write-Host "  1010 - Cash" -ForegroundColor Gray
    exit 1
}

Write-Host "Processing sales orders..." -ForegroundColor Green
foreach ($order in $ordersArray) {
    $amount = 0
    if ($order.final_price) { $amount = $order.final_price }
    elseif ($order.total) { $amount = $order.total }
    
    if ($amount -le 0) { 
        Write-Host "  Skipping SO-$($order.id) (no amount)" -ForegroundColor Yellow
        continue 
    }
    
    $entryNumber = "JE-$(Get-Date -Format 'yyyyMMdd')-$($counter.ToString('D3'))"
    $counter++
    
    $journalData = @{
        entry_number = $entryNumber
        transaction_date = (Get-Date).ToString("yyyy-MM-dd")
        description = "Sale to $($order.customer.name)"
        reference_number = "SO-$($order.id)"
        lines = @(
            @{
                account_id = $accountMap['1200']  # AR account ID
                description = "Sales invoice"
                debit_amount = $amount
                credit_amount = 0
            },
            @{
                account_id = $accountMap['4010']  # Sales account ID
                description = "Sales revenue"
                debit_amount = 0
                credit_amount = $amount
            }
        )
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/finance/journal-entries" -Method POST -Headers $headers -Body ($journalData | ConvertTo-Json -Depth 5)
        Write-Host "  ✓ Created entry for SO-$($order.id) (Rs.$amount)" -ForegroundColor Green
        $salesSuccess++
    } catch {
        Write-Host "  ✗ Failed SO-$($order.id): $($_.Exception.Message)" -ForegroundColor Red
        # Show more detail for debugging
        if ($_.Exception.Response) {
            $errorResponse = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorResponse)
            $errorContent = $reader.ReadToEnd()
            Write-Host "    Error details: $errorContent" -ForegroundColor Red
        }
    }
    Start-Sleep -Milliseconds 100
}

Write-Host "Processing payments..." -ForegroundColor Green
foreach ($payment in $paymentsArray) {
    $amount = if ($payment.amount) { $payment.amount } else { 0 }
    if ($amount -le 0) { 
        Write-Host "  Skipping PAY-$($payment.id) (no amount)" -ForegroundColor Yellow
        continue 
    }
    
    $entryNumber = "JE-$(Get-Date -Format 'yyyyMMdd')-$($counter.ToString('D3'))"
    $counter++
    
    $journalData = @{
        entry_number = $entryNumber
        transaction_date = (Get-Date).ToString("yyyy-MM-dd")
        description = "Payment received"
        reference_number = "PAY-$($payment.id)"
        lines = @(
            @{
                account_id = $accountMap['1001']  # Cash account ID
                description = "Cash received"
                debit_amount = $amount
                credit_amount = 0
            },
            @{
                account_id = $accountMap['1200']  # AR account ID
                description = "Payment applied"
                debit_amount = 0
                credit_amount = $amount
            }
        )
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/finance/journal-entries" -Method POST -Headers $headers -Body ($journalData | ConvertTo-Json -Depth 5)
        Write-Host "  ✓ Created entry for PAY-$($payment.id) (Rs.$amount)" -ForegroundColor Green
        $paymentSuccess++
    } catch {
        Write-Host "  ✗ Failed PAY-$($payment.id): $($_.Exception.Message)" -ForegroundColor Red
        # Show more detail for debugging
        if ($_.Exception.Response) {
            $errorResponse = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorResponse)
            $errorContent = $reader.ReadToEnd()
            Write-Host "    Error details: $errorContent" -ForegroundColor Red
        }
    }
    Start-Sleep -Milliseconds 100
}

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor Cyan
Write-Host "Sales orders processed: $salesSuccess" -ForegroundColor Green
Write-Host "Payments processed: $paymentSuccess" -ForegroundColor Green
$total = $salesSuccess + $paymentSuccess
Write-Host "Total journal entries created: $total" -ForegroundColor White

if ($total -gt 0) {
    Write-Host ""
    Write-Host "SUCCESS! Your financial reports should now show data!" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Check Financial Reports" -ForegroundColor Gray
    Write-Host "  2. Verify account balances" -ForegroundColor Gray
    Write-Host "  3. Future transactions will auto-create entries" -ForegroundColor Gray
}

Write-Host ""
$open = Read-Host "Open Financial Reports? (y/N)"
if ($open -eq "y") {
    Start-Process "http://localhost:3001/erp/finance"
}
