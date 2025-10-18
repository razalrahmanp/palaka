import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

interface Partner {
  id: number;
  name: string;
  equity_percentage: number;
  initial_investment: number;
  is_active: boolean;
}

interface InvestmentCategory {
  category_name: string;
}

interface Investment {
  id: number;
  partner_id: number;
  amount: string;
  investment_date: string;
  description: string | null;
  category_id: number | null;
  investment_categories: InvestmentCategory | InvestmentCategory[] | null;
}

interface Withdrawal {
  id: number;
  partner_id: number;
  amount: string;
  withdrawal_date: string;
  withdrawal_type: string;
  description: string | null;
}

interface TrendDataPoint {
  month: string;
  investment: number;
  withdrawal: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const allTime = searchParams.get('all_time') === 'true';
    
    // If all_time is true, use a very early start date, otherwise use year-to-date
    const startDate = allTime 
      ? '2000-01-01' 
      : (searchParams.get('start_date') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];

    console.log('📊 Investor API called:', { startDate, endDate, allTime });

    // Fetch all partners (investors)
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id, name, equity_percentage, initial_investment, is_active')
      .eq('is_active', true)
      .order('name');

    if (partnersError) {
      console.error('Error fetching partners:', partnersError);
      return NextResponse.json({ error: 'Failed to fetch partners' }, { status: 500 });
    }

    console.log('📊 Partners fetched:', { count: partners?.length || 0 });

    // Fetch all investments
    const { data: investments, error: investmentsError } = await supabase
      .from('investments')
      .select(`
        id,
        partner_id,
        amount,
        investment_date,
        description,
        category_id,
        investment_categories (category_name)
      `)
      .gte('investment_date', startDate)
      .lte('investment_date', endDate);

    if (investmentsError) {
      console.error('Error fetching investments:', investmentsError);
    }

    console.log('📊 Investments fetched:', {
      count: investments?.length || 0,
      sampleData: investments?.slice(0, 3),
      error: investmentsError
    });

    // Fetch all withdrawals
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('withdrawals')
      .select(`
        id,
        partner_id,
        amount,
        withdrawal_date,
        withdrawal_type,
        description
      `)
      .gte('withdrawal_date', startDate)
      .lte('withdrawal_date', endDate);

    if (withdrawalsError) {
      console.error('Error fetching withdrawals:', withdrawalsError);
    }

    console.log('📊 Withdrawals fetched:', {
      count: withdrawals?.length || 0,
      sampleData: withdrawals?.slice(0, 3),
      error: withdrawalsError
    });

    // Calculate totals
    const totalInvestment = investments?.reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0) || 0;
    const totalWithdrawal = withdrawals?.reduce((sum, wd) => sum + parseFloat(wd.amount || '0'), 0) || 0;
    const netPosition = totalInvestment - totalWithdrawal;

    // Group investments by category
    const investmentByCategory: { [key: string]: number } = {};
    investments?.forEach((inv: Investment) => {
      const category = Array.isArray(inv.investment_categories) 
        ? inv.investment_categories[0] 
        : inv.investment_categories;
      const categoryName = category?.category_name || 'Uncategorized';
      investmentByCategory[categoryName] = (investmentByCategory[categoryName] || 0) + parseFloat(inv.amount || '0');
    });

    const investmentByCategoryArray = Object.entries(investmentByCategory).map(([name, value]) => ({
      name,
      value,
    }));

    // Group withdrawals by type
    const withdrawalByType: { [key: string]: number } = {};
    withdrawals?.forEach((wd: Withdrawal) => {
      const typeName = wd.withdrawal_type ? formatWithdrawalType(wd.withdrawal_type) : 'Other';
      withdrawalByType[typeName] = (withdrawalByType[typeName] || 0) + parseFloat(wd.amount || '0');
    });

    const withdrawalByTypeArray = Object.entries(withdrawalByType).map(([name, value]) => ({
      name,
      value,
    }));

    // Generate trend data (last 6 months)
    const trendData = generateTrendData(investments || [], withdrawals || []);

    // Calculate per-investor data
    const investorsData = partners?.map((partner: Partner) => {
      const partnerInvestments = investments?.filter(inv => inv.partner_id === partner.id) || [];
      const partnerWithdrawals = withdrawals?.filter(wd => wd.partner_id === partner.id) || [];

      const total_investment = partnerInvestments.reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0);
      const total_withdrawal = partnerWithdrawals.reduce((sum, wd) => sum + parseFloat(wd.amount || '0'), 0);

      return {
        id: partner.id,
        name: partner.name,
        total_investment,
        total_withdrawal,
        net_position: total_investment - total_withdrawal,
        equity_percentage: partner.equity_percentage || 0,
      };
    }) || [];

    // Sort investors by net position (highest first)
    investorsData.sort((a, b) => b.net_position - a.net_position);

    console.log('📊 Investor Dashboard Data:', {
      dateRange: `${startDate} to ${endDate}`,
      totalInvestment: totalInvestment.toFixed(2),
      totalWithdrawal: totalWithdrawal.toFixed(2),
      netPosition: netPosition.toFixed(2),
      totalInvestors: partners?.length || 0,
      investmentCategories: investmentByCategoryArray.length,
      withdrawalTypes: withdrawalByTypeArray.length,
    });

    return NextResponse.json({
      success: true,
      totalInvestment,
      totalWithdrawal,
      netPosition,
      investmentByCategory: investmentByCategoryArray,
      withdrawalByType: withdrawalByTypeArray,
      trendData,
      investors: investorsData,
      dateRange: {
        startDate,
        endDate,
      },
    });

  } catch (error) {
    console.error('Error in investor dashboard API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

function formatWithdrawalType(type: string): string {
  const typeMap: { [key: string]: string } = {
    'capital_withdrawal': 'Capital Withdrawal',
    'interest_payment': 'Interest Payment',
    'profit_distribution': 'Profit Distribution',
  };
  return typeMap[type] || type;
}

function generateTrendData(investments: Investment[], withdrawals: Withdrawal[]): TrendDataPoint[] {
  const months: { [key: string]: { investment: number; withdrawal: number } } = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Get last 6 months
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    months[monthKey] = { investment: 0, withdrawal: 0 };
  }

  // Aggregate investments by month
  investments.forEach((inv: Investment) => {
    const date = new Date(inv.investment_date);
    const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    if (months[monthKey]) {
      months[monthKey].investment += parseFloat(inv.amount || '0');
    }
  });

  // Aggregate withdrawals by month
  withdrawals.forEach((wd: Withdrawal) => {
    const date = new Date(wd.withdrawal_date);
    const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    if (months[monthKey]) {
      months[monthKey].withdrawal += parseFloat(wd.amount || '0');
    }
  });

  return Object.entries(months).map(([month, data]) => ({
    month,
    investment: data.investment,
    withdrawal: data.withdrawal,
  }));
}
