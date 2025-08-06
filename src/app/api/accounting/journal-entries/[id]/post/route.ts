import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    // Get journal entry with lines
    const { data: entry, error: fetchError } = await supabaseAdmin
      .from('journal_entries')
      .select(`
        *,
        journal_entry_lines (
          *,
          chart_of_accounts (
            account_code,
            account_name,
            normal_balance
          )
        )
      `)
      .eq('id', params.id)
      .single()

    if (fetchError) throw fetchError

    if (!entry) {
      return NextResponse.json({
        success: false,
        error: 'Journal entry not found'
      }, { status: 404 })
    }

    if (entry.status === 'POSTED') {
      return NextResponse.json({
        success: false,
        error: 'Journal entry is already posted'
      }, { status: 400 })
    }

    // Verify entry is balanced
    let totalDebits = 0
    let totalCredits = 0

    for (const line of entry.journal_entry_lines) {
      totalDebits += parseFloat(line.debit_amount || 0)
      totalCredits += parseFloat(line.credit_amount || 0)
    }

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json({
        success: false,
        error: 'Journal entry is not balanced and cannot be posted'
      }, { status: 400 })
    }

    // Start transaction to post the entry
    const { error: updateError } = await supabaseAdmin
      .from('journal_entries')
      .update({
        status: 'POSTED',
        posted_at: new Date().toISOString(),
        posted_by: entry.created_by // Assuming the same user posts it
      })
      .eq('id', params.id)

    if (updateError) throw updateError

    // Create general ledger entries for each line
    const generalLedgerEntries = entry.journal_entry_lines.map((line: {
      account_id: string;
      debit_amount: number | null;
      credit_amount: number | null;
      description: string;
      chart_of_accounts: {
        account_code: string;
        account_name: string;
        normal_balance: string;
      };
    }) => {
      const debitAmount = line.debit_amount || 0
      const creditAmount = line.credit_amount || 0
      const account = line.chart_of_accounts

      // Calculate running balance based on normal balance
      let runningBalance = 0
      if (account.normal_balance === 'DEBIT') {
        runningBalance = debitAmount - creditAmount
      } else {
        runningBalance = creditAmount - debitAmount
      }

      return {
        account_id: line.account_id,
        journal_entry_id: entry.id,
        transaction_date: entry.entry_date,
        description: line.description,
        reference: entry.reference,
        debit_amount: debitAmount || null,
        credit_amount: creditAmount || null,
        running_balance: runningBalance,
        fiscal_year: new Date(entry.entry_date).getFullYear(),
        fiscal_period: Math.ceil((new Date(entry.entry_date).getMonth() + 1) / 3)
      }
    })

    const { error: ledgerError } = await supabaseAdmin
      .from('general_ledger')
      .insert(generalLedgerEntries)

    if (ledgerError) {
      // Rollback journal entry status
      await supabaseAdmin
        .from('journal_entries')
        .update({
          status: 'DRAFT',
          posted_at: null,
          posted_by: null
        })
        .eq('id', params.id)

      throw ledgerError
    }

    // Get the updated entry
    const { data: updatedEntry, error: finalFetchError } = await supabaseAdmin
      .from('journal_entries')
      .select(`
        *,
        journal_entry_lines (
          *,
          chart_of_accounts (
            account_code,
            account_name
          )
        )
      `)
      .eq('id', params.id)
      .single()

    if (finalFetchError) throw finalFetchError

    return NextResponse.json({
      success: true,
      data: updatedEntry,
      message: 'Journal entry posted successfully'
    })
  } catch (error) {
    console.error('Error posting journal entry:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to post journal entry'
    }, { status: 500 })
  }
}
