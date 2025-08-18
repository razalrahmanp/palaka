import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseAdmin'

interface OpeningBalance {
  id: string
  entity_type?: string
  debit_amount?: number
  credit_amount?: number
  account?: {
    account_name: string
    account_code: string
  }
}

interface SummaryData {
  count: number
  total_debit: number
  total_credit: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || new Date().getFullYear().toString()
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const summary = searchParams.get('summary')

    // Try enhanced table first, fallback to standard opening_balances
    let query = supabase
      .from('opening_balances')
      .select(`
        *,
        account:chart_of_accounts(account_name, account_code)
      `)
      .eq('fiscal_year', year)
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('balance_type', type)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching opening balances:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If summary is requested, calculate summary data
    if (summary === 'true') {
      const summaryData = data?.reduce((acc: Record<string, SummaryData>, item: OpeningBalance) => {
        const type = item.entity_type || 'GENERAL'
        if (!acc[type]) {
          acc[type] = { count: 0, total_debit: 0, total_credit: 0 }
        }
        acc[type].count += 1
        acc[type].total_debit += Number(item.debit_amount || 0)
        acc[type].total_credit += Number(item.credit_amount || 0)
        return acc
      }, {})

      return NextResponse.json({ 
        data,
        summary: summaryData || {}
      })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in opening balances API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}