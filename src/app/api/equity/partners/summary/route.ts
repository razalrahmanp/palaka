import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch all partners with summary statistics
export async function GET() {
  try {
    // Fetch all partners
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('*')
      .order('created_at', { ascending: false });

    if (partnersError) {
      console.error('Error fetching partners:', partnersError);
      return NextResponse.json({ error: partnersError.message }, { status: 500 });
    }

    // Fetch all investments for summary calculation
    const { data: investments, error: investmentsError } = await supabase
      .from('investments')
      .select('partner_id, amount, investment_date');

    if (investmentsError) {
      console.error('Error fetching investments:', investmentsError);
      return NextResponse.json({ error: investmentsError.message }, { status: 500 });
    }

    // Fetch all withdrawals for summary calculation
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('withdrawals')
      .select('partner_id, amount, withdrawal_date, withdrawal_type');

    if (withdrawalsError) {
      console.error('Error fetching withdrawals:', withdrawalsError);
      return NextResponse.json({ error: withdrawalsError.message }, { status: 500 });
    }

    // Calculate summary for each partner
    const partnersWithSummary = partners.map(partner => {
      const partnerInvestments = investments.filter(inv => inv.partner_id === partner.id);
      const partnerWithdrawals = withdrawals.filter(wd => wd.partner_id === partner.id);

      const totalInvestments = partnerInvestments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      const totalWithdrawals = partnerWithdrawals.reduce((sum, wd) => sum + parseFloat(wd.amount), 0);
      
      // Calculate current balance based on withdrawal types
      // Only capital withdrawals reduce the investment balance
      const capitalWithdrawals = partnerWithdrawals
        .filter(wd => wd.withdrawal_type === 'capital_withdrawal' || !wd.withdrawal_type) // default to capital for null values
        .reduce((sum, wd) => sum + parseFloat(wd.amount), 0);
      
      const currentBalance = totalInvestments - capitalWithdrawals;

      // Get transaction count and last transaction date
      const allTransactions = [
        ...partnerInvestments.map(inv => ({ date: inv.investment_date })),
        ...partnerWithdrawals.map(wd => ({ date: wd.withdrawal_date }))
      ];
      
      const transactionCount = allTransactions.length;
      const lastTransactionDate = allTransactions.length > 0 
        ? allTransactions
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
        : null;

      return {
        ...partner,
        total_investments: totalInvestments,
        total_withdrawals: totalWithdrawals,
        current_balance: currentBalance,
        transaction_count: transactionCount,
        last_transaction_date: lastTransactionDate
      };
    });

    return NextResponse.json({
      success: true,
      partners: partnersWithSummary,
      total_partners: partnersWithSummary.length,
      total_investments: partnersWithSummary.reduce((sum, p) => sum + p.total_investments, 0),
      total_withdrawals: partnersWithSummary.reduce((sum, p) => sum + p.total_withdrawals, 0),
      net_balance: partnersWithSummary.reduce((sum, p) => sum + p.current_balance, 0)
    });

  } catch (error) {
    console.error('Error in partners summary GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}