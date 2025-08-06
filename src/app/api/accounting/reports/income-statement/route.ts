import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    // Get accounts for income statement (Revenue and Expense accounts)
    const { data: accounts, error } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('*')
      .in('account_type', ['REVENUE', 'EXPENSE'])
      .eq('is_active', true)
      .order('account_code')

    if (error) throw error

    // Organize data by account types
    const revenue = {
      operatingRevenue: accounts?.filter(account => 
        account.account_type === 'REVENUE' && account.account_subtype === 'OPERATING_REVENUE'
      ) || [],
      otherRevenue: accounts?.filter(account => 
        account.account_type === 'REVENUE' && account.account_subtype === 'OTHER_REVENUE'
      ) || []
    }

    const expenses = {
      costOfGoodsSold: accounts?.filter(account => 
        account.account_type === 'EXPENSE' && account.account_subtype === 'COST_OF_GOODS_SOLD'
      ) || [],
      operatingExpenses: accounts?.filter(account => 
        account.account_type === 'EXPENSE' && account.account_subtype === 'OPERATING_EXPENSE'
      ) || [],
      depreciation: accounts?.filter(account => 
        account.account_type === 'EXPENSE' && account.account_subtype === 'DEPRECIATION'
      ) || [],
      otherExpenses: accounts?.filter(account => 
        account.account_type === 'EXPENSE' && account.account_subtype === 'OTHER_EXPENSE'
      ) || []
    }

    // Calculate totals
    const calculateTotal = (accounts: { current_balance?: number }[]) => 
      accounts.reduce((sum, account) => sum + (account.current_balance || 0), 0)

    const totalOperatingRevenue = calculateTotal(revenue.operatingRevenue)
    const totalOtherRevenue = calculateTotal(revenue.otherRevenue)
    const totalRevenue = totalOperatingRevenue + totalOtherRevenue

    const totalCOGS = calculateTotal(expenses.costOfGoodsSold)
    const grossProfit = totalRevenue - totalCOGS

    const totalOperatingExpenses = calculateTotal(expenses.operatingExpenses)
    const totalDepreciation = calculateTotal(expenses.depreciation)
    const operatingIncome = grossProfit - totalOperatingExpenses - totalDepreciation

    const totalOtherExpenses = calculateTotal(expenses.otherExpenses)
    const netIncome = operatingIncome - totalOtherExpenses

    return NextResponse.json({
      success: true,
      data: {
        period: {
          startDate,
          endDate
        },
        revenue: {
          operatingRevenue: {
            accounts: revenue.operatingRevenue,
            total: totalOperatingRevenue
          },
          otherRevenue: {
            accounts: revenue.otherRevenue,
            total: totalOtherRevenue
          },
          total: totalRevenue
        },
        costOfGoodsSold: {
          accounts: expenses.costOfGoodsSold,
          total: totalCOGS
        },
        grossProfit,
        operatingExpenses: {
          operatingExpenses: {
            accounts: expenses.operatingExpenses,
            total: totalOperatingExpenses
          },
          depreciation: {
            accounts: expenses.depreciation,
            total: totalDepreciation
          },
          total: totalOperatingExpenses + totalDepreciation
        },
        operatingIncome,
        otherExpenses: {
          accounts: expenses.otherExpenses,
          total: totalOtherExpenses
        },
        netIncome
      }
    })
  } catch (error) {
    console.error('Error fetching income statement:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch income statement'
    }, { status: 500 })
  }
}
