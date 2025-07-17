// src/app/api/analytics/executive/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DailySale, Expense, MonthlyBreakdownItem, MonthlySale, ProductCost, SalesOrderItem, TopPerformer, TopSalesperson, TopVendor, WeeklySale } from '@/types';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

export async function GET() {
  try {
    // --- 1. Fetch KPIs ---
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, cost');
    if (productsError) throw new Error(`Products Error: ${productsError.message}`);
    const productCosts = new Map(products.map((p: ProductCost) => [p.id, parseFloat(p.cost) || 0]));

    const { data: salesData, error: salesError } = await supabaseAdmin
      .from('sales_order_items')
      .select('product_id, unit_price, quantity');
    if (salesError) throw new Error(`Sales Error: ${salesError.message}`);

    let totalRevenue = 0;
    let totalCost = 0;
    (salesData as SalesOrderItem[]).forEach(item => {
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

    const totalExpenses = (expenseData as Expense[]).reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
    const netProfit = grossProfit - totalExpenses;

    // --- 2. Fetch All Analytics Data in Parallel ---
    const [
        monthlyBreakdownRes,
        topPerformersRes,
        topVendorsRes,
        topSalespeopleRes,
        dailySalesRes,
        weeklySalesRes,
        monthlySalesRes
    ] = await Promise.all([
        supabaseAdmin.rpc('get_monthly_financial_breakdown'),
        supabaseAdmin.rpc('get_top_products_by_sales', { limit_count: 5 }),
        supabaseAdmin.rpc('get_top_vendors', { limit_count: 5 }),
        supabaseAdmin.rpc('get_top_salespeople_by_quote', { limit_count: 5 }),
        supabaseAdmin.rpc('get_daily_sales', { days_limit: 30 }),
        supabaseAdmin.rpc('get_weekly_sales', { weeks_limit: 26 }),
        supabaseAdmin.rpc('get_monthly_sales')
    ]);

    // --- 3. Error Handling for Parallel Calls ---
    if (monthlyBreakdownRes.error) throw new Error(`Financial Breakdown RPC Error: ${monthlyBreakdownRes.error.message}`);
    if (topPerformersRes.error) throw new Error(`Top Performers RPC Error: ${topPerformersRes.error.message}`);
    if (topVendorsRes.error) throw new Error(`Top Vendors RPC Error: ${topVendorsRes.error.message}`);
    if (topSalespeopleRes.error) throw new Error(`Top Salespeople RPC Error: ${topSalespeopleRes.error.message}`);
    if (dailySalesRes.error) throw new Error(`Daily Sales RPC Error: ${dailySalesRes.error.message}`);
    if (weeklySalesRes.error) throw new Error(`Weekly Sales RPC Error: ${weeklySalesRes.error.message}`);
    if (monthlySalesRes.error) throw new Error(`Monthly Sales RPC Error: ${monthlySalesRes.error.message}`);

    // --- 4. Structure the Response Data ---
    const profitVsExpensesData = (monthlyBreakdownRes.data as MonthlyBreakdownItem[]).map((item) => ({
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
      profitVsExpenses: profitVsExpensesData,
      topPerformers: (topPerformersRes.data as TopPerformer[]).map((p) => ({ name: p.product_name, value: p.total_sales })),
      topVendors: (topVendorsRes.data as TopVendor[]).map((v) => ({ name: v.vendor_name, value: v.total_spent })),
      topSalespeople: (topSalespeopleRes.data as TopSalesperson[]).map((s) => ({ name: s.salesperson_name, value: s.total_sales })),
      salesTrends: {
          daily: (dailySalesRes.data as DailySale[]).map((d) => ({ name: d.day, sales: d.total_sales })),
          weekly: (weeklySalesRes.data as WeeklySale[]).map((w) => ({ name: w.week, sales: w.total_sales })),
          monthly: (monthlySalesRes.data as MonthlySale[]).map((m) => ({ name: m.month, sales: m.total_sales })),
      },
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('[EXECUTIVE_ANALYTICS_GET]', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new NextResponse(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
  }
}
