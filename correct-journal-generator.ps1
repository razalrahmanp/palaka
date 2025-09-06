Write-Host "=== CORRECTED JOURNAL ENTRY GENERATOR ===" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"
$headers = @{ "Content-Type" = "application/json" }

# Account IDs from your chart of accounts
$accountIds = @{
    "Cash" = "ee08529b-0cad-4a35-9aa9-97661410b78e"  # 1010
    "AccountsReceivable" = "617b4bba-ff04-4a69-9d83-17f01335b6f1"  # 1200
    "SalesRevenue" = "0b25dd21-ff9c-4923-841b-7b971892a574"  # 4010
}

Write-Host "Testing server connection..." -ForegroundColor Green
try {
    Invoke-RestMethod -Uri "$baseUrl/api/sales/orders" -Headers $headers | Out-Null
    Write-Host "✓ Server is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Server not responding! Run: npm run dev" -ForegroundColor Red
    exit 1
}

Write-Host "Getting sales orders..." -ForegroundColor Green
try {
    $orders = Invoke-RestMethod -Uri "$baseUrl/api/sales/orders" -Headers $headers
    $ordersArray = if ($orders -is [array]) { $orders } else { @() }
    Write-Host "✓ Found $($ordersArray.Count) sales orders" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Failed to get sales orders: $($_.Exception.Message)" -ForegroundColor Red
    $ordersArray = @()
}

Write-Host "Getting payments..." -ForegroundColor Green
try {
    $payments = Invoke-RestMethod -Uri "$baseUrl/api/finance/payments" -Headers $headers
    $paymentsArray = if ($payments -is [array]) { $payments } else { @() }
    Write-Host "✓ Found $($paymentsArray.Count) payments" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Failed to get payments: $($_.Exception.Message)" -ForegroundColor Red
    $paymentsArray = @()
}

if ($ordersArray.Count -eq 0 -and $paymentsArray.Count -eq 0) {
    Write-Host "No data to process!" -ForegroundColor Yellow
    exit 0
}

$salesSuccess = 0
$salesErrors = 0
$salesTotal = 0

Write-Host ""
Write-Host "Processing sales orders..." -ForegroundColor Green
foreach ($order in $ordersArray) {
    $amount = 0
    if ($order.final_price) { $amount = $order.final_price }
    elseif ($order.grand_total) { $amount = $order.grand_total }
    elseif ($order.total) { $amount = $order.total }
    
    if ($amount -le 0) { 
        Write-Host "  → Skipping SO-$($order.id) (no amount)" -ForegroundColor Yellow
        continue 
    }
    
    $salesTotal += $amount
    $customerName = if ($order.customer_name) { $order.customer_name } else { "Customer" }
    
    # Create journal entry with correct API format
    $journalData = @{
        entry_number = "SO-$($order.id)"
        transaction_date = (Get-Date).ToString("yyyy-MM-dd")
        description = "Sale to $customerName"
        reference_number = "SO-$($order.id)"
        lines = @(
            @{
                account_id = $accountIds.AccountsReceivable
                description = "Sales invoice"  
                debit_amount = $amount
                credit_amount = 0
            },
            @{
                account_id = $accountIds.SalesRevenue
                description = "Sales revenue"
                debit_amount = 0
                credit_amount = $amount
            }
        )
    }
    
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/finance/journal-entries" -Method POST -Headers $headers -Body ($journalData | ConvertTo-Json -Depth 5) | Out-Null
        Write-Host "  ✓ Created entry for SO-$($order.id) (Rs.$amount)" -ForegroundColor Green
        $salesSuccess++
    } catch {
        Write-Host "  ✗ Failed SO-$($order.id): $($_.Exception.Message)" -ForegroundColor Red
        $salesErrors++
    }
    Start-Sleep -Milliseconds 100
}

$paymentSuccess = 0
$paymentErrors = 0
$paymentTotal = 0

Write-Host ""
Write-Host "Processing payments..." -ForegroundColor Green
foreach ($payment in $paymentsArray) {
    $amount = if ($payment.amount) { $payment.amount } else { 0 }
    if ($amount -le 0) { 
        Write-Host "  → Skipping PAY-$($payment.id) (no amount)" -ForegroundColor Yellow
        continue 
    }
    
    $paymentTotal += $amount
    
    # Create journal entry with correct API format
    $journalData = @{
        entry_number = "PAY-$($payment.id)"
        transaction_date = (Get-Date).ToString("yyyy-MM-dd")
        description = "Payment received"
        reference_number = "PAY-$($payment.id)"
        lines = @(
            @{
                account_id = $accountIds.Cash
                description = "Cash received"
                debit_amount = $amount
                credit_amount = 0
            },
            @{
                account_id = $accountIds.AccountsReceivable
                description = "Payment applied"
                debit_amount = 0
                credit_amount = $amount
            }
        )
    }
    
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/finance/journal-entries" -Method POST -Headers $headers -Body ($journalData | ConvertTo-Json -Depth 5) | Out-Null
        Write-Host "  ✓ Created entry for PAY-$($payment.id) (Rs.$amount)" -ForegroundColor Green
        $paymentSuccess++
    } catch {
        Write-Host "  ✗ Failed PAY-$($payment.id): $($_.Exception.Message)" -ForegroundColor Red
        $paymentErrors++
    }
    Start-Sleep -Milliseconds 100
}

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor Cyan
Write-Host "Sales Orders:" -ForegroundColor White
Write-Host "  ✓ Success: $salesSuccess" -ForegroundColor Green
Write-Host "  ✗ Errors: $salesErrors" -ForegroundColor Red
Write-Host "  → Total: Rs.$($salesTotal.ToString('N2'))" -ForegroundColor Cyan

Write-Host ""
Write-Host "Payments:" -ForegroundColor White
Write-Host "  ✓ Success: $paymentSuccess" -ForegroundColor Green
Write-Host "  ✗ Errors: $paymentErrors" -ForegroundColor Red
Write-Host "  → Total: Rs.$($paymentTotal.ToString('N2'))" -ForegroundColor Cyan

$totalSuccess = $salesSuccess + $paymentSuccess
$totalErrors = $salesErrors + $paymentErrors

Write-Host ""
if ($totalSuccess -gt 0) {
    Write-Host "🎉 SUCCESS! Created $totalSuccess journal entries" -ForegroundColor Green
    Write-Host "Your financial reports should now show data!" -ForegroundColor Green
} else {
    Write-Host "⚠️ No entries created." -ForegroundColor Yellow
}

if ($totalErrors -gt 0) {
    Write-Host "⚠️ $totalErrors entries failed. Check error messages above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor White
Write-Host "1. Check Financial Reports for data" -ForegroundColor Gray
Write-Host "2. Verify account balances in Chart of Accounts" -ForegroundColor Gray
Write-Host "3. Future transactions will auto-create journal entries" -ForegroundColor Gray
Write-Host ""

$open = Read-Host "Open Financial Reports in browser? (y/N)"
if ($open -eq "y" -or $open -eq "Y") {
    Start-Process "http://localhost:3001/erp/finance"
}
