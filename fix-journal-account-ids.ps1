# Fix Journal Entry Account IDs
# This script updates all journal entries to use the correct account IDs

$baseUrl = "http://localhost:3000"

Write-Host "=== Fixing Journal Entry Account IDs ===" -ForegroundColor Green
Write-Host ""

# Step 1: Get the real account IDs for the accounts we need
Write-Host "1. Fetching real account IDs..." -ForegroundColor Yellow

$accountCodes = @("1200", "4010", "1010")  # AR, Sales Revenue, Cash
$codesParam = $accountCodes -join ","

try {
    $uri = "$baseUrl/api/finance/accounts-by-codes?codes=$codesParam"
    $accountResponse = Invoke-RestMethod -Uri $uri -Method GET
    
    if ($accountResponse -and $accountResponse.data) {
        Write-Host "   Successfully fetched account mappings:" -ForegroundColor Green
        
        $accounts = $accountResponse.data
        foreach ($code in $accountCodes) {
            if ($accounts.$code) {
                Write-Host "     $code - $($accounts.$code.account_name): $($accounts.$code.id)" -ForegroundColor Cyan
            } else {
                Write-Host "     $code - NOT FOUND!" -ForegroundColor Red
            }
        }
        
        # Map the accounts
        $arAccount = $accounts."1200"  # Accounts Receivable
        $salesAccount = $accounts."4010"  # Sales Revenue  
        $cashAccount = $accounts."1010"  # Cash
        
        if (-not $arAccount -or -not $salesAccount -or -not $cashAccount) {
            Write-Host ""
            Write-Host "ERROR: Missing required accounts in chart!" -ForegroundColor Red
            Write-Host "Cannot proceed without all required account IDs." -ForegroundColor Red
            exit 1
        }
        
        Write-Host ""
        Write-Host "2. Account ID Mapping:" -ForegroundColor Yellow
        Write-Host "   Accounts Receivable (1200): $($arAccount.id)"
        Write-Host "   Sales Revenue (4010): $($salesAccount.id)"  
        Write-Host "   Cash (1010): $($cashAccount.id)"
        
        Write-Host ""
        Write-Host "3. Creating Database Update SQL..." -ForegroundColor Yellow
        
        # Generate SQL to update journal entry lines
        $updateSQL = @"
-- Fix Journal Entry Account IDs
-- Update journal_entry_lines to use correct account_ids

-- Update fake Accounts Receivable ID to real one
UPDATE journal_entry_lines 
SET account_id = '$($arAccount.id)'
WHERE account_id = 'af83d9b5-e269-4ca9-9f58-8a2e58a01234';

-- Update fake Sales Revenue ID to real one  
UPDATE journal_entry_lines
SET account_id = '$($salesAccount.id)'
WHERE account_id = 'cf84e9c6-f379-5db0-0f69-9b3f69b01345';

-- Update fake Cash ID to real one
UPDATE journal_entry_lines
SET account_id = '$($cashAccount.id)' 
WHERE account_id = 'df85f0d7-g480-6ec1-1f70-0c4g70c01456';

-- Verify the updates
SELECT 
    jel.account_id,
    coa.account_code,
    coa.account_name,
    COUNT(*) as line_count,
    SUM(jel.debit_amount) as total_debits,
    SUM(jel.credit_amount) as total_credits
FROM journal_entry_lines jel
JOIN chart_of_accounts coa ON jel.account_id = coa.id  
GROUP BY jel.account_id, coa.account_code, coa.account_name
ORDER BY coa.account_code;
"@

        # Save the SQL to a file
        $sqlFile = "g:\PROJECT\Al_Rams\palaka\palaka\palaka\fix-journal-account-ids.sql"
        $updateSQL | Out-File -FilePath $sqlFile -Encoding UTF8
        
        Write-Host "   SQL saved to: $sqlFile" -ForegroundColor Green
        Write-Host ""
        Write-Host "4. NEXT STEPS:" -ForegroundColor Yellow
        Write-Host "   a) Review the SQL file: $sqlFile"
        Write-Host "   b) Execute the SQL in your database"
        Write-Host "   c) Refresh the Chart of Accounts page"
        Write-Host "   d) Account balances should now show correctly!"
        Write-Host ""
        Write-Host "   Expected Results:" -ForegroundColor Cyan
        Write-Host "   - Accounts Receivable: Should show total AR from sales"
        Write-Host "   - Sales Revenue: Should show total sales revenue"  
        Write-Host "   - Cash: Should show total payments received"
        
    } else {
        Write-Host "   Failed to fetch account mappings" -ForegroundColor Red
    }
    
} catch {
    Write-Host "   API Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Alternative: Manually find account IDs in database" -ForegroundColor Yellow
    Write-Host "   SELECT id, account_code, account_name FROM chart_of_accounts" 
    Write-Host "   WHERE account_code IN ('1200', '4010', '1010');"
}
