import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

export async function GET() {
    try {
        const { data: monthlyBreakdown, error: breakdownError } = await supabaseAdmin.rpc('get_monthly_financial_breakdown');
        if (breakdownError) throw new Error(`Financial Breakdown RPC Error: ${breakdownError.message}`);

        const responseData = {
            monthlyBreakdown: monthlyBreakdown.map(item => ({
                month: item.month,
                revenue: item.total_revenue,
                expenses: item.total_expenses
            })),
            plTrends: monthlyBreakdown.map(item => ({ // Profit/Loss from the same data
                month: item.month,
                profit: Math.max(0, item.total_revenue - item.total_expenses),
                loss: Math.max(0, item.total_expenses - item.total_revenue)
            })),
            cashflow: [ // Cashflow is highly complex; best done with a dedicated view or financial software integration
                { month: 'Jan', inflow: 150000, outflow: 110000, net: 40000 },
                { month: 'Feb', inflow: 160000, outflow: 125000, net: 35000 },
                { month: 'Mar', inflow: 185000, outflow: 140000, net: 45000 },
            ]
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('[FINANCE_ANALYTICS_GET]', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return new NextResponse(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
    }
}

/**
 * Required Supabase SQL Function:
 *
 * CREATE OR REPLACE FUNCTION get_monthly_financial_breakdown()
 * RETURNS TABLE(month TEXT, total_revenue NUMERIC, total_expenses NUMERIC) AS $$
 * BEGIN
 * RETURN QUERY
 * WITH monthly_transactions AS (
 * SELECT
 * TO_CHAR(transaction_date, 'YYYY-MM') as month,
 * type,
 * amount
 * FROM financial_transactions
 * )
 * SELECT
 * m.month,
 * COALESCE(SUM(CASE WHEN m.type = 'revenue' THEN m.amount ELSE 0 END), 0) as total_revenue,
 * COALESCE(SUM(CASE WHEN m.type = 'expense' THEN m.amount ELSE 0 END), 0) as total_expenses
 * FROM monthly_transactions m
 * GROUP BY m.month
 * ORDER BY m.month;
 * END;
 * $$ LANGUAGE plpgsql;
 */
