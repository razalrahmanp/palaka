import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Get all transactions for the specified date
    const { data: transactions, error } = await supabaseAdmin
      .from('general_ledger')
      .select(`
        *,
        chart_of_accounts (
          account_code,
          account_name,
          account_type,
          account_subtype
        ),
        journal_entries (
          journal_number,
          reference_number,
          description
        )
      `)
      .eq('transaction_date', date)
      .order('id')

    if (error) throw error

    // Group transactions by journal entry
    const journalEntries = new Map()
    
    transactions?.forEach(transaction => {
      const entryId = transaction.journal_entry_id
      if (!journalEntries.has(entryId)) {
        journalEntries.set(entryId, {
          id: entryId,
          entryNumber: transaction.journal_entries?.journal_number,
          reference: transaction.journal_entries?.reference_number,
          description: transaction.journal_entries?.description,
          lines: [],
          totalDebits: 0,
          totalCredits: 0
        })
      }
      
      const entry = journalEntries.get(entryId)
      entry.lines.push({
        accountCode: transaction.chart_of_accounts?.account_code,
        accountName: transaction.chart_of_accounts?.account_name,
        accountType: transaction.chart_of_accounts?.account_type,
        debitAmount: transaction.debit_amount,
        creditAmount: transaction.credit_amount,
        description: transaction.description
      })
      
      entry.totalDebits += transaction.debit_amount || 0
      entry.totalCredits += transaction.credit_amount || 0
    })

    // Convert map to array
    const entriesArray = Array.from(journalEntries.values())

    // Calculate summary by account type
    const summary = {
      assets: 0,
      liabilities: 0,
      equity: 0,
      revenue: 0,
      expenses: 0
    }

    transactions?.forEach(transaction => {
      const accountType = transaction.chart_of_accounts?.account_type
      const debitAmount = transaction.debit_amount || 0
      const creditAmount = transaction.credit_amount || 0
      
      switch (accountType) {
        case 'ASSET':
          summary.assets += debitAmount - creditAmount
          break
        case 'LIABILITY':
          summary.liabilities += creditAmount - debitAmount
          break
        case 'EQUITY':
          summary.equity += creditAmount - debitAmount
          break
        case 'REVENUE':
          summary.revenue += creditAmount - debitAmount
          break
        case 'EXPENSE':
          summary.expenses += debitAmount - creditAmount
          break
      }
    })

    // Calculate daily totals
    const dailyTotals = {
      totalDebits: transactions?.reduce((sum, t) => sum + (t.debit_amount || 0), 0) || 0,
      totalCredits: transactions?.reduce((sum, t) => sum + (t.credit_amount || 0), 0) || 0,
      numberOfEntries: entriesArray.length,
      numberOfTransactions: transactions?.length || 0
    }

    return NextResponse.json({
      success: true,
      data: {
        date,
        journalEntries: entriesArray,
        summary,
        dailyTotals,
        isBalanced: Math.abs(dailyTotals.totalDebits - dailyTotals.totalCredits) < 0.01
      }
    })
  } catch (error) {
    console.error('Error fetching daysheet:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch daysheet'
    }, { status: 500 })
  }
}
