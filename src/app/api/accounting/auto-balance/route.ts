import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseAdmin'

export async function POST() {
  try {
    console.log('🔧 Auto-balancing balance sheet...')

    // 1. Get current balance sheet totals
    const { data: balanceSheetData } = await supabase
      .from('chart_of_accounts')
      .select('account_type, current_balance')

    if (!balanceSheetData) {
      throw new Error('Could not fetch account data')
    }

    // Calculate totals by type
    const assets = balanceSheetData
      .filter(acc => acc.account_type === 'ASSET')
      .reduce((sum, acc) => sum + (acc.current_balance || 0), 0)

    const liabilities = balanceSheetData
      .filter(acc => acc.account_type === 'LIABILITY')
      .reduce((sum, acc) => sum + (acc.current_balance || 0), 0)

    const equity = balanceSheetData
      .filter(acc => acc.account_type === 'EQUITY')
      .reduce((sum, acc) => sum + (acc.current_balance || 0), 0)

    const variance = assets - (liabilities + equity)

    console.log('📊 Balance Sheet Analysis:', {
      assets,
      liabilities,
      equity,
      variance
    })

    if (Math.abs(variance) < 0.01) {
      return NextResponse.json({
        success: true,
        message: 'Balance sheet is already balanced',
        data: { assets, liabilities, equity, variance: 0 }
      })
    }

    // Get the first user from users table for system entries
    const { data: systemUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single()

    if (!systemUser) {
      throw new Error('No users found in system for creating journal entries')
    }

    // 2. Create balancing journal entry for inventory
    const journalEntry = {
      journal_number: `INV-BALANCE-${Date.now()}`,
      entry_date: new Date().toISOString().split('T')[0],
      reference_number: 'INVENTORY-BALANCE',
      description: 'Opening balance for inventory assets',
      status: 'POSTED',
      created_by: systemUser.id,
      updated_by: systemUser.id
    }

    const { data: journalData, error: journalError } = await supabase
      .from('journal_entries')
      .insert(journalEntry)
      .select()
      .single()

    if (journalError) {
      throw new Error(`Failed to create journal entry: ${journalError.message}`)
    }

    // 3. Get or create Owner's Equity account
    let { data: equityAccount } = await supabase
      .from('chart_of_accounts')
      .select('id, current_balance')
      .eq('account_code', '3000')
      .single()

    if (!equityAccount) {
      const { data: newAccount, error: accountError } = await supabase
        .from('chart_of_accounts')
        .insert({
          account_code: '3000',
          account_name: 'Owner\'s Equity',
          account_type: 'EQUITY',
          account_subtype: 'CAPITAL',
          normal_balance: 'CREDIT',
          description: 'Owner capital and retained earnings',
          current_balance: 0,
          opening_balance: 0,
          created_by: systemUser.id,
          updated_by: systemUser.id
        })
        .select()
        .single()

      if (accountError) {
        throw new Error(`Failed to create equity account: ${accountError.message}`)
      }
      equityAccount = newAccount
    }

    if (!equityAccount) {
      throw new Error('Failed to get or create equity account')
    }

    // 4. Create the balancing journal entry lines
    const lines = []

    if (variance > 0) {
      // Assets exceed Liabilities + Equity - Credit Owner's Equity
      lines.push({
        journal_entry_id: journalData.id,
        line_number: 1,
        account_id: equityAccount.id,
        description: 'Auto-balance: Increase owner equity',
        debit_amount: 0,
        credit_amount: variance
      })
    } else {
      // Liabilities + Equity exceed Assets - Debit Owner's Equity
      lines.push({
        journal_entry_id: journalData.id,
        line_number: 1,
        account_id: equityAccount.id,
        description: 'Auto-balance: Decrease owner equity',
        debit_amount: Math.abs(variance),
        credit_amount: 0
      })
    }

    // 5. Insert journal lines
    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(lines)

    if (linesError) {
      throw new Error(`Failed to create journal lines: ${linesError.message}`)
    }

    // 6. Update journal entry totals
    const totalAmount = Math.abs(variance)
    await supabase
      .from('journal_entries')
      .update({
        total_debit: variance < 0 ? totalAmount : 0,
        total_credit: variance > 0 ? totalAmount : 0,
        posted_at: new Date().toISOString()
      })
      .eq('id', journalData.id)

    // 7. Update Owner's Equity account balance
    const newEquityBalance = (equityAccount.current_balance || 0) + variance
    await supabase
      .from('chart_of_accounts')
      .update({
        current_balance: newEquityBalance
      })
      .eq('id', equityAccount.id)

    console.log('✅ Balance sheet auto-balancing completed')

    return NextResponse.json({
      success: true,
      message: 'Balance sheet has been automatically balanced',
      data: {
        variance_corrected: variance,
        journal_entry_id: journalData.id,
        new_equity_balance: newEquityBalance,
        balancing_type: variance > 0 ? 'Increased Owner Equity' : 'Decreased Owner Equity'
      }
    })

  } catch (error) {
    console.error('❌ Error auto-balancing balance sheet:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
