# PowerShell script to fix journal entry totals
Write-Host "=== Journal Entry Totals Fix ==="

# Get all journal entries that have zero totals
$apiUrl = "http://localhost:3000/api/finance/journal-entries"

try {
    Write-Host "Checking journal entries..."
    $response = Invoke-RestMethod -Uri $apiUrl -Method Get
    
    if ($response.data -and $response.data.Count -gt 0) {
        Write-Host "Found $($response.data.Count) journal entries"
        
        # Check for entries with zero or null totals
        $zeroTotalEntries = $response.data | Where-Object { 
            $_.total_amount -eq 0 -or $_.total_amount -eq $null -or
            $_.total_debit -eq 0 -or $_.total_debit -eq $null -or
            $_.total_credit -eq 0 -or $_.total_credit -eq $null
        }
        
        Write-Host "Entries with zero/null totals: $($zeroTotalEntries.Count)"
        
        if ($zeroTotalEntries.Count -gt 0) {
            Write-Host "Sample entries with issues:"
            $zeroTotalEntries | Select-Object -First 5 | ForEach-Object {
                $entryNumber = if ($_.journal_number) { $_.journal_number } else { $_.entry_number }
                Write-Host "  Entry: $entryNumber - Total: $($_.total_amount) - Debit: $($_.total_debit) - Credit: $($_.total_credit)"
            }
        }
    } else {
        Write-Host "No journal entries found"
    }
    
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}

Write-Host "Fix script completed."
