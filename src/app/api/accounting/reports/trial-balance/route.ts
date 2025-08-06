import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const asOfDate = searchParams.get('asOfDate') || new Date().toISOString().split('T')[0]
    const includeZeroBalances = searchParams.get('includeZeroBalances') === 'true'

    // Get all accounts with their current balances
    let query = supabaseAdmin
      .from('chart_of_accounts')
      .select('*')
      .eq('is_active', true)
      .order('account_code')

    if (!includeZeroBalances) {
      query = query.neq('current_balance', 0)
    }

    const { data: accounts, error } = await query

    if (error) throw error

    // Transform accounts into trial balance format
    const trialBalance = accounts?.map(account => ({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      debit_balance: account.normal_balance === 'DEBIT' && account.current_balance > 0 ? account.current_balance : 0,
      credit_balance: account.normal_balance === 'CREDIT' && account.current_balance > 0 ? account.current_balance : 0
    })) || []

    // Calculate totals
    let totalDebits = 0
    let totalCredits = 0

    if (trialBalance) {
      for (const account of trialBalance) {
        totalDebits += account.debit_balance || 0
        totalCredits += account.credit_balance || 0
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        asOfDate,
        accounts: trialBalance || [],
        totals: {
          totalDebits,
          totalCredits,
          isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
        }
      }
    })
  } catch (error) {
    console.error('Error fetching trial balance:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch trial balance'
    }, { status: 500 })
  }
}
