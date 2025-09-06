# Simple Journal Entry Generator
$baseUrl = "http://localhost:3001"

# Account IDs
$cashAccountId = "ee08529b-0cad-4a35-9aa9-97661410b78e"
$arAccountId = "617b4bba-ff04-4a69-9d83-17f01335b6f1"
$salesAccountId = "0b25dd21-ff9c-4923-841b-7b971892a574"

Write-Host "Getting sales orders..." -ForegroundColor Yellow

try {
    $salesOrdersResponse = Invoke-RestMethod -Uri "$baseUrl/api/finance/sales-orders" -Method GET
    $salesOrders = $salesOrdersResponse.orders  # This is the array of orders
    
    $paymentsResponse = Invoke-RestMethod -Uri "$baseUrl/api/finance/payments" -Method GET  
    $payments = $paymentsResponse.data
    
    Write-Host "Found $($salesOrders.count) sales orders" -ForegroundColor Green
    Write-Host "Found $($payments.count) payments" -ForegroundColor Green
    
# Get a valid user ID from sales orders
    $validUserId = ($salesOrders | Where-Object { $_.sales_representative -ne $null } | Select-Object -First 1).sales_representative.id
    Write-Host "Using user ID: $validUserId" -ForegroundColor Cyan
    
    $successCount = 0
    $errorCount = 0
    
    # Process first 5 sales orders for testing
    $testOrders = $salesOrders | Select-Object -First 5
    
    foreach ($order in $testOrders) {
        if ($order.total -and $order.total -gt 0) {
            $journalEntry = @{
                journal_number = "JE-SO-$($order.id.Substring(0,8))"
                entry_date = $order.date
                description = "Sales Order - $($order.customer.name)"
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
                        description = "AR - $($order.customer.name)"
                    },
                    @{
                        line_number = 2
                        account_id = $salesAccountId
                        debit_amount = 0
                        credit_amount = $order.total
                        description = "Sales - $($order.customer.name)"
                    }
                )
            }
            
            try {
                Invoke-RestMethod -Uri "$baseUrl/api/finance/journal-entries" -Method POST -Body ($journalEntry | ConvertTo-Json -Depth 5) -ContentType "application/json"
                Write-Host "Success: $($order.id.Substring(0,8)) - $($order.total)" -ForegroundColor Green
                $successCount++
            }
            catch {
                Write-Host "Failed: $($order.id.Substring(0,8)) - $($_.Exception.Message)" -ForegroundColor Red
                $errorCount++
            }
        }
    }
    
    Write-Host ""
    Write-Host "Created: $successCount journal entries" -ForegroundColor Green
    Write-Host "Failed: $errorCount journal entries" -ForegroundColor Red
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Done!" -ForegroundColor Green
