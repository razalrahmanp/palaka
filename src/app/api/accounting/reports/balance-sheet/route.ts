import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const asOfDate = searchParams.get('asOfDate') || new Date().toISOString().split('T')[0]

    // Get account balances from chart_of_accounts
    const { data: accounts, error } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('*')
      .eq('is_active', true)
      .order('account_code')

    if (error) throw error

    // Organize data by account types
    const assets = {
      currentAssets: accounts?.filter(account => 
        account.account_type === 'ASSET' && account.account_subtype === 'CURRENT_ASSET'
      ) || [],
      fixedAssets: accounts?.filter(account => 
        account.account_type === 'ASSET' && account.account_subtype === 'FIXED_ASSET'
      ) || [],
      intangibleAssets: accounts?.filter(account => 
        account.account_type === 'ASSET' && account.account_subtype === 'INTANGIBLE_ASSET'
      ) || []
    }

    const liabilities = {
      currentLiabilities: accounts?.filter(account => 
        account.account_type === 'LIABILITY' && account.account_subtype === 'CURRENT_LIABILITY'
      ) || [],
      longTermLiabilities: accounts?.filter(account => 
        account.account_type === 'LIABILITY' && account.account_subtype === 'LONG_TERM_LIABILITY'
      ) || []
    }

    const equity = accounts?.filter(account => 
      account.account_type === 'EQUITY'
    ) || []

    // Calculate totals with proper null handling
    const calculateTotal = (accounts: { current_balance?: number | null }[]) => 
      accounts.reduce((sum, account) => {
        const balance = account.current_balance
        const numericBalance = typeof balance === 'number' && !isNaN(balance) ? balance : 0
        return sum + numericBalance
      }, 0)

    const totalCurrentAssets = calculateTotal(assets.currentAssets)
    const totalFixedAssets = calculateTotal(assets.fixedAssets)
    const totalIntangibleAssets = calculateTotal(assets.intangibleAssets)
    const totalAssets = totalCurrentAssets + totalFixedAssets + totalIntangibleAssets

    const totalCurrentLiabilities = calculateTotal(liabilities.currentLiabilities)
    const totalLongTermLiabilities = calculateTotal(liabilities.longTermLiabilities)
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities

    const totalEquity = calculateTotal(equity)

    return NextResponse.json({
      success: true,
      data: {
        asOfDate,
        assets: {
          currentAssets: {
            accounts: assets.currentAssets.map(account => ({
              account_code: account.account_code,
              account_name: account.account_name,
              balance: typeof account.current_balance === 'number' && !isNaN(account.current_balance) 
                ? account.current_balance : 0
            })),
            total: totalCurrentAssets
          },
          fixedAssets: {
            accounts: assets.fixedAssets.map(account => ({
              account_code: account.account_code,
              account_name: account.account_name,
              balance: typeof account.current_balance === 'number' && !isNaN(account.current_balance) 
                ? account.current_balance : 0
            })),
            total: totalFixedAssets
          },
          intangibleAssets: {
            accounts: assets.intangibleAssets.map(account => ({
              account_code: account.account_code,
              account_name: account.account_name,
              balance: typeof account.current_balance === 'number' && !isNaN(account.current_balance) 
                ? account.current_balance : 0
            })),
            total: totalIntangibleAssets
          },
          total: totalAssets
        },
        liabilities: {
          currentLiabilities: {
            accounts: liabilities.currentLiabilities.map(account => ({
              account_code: account.account_code,
              account_name: account.account_name,
              balance: typeof account.current_balance === 'number' && !isNaN(account.current_balance) 
                ? account.current_balance : 0
            })),
            total: totalCurrentLiabilities
          },
          longTermLiabilities: {
            accounts: liabilities.longTermLiabilities.map(account => ({
              account_code: account.account_code,
              account_name: account.account_name,
              balance: typeof account.current_balance === 'number' && !isNaN(account.current_balance) 
                ? account.current_balance : 0
            })),
            total: totalLongTermLiabilities
          },
          total: totalLiabilities
        },
        equity: {
          accounts: equity.map(account => ({
            account_code: account.account_code,
            account_name: account.account_name,
            balance: typeof account.current_balance === 'number' && !isNaN(account.current_balance) 
              ? account.current_balance : 0
          })),
          total: totalEquity
        },
        totals: {
          totalAssets,
          totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
          isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
        }
      }
    })
  } catch (error) {
    console.error('Error fetching balance sheet:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch balance sheet'
    }, { status: 500 })
  }
}
