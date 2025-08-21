// src/app/api/analytics/executive/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DailySale, Expense, MonthlyBreakdownItem, MonthlySale, ProductCost, SalesOrderItem, TopPerformer, TopSalesperson, TopVendor, WeeklySale } from '@/types';

// Additional type definitions for analytics
interface TopProductItem {
  product_id: string;
  products: {
    name: string;
  }[];
  sales_orders: {
    final_price: string;
  }[];
}

interface DailySalesItem {
  final_price: string;
  created_at: string;
}

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

    // Get sales orders with final prices (what we actually collect)
    const { data: salesOrdersData, error: salesOrdersError } = await supabaseAdmin
      .from('sales_orders')
      .select('id, final_price, original_price')
      .neq('status', 'draft');
    if (salesOrdersError) throw new Error(`Sales Orders Error: ${salesOrdersError.message}`);

    // Get sales order items for cost calculation
    const { data: salesData, error: salesError } = await supabaseAdmin
      .from('sales_order_items')
      .select('product_id, unit_price, quantity');
    if (salesError) throw new Error(`Sales Error: ${salesError.message}`);

    // Calculate total revenue using final_price (what we actually collect after discounts)
    let totalRevenue = 0;
    (salesOrdersData as { id: string; final_price?: string; original_price?: string }[]).forEach(order => {
      // Use final_price (actual amount collected after discounts)
      const revenue = parseFloat(order.final_price || '0') || 0;
      totalRevenue += revenue;
    });

    // Calculate total cost from sales items
    let totalCost = 0;
    (salesData as SalesOrderItem[]).forEach(item => {
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

    // --- 2. Fetch All Analytics Data Using Direct Queries with final_price ---
    
    // Get top products by sales using final_price (actual amount collected)
    const { data: topProductsData, error: topProductsError } = await supabaseAdmin
      .from('sales_order_items')
      .select(`
        product_id,
        products!inner(name),
        sales_orders!inner(final_price)
      `)
      .neq('sales_orders.status', 'draft');
    
    if (topProductsError) throw new Error(`Top Products Error: ${topProductsError.message}`);

    // Calculate top products by final_price revenue
    const productRevenue = new Map<string, number>();
    topProductsData?.forEach((item: TopProductItem) => {
      const productName = item.products[0]?.name || 'Unknown Product';
      const revenue = parseFloat(item.sales_orders[0]?.final_price || '0');
      productRevenue.set(productName, (productRevenue.get(productName) || 0) + revenue);
    });
    
    const topPerformersRes = { data: Array.from(productRevenue.entries())
      .map(([name, revenue]) => ({ product_name: name, total_sales: revenue }))
      .sort((a, b) => b.total_sales - a.total_sales)
      .slice(0, 5) };

    // Get daily sales using final_price
    const { data: dailySalesData, error: dailyError } = await supabaseAdmin
      .from('sales_orders')
      .select('final_price, created_at')
      .neq('status', 'draft')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    if (dailyError) throw new Error(`Daily Sales Error: ${dailyError.message}`);

    // Group by day using final_price
    const dailyRevenue = new Map<string, number>();
    dailySalesData?.forEach((order: DailySalesItem) => {
      const day = order.created_at.split('T')[0];
      const revenue = parseFloat(order.final_price || '0');
      dailyRevenue.set(day, (dailyRevenue.get(day) || 0) + revenue);
    });

    const dailySalesRes = { data: Array.from(dailyRevenue.entries())
      .map(([day, sales]) => ({ day, total_sales: sales }))
      .sort((a, b) => a.day.localeCompare(b.day)) };

    // Create placeholder data for other analytics (can be enhanced later)
    const monthlyBreakdownRes = { data: [] };
    const topVendorsRes = { data: [] };
    const topSalespeopleRes = { data: [] };
    const weeklySalesRes = { data: [] };
    const monthlySalesRes = { data: [] };

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
