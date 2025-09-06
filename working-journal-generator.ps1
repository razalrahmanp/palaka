Write-Host "=== CORRECTED JOURNAL ENTRY GENERATOR ===" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"
$headers = @{ "Content-Type" = "application/json" }

# Account IDs from chart of accounts
$cashId = "ee08529b-0cad-4a35-9aa9-97661410b78e"  # 1010 Cash
$receivablesId = "617b4bba-ff04-4a69-9d83-17f01335b6f1"  # 1200 Accounts Receivable  
$salesId = "0b25dd21-ff9c-4923-841b-7b971892a574"  # 4010 Sales Revenue

Write-Host "Testing server..." -ForegroundColor Green
try {
    Invoke-RestMethod -Uri "$baseUrl/api/sales/orders" -Headers $headers | Out-Null
    Write-Host "Server OK" -ForegroundColor Green
} catch {
    Write-Host "Server error! Run: npm run dev" -ForegroundColor Red
    exit 1
}

Write-Host "Getting sales orders..." -ForegroundColor Green
try {
    $orders = Invoke-RestMethod -Uri "$baseUrl/api/sales/orders" -Headers $headers
    $ordersArray = if ($orders -is [array]) { $orders } else { @() }
    Write-Host "Found $($ordersArray.Count) sales orders" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to get sales orders" -ForegroundColor Red
    $ordersArray = @()
}

Write-Host "Getting payments..." -ForegroundColor Green
try {
    $payments = Invoke-RestMethod -Uri "$baseUrl/api/finance/payments" -Headers $headers
    $paymentsArray = if ($payments -is [array]) { $payments } else { @() }
    Write-Host "Found $($paymentsArray.Count) payments" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to get payments" -ForegroundColor Red
    $paymentsArray = @()
}

$salesSuccess = 0
$paymentSuccess = 0

Write-Host ""
Write-Host "Processing sales orders..." -ForegroundColor Green
foreach ($order in $ordersArray) {
    $amount = 0
    if ($order.final_price) { $amount = $order.final_price }
    elseif ($order.grand_total) { $amount = $order.grand_total }
    elseif ($order.total) { $amount = $order.total }
    
    if ($amount -le 0) { continue }
    
    $journalData = @{
        entry_number = "SO-$($order.id)"
        transaction_date = (Get-Date).ToString("yyyy-MM-dd")
        description = "Sale to Customer"
        reference_number = "SO-$($order.id)"
        lines = @(
            @{
                account_id = $receivablesId
                description = "Sales invoice"
                debit_amount = $amount
                credit_amount = 0
            },
            @{
                account_id = $salesId
                description = "Sales revenue"
                debit_amount = 0
                credit_amount = $amount
            }
        )
    }
    
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/finance/journal-entries" -Method POST -Headers $headers -Body ($journalData | ConvertTo-Json -Depth 5) | Out-Null
        Write-Host "Created SO-$($order.id)" -ForegroundColor Green
        $salesSuccess++
    } catch {
        Write-Host "Failed SO-$($order.id)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Processing payments..." -ForegroundColor Green
foreach ($payment in $paymentsArray) {
    $amount = if ($payment.amount) { $payment.amount } else { 0 }
    if ($amount -le 0) { continue }
    
    $journalData = @{
        entry_number = "PAY-$($payment.id)"
        transaction_date = (Get-Date).ToString("yyyy-MM-dd")
        description = "Payment received"
        reference_number = "PAY-$($payment.id)"
        lines = @(
            @{
                account_id = $cashId
                description = "Cash received"
                debit_amount = $amount
                credit_amount = 0
            },
            @{
                account_id = $receivablesId
                description = "Payment applied"
                debit_amount = 0
                credit_amount = $amount
            }
        )
    }
    
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/finance/journal-entries" -Method POST -Headers $headers -Body ($journalData | ConvertTo-Json -Depth 5) | Out-Null
        Write-Host "Created PAY-$($payment.id)" -ForegroundColor Green
        $paymentSuccess++
    } catch {
        Write-Host "Failed PAY-$($payment.id)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor Cyan
Write-Host "Sales orders processed: $salesSuccess" -ForegroundColor Green
Write-Host "Payments processed: $paymentSuccess" -ForegroundColor Green
$total = $salesSuccess + $paymentSuccess
Write-Host "Total journal entries: $total" -ForegroundColor White

if ($total -gt 0) {
    Write-Host ""
    Write-Host "SUCCESS! Your financial reports should now show data!" -ForegroundColor Green
}

Write-Host ""
$open = Read-Host "Open Financial Reports? (y/N)"
if ($open -eq "y") {
    Start-Process "http://localhost:3001/erp/finance"
}
