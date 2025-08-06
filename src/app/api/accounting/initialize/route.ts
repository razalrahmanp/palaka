import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * API to initialize the accounting system with proper account balances
 * This endpoint sets up initial balances for a furniture ERP system
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      initialCash = 100000,
      initialEquity = 100000,
      initialInventoryValue = 0,
      bankAccountBalance = 50000
    } = body

    // Update key accounts with initial balances
    const accountUpdates = [
      // Assets
      { account_code: '1010', current_balance: initialCash, opening_balance: initialCash }, // Cash
      { account_code: '1100', current_balance: bankAccountBalance, opening_balance: bankAccountBalance }, // Bank
      { account_code: '1330', current_balance: initialInventoryValue, opening_balance: initialInventoryValue }, // Inventory
      
      // Equity
      { account_code: '3000', current_balance: initialEquity, opening_balance: initialEquity }, // Owner's Equity
    ]

    const updatePromises = accountUpdates.map(async (update) => {
      const { error } = await supabaseAdmin
        .from('chart_of_accounts')
        .update({
          current_balance: update.current_balance,
          opening_balance: update.opening_balance,
          updated_at: new Date().toISOString()
        })
        .eq('account_code', update.account_code)

      if (error) {
        console.error(`Error updating account ${update.account_code}:`, error)
      }
      
      return { account_code: update.account_code, success: !error }
    })

    const results = await Promise.all(updatePromises)

    // Create an initial journal entry for the setup
    const { data: journalEntry, error: journalError } = await supabaseAdmin
      .from('journal_entries')
      .insert({
        journal_number: `INIT-${Date.now()}`,
        reference_number: `INITIAL-SETUP-${new Date().toISOString().split('T')[0]}`,
        description: 'Initial accounting system setup',
        transaction_date: new Date().toISOString(),
        total_debit: initialCash + bankAccountBalance + initialInventoryValue,
        total_credit: initialEquity,
        status: 'posted',
        entry_type: 'OPENING_BALANCE'
      })
      .select()
      .single()

    if (journalError) {
      console.error('Error creating initial journal entry:', journalError)
    }

    // Create general ledger entries for the initial setup
    if (journalEntry) {
      const ledgerEntries = [
        // Debit entries (Assets)
        {
          journal_entry_id: journalEntry.id,
          account_id: await getAccountId('1010'), // Cash
          transaction_date: new Date().toISOString(),
          debit_amount: initialCash,
          credit_amount: 0,
          description: 'Initial cash on hand',
          reference: journalEntry.reference_number
        },
        {
          journal_entry_id: journalEntry.id,
          account_id: await getAccountId('1100'), // Bank
          transaction_date: new Date().toISOString(),
          debit_amount: bankAccountBalance,
          credit_amount: 0,
          description: 'Initial bank account balance',
          reference: journalEntry.reference_number
        }
      ]

      if (initialInventoryValue > 0) {
        ledgerEntries.push({
          journal_entry_id: journalEntry.id,
          account_id: await getAccountId('1330'), // Inventory
          transaction_date: new Date().toISOString(),
          debit_amount: initialInventoryValue,
          credit_amount: 0,
          description: 'Initial inventory valuation',
          reference: journalEntry.reference_number
        })
      }

      // Credit entry (Equity)
      ledgerEntries.push({
        journal_entry_id: journalEntry.id,
        account_id: await getAccountId('3000'), // Owner's Equity
        transaction_date: new Date().toISOString(),
        debit_amount: 0,
        credit_amount: initialCash + bankAccountBalance + initialInventoryValue,
        description: 'Initial owner equity investment',
        reference: journalEntry.reference_number
      })

      const validEntries = ledgerEntries.filter(entry => entry.account_id)
      
      if (validEntries.length > 0) {
        const { error: ledgerError } = await supabaseAdmin
          .from('general_ledger')
          .insert(validEntries)

        if (ledgerError) {
          console.error('Error creating general ledger entries:', ledgerError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Accounting system initialized successfully',
        accountUpdates: results,
        journalEntry: journalEntry ? {
          id: journalEntry.id,
          journal_number: journalEntry.journal_number,
          total_amount: journalEntry.total_debit
        } : null,
        initialBalances: {
          cash: initialCash,
          bank: bankAccountBalance,
          inventory: initialInventoryValue,
          equity: initialEquity
        }
      }
    })

  } catch (error) {
    console.error('Error initializing accounting system:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to initialize accounting system' 
    }, { status: 500 })
  }
}

// Helper function to get account ID by account code
async function getAccountId(accountCode: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('id')
      .eq('account_code', accountCode)
      .single()

    if (error) {
      console.error(`Error fetching account ${accountCode}:`, error)
      return null
    }

    return data?.id || null
  } catch (error) {
    console.error(`Error in getAccountId for ${accountCode}:`, error)
    return null
  }
}
