# Complete Historical Journal Entry Generator
$baseUrl = "http://localhost:3001"

# Account IDs
$cashAccountId = "ee08529b-0cad-4a35-9aa9-97661410b78e"
$arAccountId = "617b4bba-ff04-4a69-9d83-17f01335b6f1"
$salesAccountId = "0b25dd21-ff9c-4923-841b-7b971892a574"

Write-Host "=== Complete Historical Journal Entry Generator ===" -ForegroundColor Green
Write-Host "Creating journal entries for ALL historical sales orders and payments..." -ForegroundColor Yellow

try {
    $salesOrdersResponse = Invoke-RestMethod -Uri "$baseUrl/api/finance/sales-orders" -Method GET
    $salesOrders = $salesOrdersResponse.orders
    
    $paymentsResponse = Invoke-RestMethod -Uri "$baseUrl/api/finance/payments" -Method GET  
    $payments = $paymentsResponse.data
    
    # Get a valid user ID from sales orders
    $validUserId = ($salesOrders | Where-Object { $_.sales_representative -ne $null } | Select-Object -First 1).sales_representative.id
    
    Write-Host "Found $($salesOrders.count) sales orders" -ForegroundColor Green
    Write-Host "Found $($payments.count) payments" -ForegroundColor Green
    Write-Host "Using user ID: $validUserId" -ForegroundColor Cyan
    
    $successCount = 0
    $errorCount = 0
    
    # Process ALL sales orders for journal entries
    Write-Host ""
    Write-Host "Processing Sales Orders..." -ForegroundColor Yellow
    foreach ($order in $salesOrders) {
        if ($order.total -and $order.total -gt 0) {
            $journalEntry = @{
                journal_number = "JE-SO-$($order.id.Substring(0,8))"
                entry_date = $order.date
                description = "Sales Order - $($order.customer.name) - Total: $($order.total)"
                reference_number = $order.id
                total_debit = $order.total
                total_credit = $order.total
                created_by = $validUserId
                lines = @(
                    @{
                        line_number = 1
                        account_id = $arAccountId
                        debit_amount = $order.total
                        credit_amount = 0
                        description = "Accounts Receivable - $($order.customer.name)"
                    },
                    @{
                        line_number = 2
                        account_id = $salesAccountId
                        debit_amount = 0
                        credit_amount = $order.total
                        description = "Sales Revenue - $($order.customer.name)"
                    }
                )
            }
            
            try {
                Invoke-RestMethod -Uri "$baseUrl/api/finance/journal-entries" -Method POST -Body ($journalEntry | ConvertTo-Json -Depth 5) -ContentType "application/json"
                Write-Host "  Success: Sales Order $($order.id.Substring(0,8)) - Amount: $($order.total)" -ForegroundColor Green
                $successCount++
            }
            catch {
                Write-Host "  Failed: Sales Order $($order.id.Substring(0,8)) - $($_.Exception.Message)" -ForegroundColor Red
                $errorCount++
            }
        }
    }
    
    # Process ALL payments for journal entries
    Write-Host ""
    Write-Host "Processing Payments..." -ForegroundColor Yellow
    foreach ($payment in $payments) {
        if ($payment.amount -and $payment.amount -gt 0) {
            $journalEntry = @{
                journal_number = "JE-PAY-$($payment.id.Substring(0,8))"
                entry_date = $payment.payment_date
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
                Invoke-RestMethod -Uri "$baseUrl/api/finance/journal-entries" -Method POST -Body ($journalEntry | ConvertTo-Json -Depth 5) -ContentType "application/json"
                Write-Host "  Success: Payment $($payment.id.Substring(0,8)) - Amount: $($payment.amount)" -ForegroundColor Green
                $successCount++
            }
            catch {
                Write-Host "  Failed: Payment $($payment.id.Substring(0,8)) - $($_.Exception.Message)" -ForegroundColor Red
                $errorCount++
            }
        }
    }
    
    Write-Host ""
    Write-Host "=== Final Summary ===" -ForegroundColor Green
    Write-Host "Journal entries created successfully: $successCount" -ForegroundColor Green
    Write-Host "Journal entries failed: $errorCount" -ForegroundColor Red
    Write-Host "Total processed: $($successCount + $errorCount)" -ForegroundColor White
    
    if ($successCount -gt 0) {
        Write-Host ""
        Write-Host "SUCCESS! Your financial reports should now show historical data!" -ForegroundColor Green
        Write-Host "Check the Finance dashboard at: $baseUrl/(erp)/finance" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "What was created:" -ForegroundColor Yellow
        Write-Host "- Sales Orders: Journal entries for revenue recognition" -ForegroundColor White
        Write-Host "- Payments: Journal entries for cash receipts" -ForegroundColor White
        Write-Host "- All entries are properly balanced (Debits = Credits)" -ForegroundColor White
    }
    
} catch {
    Write-Host "Error occurred: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Historical journal entry generation completed!" -ForegroundColor Green
