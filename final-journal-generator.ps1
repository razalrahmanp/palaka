# Final Journal Entry Generator - Direct Database with Correct Schema
$baseUrl = "http://localhost:3001"

# Account IDs from chart of accounts 
$cashAccountId = "ee08529b-0cad-4a35-9aa9-97661410b78e"  # Cash (1010)
$arAccountId = "617b4bba-ff04-4a69-9d83-17f01335b6f1"   # Accounts Receivable (1200)
$salesAccountId = "0b25dd21-ff9c-4923-841b-7b971892a574" # Sales Revenue (4010)

Write-Host "=== Final Journal Entry Generator ===" -ForegroundColor Green
Write-Host "Getting data from correct endpoints..." -ForegroundColor Yellow

try {
    # Get sales orders from correct endpoint
    $salesOrdersResponse = Invoke-RestMethod -Uri "$baseUrl/api/finance/sales-orders" -Method GET
    $salesOrders = $salesOrdersResponse.data
    
    # Get payments
    $paymentsResponse = Invoke-RestMethod -Uri "$baseUrl/api/finance/payments" -Method GET
    $payments = $paymentsResponse.data
    
    Write-Host "Found $($salesOrders.count) sales orders" -ForegroundColor Green
    Write-Host "Found $($payments.count) payments" -ForegroundColor Green
    
    $journalEntries = @()
    $entryCounter = 1
    
    # Process Sales Orders - Create Journal Entries for Sales Revenue
    Write-Host ""
    Write-Host "Processing Sales Orders..." -ForegroundColor Yellow
    foreach ($order in $salesOrders) {
        if ($order.total -and $order.total -gt 0) {
            $journalEntry = @{
                journal_number = "JE-SO-$($order.id.Substring(0,8))"
                entry_date = $order.date
                description = "Sales Order - $($order.customer.name) - Order Total: $($order.total)"
                reference_number = $order.id
                total_debit = $order.total
                total_credit = $order.total
                created_by = "00000000-0000-0000-0000-000000000000"  # System user
                lines = @(
                    @{
                        account_id = $arAccountId
                        debit_amount = $order.total
                        credit_amount = 0
                        description = "Accounts Receivable - $($order.customer.name)"
                    },
                    @{
                        account_id = $salesAccountId  
                        debit_amount = 0
                        credit_amount = $order.total
                        description = "Sales Revenue - $($order.customer.name)"
                    }
                )
            }
            $journalEntries += $journalEntry
            Write-Host "  Created journal entry for Order $($order.id.Substring(0,8)) - Amount: $($order.total)" -ForegroundColor Cyan
        }
    }
    
    # Process Payments - Create Journal Entries for Cash Receipts  
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
                created_by = "00000000-0000-0000-0000-000000000000"  # System user
                lines = @(
                    @{
                        account_id = $cashAccountId
                        debit_amount = $payment.amount
                        credit_amount = 0
                        description = "Cash Receipt - $($payment.customer_name)"
                    },
                    @{
                        account_id = $arAccountId
                        debit_amount = 0
                        credit_amount = $payment.amount
                        description = "Accounts Receivable - $($payment.customer_name)"
                    }
                )
            }
            $journalEntries += $journalEntry
            Write-Host "  Created journal entry for Payment $($payment.id.Substring(0,8)) - Amount: $($payment.amount)" -ForegroundColor Cyan
        }
    }
    
    Write-Host ""
    Write-Host "Created $($journalEntries.count) journal entries total" -ForegroundColor Green
    
    # Create journal entries using fixed field names
    Write-Host ""
    Write-Host "Submitting journal entries to database..." -ForegroundColor Yellow
    $successCount = 0
    $errorCount = 0
    
    foreach ($entry in $journalEntries) {
        try {
            $response = Invoke-RestMethod -Uri "$baseUrl/api/finance/journal-entries" -Method POST -Body ($entry | ConvertTo-Json -Depth 5) -ContentType "application/json"
            Write-Host "  ✓ Created: $($entry.journal_number)" -ForegroundColor Green
            $successCount++
        }
        catch {
            Write-Host "  ✗ Failed: $($entry.journal_number) - Error: $($_.Exception.Message)" -ForegroundColor Red
            $errorCount++
        }
    }
    
    Write-Host ""
    Write-Host "=== Summary ===" -ForegroundColor Green
    Write-Host "Journal entries created successfully: $successCount" -ForegroundColor Green
    Write-Host "Journal entries failed: $errorCount" -ForegroundColor Red
    Write-Host "Total processed: $($journalEntries.count)" -ForegroundColor White
    
    if ($successCount -gt 0) {
        Write-Host ""
        Write-Host "Your financial reports should now show data!" -ForegroundColor Green
        Write-Host "Check the Finance dashboard at: $baseUrl/dashboard" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Script completed!" -ForegroundColor Green
