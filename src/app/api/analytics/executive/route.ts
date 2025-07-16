import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

export async function GET() {
  try {
    // --- 1. Fetch KPIs (Robust Method) ---

    // Fetch all products and their costs first
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, cost');
    if (productsError) throw new Error(`Products Error: ${productsError.message}`);
    const productCosts = new Map(products.map(p => [p.id, parseFloat(p.cost) || 0]));

    // Fetch sales order items using the correct table name 'sales_order_items'
    const { data: salesData, error: salesError } = await supabaseAdmin
      .from('sales_order_items')
      .select('product_id, unit_price, quantity'); // Using 'unit_price' as per your schema
    if (salesError) throw new Error(`Sales Error: ${salesError.message}`);

    // Calculate revenue and cost in code
    let totalRevenue = 0;
    let totalCost = 0;
    salesData.forEach(item => {
        const revenueForItem = (parseFloat(item.unit_price) || 0) * (item.quantity || 0);
        totalRevenue += revenueForItem;
        const cost = productCosts.get(item.product_id) || 0;
        totalCost += cost * (item.quantity || 0);
    });

    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? grossProfit / totalRevenue : 0;

    const { count: ordersFulfilled, error: ordersError } = await supabaseAdmin
        .from('sales_orders')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'draft'); 
    if (ordersError) throw new Error(`Orders Error: ${ordersError.message}`);

    const { data: expenseData, error: expenseError } = await supabaseAdmin
        .from('expenses')
        .select('amount');
    if (expenseError) throw new Error(`Expense Error: ${expenseError.message}`);

    const totalExpenses = expenseData.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
    const netProfit = grossProfit - totalExpenses;

    // --- 2. Fetch Chart Data ---
    const { data: monthlySales, error: monthlySalesError } = await supabaseAdmin.rpc('get_monthly_sales');
    if (monthlySalesError) throw new Error(`Monthly Sales RPC Error: ${monthlySalesError.message}`);

    const { data: topPerformers, error: topPerformersError } = await supabaseAdmin.rpc('get_top_products_by_sales', { limit_count: 5 });
    if(topPerformersError) throw new Error(`Top Performers RPC Error: ${topPerformersError.message}`);

    // Fetching monthly profit/expense data to replace the mock data
    const { data: monthlyBreakdown, error: breakdownError } = await supabaseAdmin.rpc('get_monthly_financial_breakdown');
    if (breakdownError) throw new Error(`Financial Breakdown RPC Error: ${breakdownError.message}`);

    const profitVsExpensesData = monthlyBreakdown.map((item: { month: string; total_revenue: string | number; total_expenses: string | number }) => ({
        name: item.month,
        profit: (parseFloat(item.total_revenue as string) || 0) - (parseFloat(item.total_expenses as string) || 0),
        expenses: parseFloat(item.total_expenses as string) || 0,
    }));

    const responseData = {
      kpis: {
        totalRevenue,
        netProfit,
        grossMargin,
        ordersFulfilled: ordersFulfilled ?? 0,
      },
      profitVsExpenses: profitVsExpensesData, // Replaced mock data with real data
      salesTrends: monthlySales.map((s: { month: string; total_sales: number }) => ({ name: s.month, sales: s.total_sales })),
      topPerformers: topPerformers.map((p: { product_name: string; total_sales: number }) => ({ name: p.product_name, value: p.total_sales })),
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('[EXECUTIVE_ANALYTICS_GET]', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new NextResponse(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
  }
}
