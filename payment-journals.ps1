# Payment Journal Entry Generator
$baseUrl = "http://localhost:3001"

# Account IDs
$cashAccountId = "ee08529b-0cad-4a35-9aa9-97661410b78e"  # Cash
$arAccountId = "617b4bba-ff04-4a69-9d83-17f01335b6f1"   # Accounts Receivable

Write-Host "=== Payment Journal Entry Generator ===" -ForegroundColor Green

try {
    # Get payments
    $payments = Invoke-RestMethod -Uri "$baseUrl/api/finance/payments" -Method GET  
    # Note: payments API returns direct array, not wrapped in data property
    
    # Get a valid user ID from sales orders
    $salesOrdersResponse = Invoke-RestMethod -Uri "$baseUrl/api/finance/sales-orders" -Method GET
    $validUserId = ($salesOrdersResponse.orders | Where-Object { $_.sales_representative -ne $null } | Select-Object -First 1).sales_representative.id
    
    Write-Host "Found $($payments.Count) payments" -ForegroundColor Green
    Write-Host "Using user ID: $validUserId" -ForegroundColor Cyan
    
    $successCount = 0
    $errorCount = 0
    
    # Process ALL payments for journal entries
    Write-Host ""
    Write-Host "Processing Payments..." -ForegroundColor Yellow
    foreach ($payment in $payments) {
        Write-Host "Checking payment: $($payment.id) - Amount: $($payment.amount)" -ForegroundColor Gray
        if ($payment.amount -and $payment.amount -gt 0) {
            $timestamp = Get-Date -Format "yyyyMMdd-HHmmss-fff"
            $paymentDate = if ($payment.payment_date) { $payment.payment_date } else { "2025-09-06" }
            $journalEntry = @{
                journal_number = "JE-PAY-$($payment.id.Substring(0,8))-$timestamp"
                entry_date = $paymentDate
                description = "Payment Received - $($payment.customer_name) - Amount: $($payment.amount)"
                reference_number = $payment.id
                total_debit = $payment.amount
                total_credit = $payment.amount
                created_by = $validUserId
                lines = @(
                    @{
                        line_number = 1
                        account_id = $cashAccountId
                        debit_amount = $payment.amount
                        credit_amount = 0
                        description = "Cash Receipt - $($payment.customer_name)"
                    },
                    @{
                        line_number = 2
                        account_id = $arAccountId
                        debit_amount = 0
                        credit_amount = $payment.amount
                        description = "Accounts Receivable Collection - $($payment.customer_name)"
                    }
                )
            }
            
            try {
                $result = Invoke-RestMethod -Uri "$baseUrl/api/finance/journal-entries" -Method POST -Body ($journalEntry | ConvertTo-Json -Depth 5) -ContentType "application/json"
                Write-Host "  Success: Payment $($payment.id.Substring(0,8)) - Customer: $($payment.customer_name) - Amount: $($payment.amount)" -ForegroundColor Green
                $successCount++
            }
            catch {
                Write-Host "  Failed: Payment $($payment.id.Substring(0,8)) - $($_.Exception.Message)" -ForegroundColor Red
                $errorCount++
            }
        }
    }
    
    Write-Host ""
    Write-Host "=== Payment Journal Summary ===" -ForegroundColor Green
    Write-Host "Payment journal entries created: $successCount" -ForegroundColor Green
    Write-Host "Payment journal entries failed: $errorCount" -ForegroundColor Red
    Write-Host "Total payments processed: $($successCount + $errorCount)" -ForegroundColor White
    
} catch {
    Write-Host "Error occurred: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Payment journal entry generation completed!" -ForegroundColor Green
