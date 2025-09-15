import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// GET - Fetch equity summary for all partners
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Get partners
    let partnersQuery = supabase
      .from('partners')
      .select('*')
      .eq('is_active', true)
      .order('equity_percentage', { ascending: false })

    if (partnerId) {
      partnersQuery = partnersQuery.eq('id', partnerId)
    }

    const { data: partners, error: partnersError } = await partnersQuery

    if (partnersError) {
      console.error('Error fetching partners:', partnersError)
      return NextResponse.json(
        { 
          success: false, 
          error: partnersError.message 
        },
        { status: 500 }
      )
    }

    // Calculate equity summary for each partner
    const equitySummary = await Promise.all(
      (partners || []).map(async (partner) => {
        // Get total investments
        let investmentsQuery = supabase
          .from('investments')
          .select('amount')
          .eq('partner_id', partner.id)

        if (startDate) {
          investmentsQuery = investmentsQuery.gte('investment_date', startDate)
        }
        
        if (endDate) {
          investmentsQuery = investmentsQuery.lte('investment_date', endDate)
        }

        const { data: investments } = await investmentsQuery
        const totalInvestments = (investments || []).reduce((sum, inv) => sum + (inv.amount || 0), 0)

        // Get total withdrawals
        let withdrawalsQuery = supabase
          .from('withdrawals')
          .select('amount')
          .eq('partner_id', partner.id)

        if (startDate) {
          withdrawalsQuery = withdrawalsQuery.gte('withdrawal_date', startDate)
        }
        
        if (endDate) {
          withdrawalsQuery = withdrawalsQuery.lte('withdrawal_date', endDate)
        }

        const { data: withdrawals } = await withdrawalsQuery
        const totalWithdrawals = (withdrawals || []).reduce((sum, wd) => sum + (wd.amount || 0), 0)

        // Calculate current equity balance
        const currentEquityBalance = (partner.initial_investment || 0) + totalInvestments - totalWithdrawals

        return {
          partner_id: partner.id,
          partner_name: partner.name,
          partner_type: partner.partner_type,
          equity_percentage: partner.equity_percentage,
          initial_investment: partner.initial_investment || 0,
          total_investments: totalInvestments,
          total_withdrawals: totalWithdrawals,
          current_equity_balance: currentEquityBalance,
          investment_count: investments?.length || 0,
          withdrawal_count: withdrawals?.length || 0
        }
      })
    )

    // Calculate totals
    const totals = equitySummary.reduce(
      (acc, partner) => ({
        total_initial_investment: acc.total_initial_investment + partner.initial_investment,
        total_investments: acc.total_investments + partner.total_investments,
        total_withdrawals: acc.total_withdrawals + partner.total_withdrawals,
        total_current_equity: acc.total_current_equity + partner.current_equity_balance,
        total_partners: acc.total_partners + 1
      }),
      {
        total_initial_investment: 0,
        total_investments: 0,
        total_withdrawals: 0,
        total_current_equity: 0,
        total_partners: 0
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        partners: equitySummary,
        totals,
        period: {
          start_date: startDate,
          end_date: endDate
        }
      }
    })
    
  } catch (error) {
    console.error('Error fetching equity summary:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch equity summary' 
      },
      { status: 500 }
    )
  }
}

// GET /equity-activity - Fetch recent equity activities (investments and withdrawals)
export async function getEquityActivity(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const partnerId = searchParams.get('partner_id')
    const days = parseInt(searchParams.get('days') || '30')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    // Get recent investments
    let investmentsQuery = supabase
      .from('investments')
      .select(`
        id,
        amount,
        investment_date,
        description,
        partners (name),
        investment_categories (category_name)
      `)
      .gte('investment_date', startDateStr)
      .order('investment_date', { ascending: false })
      .limit(Math.floor(limit / 2))

    if (partnerId) {
      investmentsQuery = investmentsQuery.eq('partner_id', partnerId)
    }

    // Get recent withdrawals
    let withdrawalsQuery = supabase
      .from('withdrawals')
      .select(`
        id,
        amount,
        withdrawal_date,
        description,
        partners (name),
        withdrawal_categories (category_name)
      `)
      .gte('withdrawal_date', startDateStr)
      .order('withdrawal_date', { ascending: false })
      .limit(Math.floor(limit / 2))

    if (partnerId) {
      withdrawalsQuery = withdrawalsQuery.eq('partner_id', partnerId)
    }

    const [{ data: investments }, { data: withdrawals }] = await Promise.all([
      investmentsQuery,
      withdrawalsQuery
    ])

    // Combine and format activities
    const activities = [
      ...(investments || []).map(inv => ({
        id: inv.id,
        type: 'investment',
        amount: inv.amount,
        date: inv.investment_date,
        description: inv.description,
        partner_name: inv.partners?.[0]?.name,
        category: inv.investment_categories?.[0]?.category_name
      })),
      ...(withdrawals || []).map(wd => ({
        id: wd.id,
        type: 'withdrawal',
        amount: -wd.amount, // Negative for withdrawals
        date: wd.withdrawal_date,
        description: wd.description,
        partner_name: wd.partners?.[0]?.name,
        category: wd.withdrawal_categories?.[0]?.category_name
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      success: true,
      data: activities.slice(0, limit)
    })
    
  } catch (error) {
    console.error('Error fetching equity activity:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch equity activity' 
      },
      { status: 500 }
    )
  }
}