import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    console.log('🔄 Resetting chart of accounts to correct balances...');

    // Get actual sales orders data
    const salesResponse = await fetch('http://localhost:3000/api/finance/sales-orders');
    const salesData = await salesResponse.json();
    const salesOrders = salesData.orders || [];

    // Get actual payments data  
    const paymentsResponse = await fetch('http://localhost:3000/api/finance/payments');
    const payments = await paymentsResponse.json();

    // Calculate correct balances
    const totalSalesRevenue = salesOrders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
    const totalPayments = payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
    const accountsReceivable = totalSalesRevenue - totalPayments;

    // Group payments by method
    const paymentsByMethod = payments.reduce((acc: any, payment: any) => {
      const method = payment.method || 'unknown';
      acc[method] = (acc[method] || 0) + (payment.amount || 0);
      return acc;
    }, {});

    console.log('💰 Calculated correct balances:', {
      totalSalesRevenue,
      totalPayments,
      accountsReceivable,
      paymentsByMethod
    });

    // Update chart of accounts with correct balances
    const updates = [
      { code: '1010', name: 'Cash', balance: paymentsByMethod.cash || 0 },
      { code: '1025', name: 'UPI Payment Gateway', balance: paymentsByMethod.upi || 0 },
      { code: '1030', name: 'Card Processing Account', balance: paymentsByMethod.card || 0 },
      { code: '1200', name: 'Accounts Receivable', balance: accountsReceivable },
      { code: '4010', name: 'Sales Revenue', balance: totalSalesRevenue }
    ];

    const updateResults = [];

    for (const update of updates) {
      const { error } = await supabase
        .from('chart_of_accounts')
        .update({ 
          current_balance: update.balance,
          updated_at: new Date().toISOString()
        })
        .eq('account_code', update.code)
        .select('account_code, account_name, current_balance')
        .single();

      if (error) {
        console.error(`❌ Failed to update ${update.name}:`, error);
        updateResults.push({ 
          account: update.name, 
          error: error.message 
        });
      } else {
        console.log(`✅ Updated ${update.name}: ₹${update.balance}`);
        updateResults.push({ 
          account: update.name,
          code: update.code,
          newBalance: update.balance,
          success: true
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Chart of accounts reset to correct balances',
      calculatedTotals: {
        totalSalesRevenue,
        totalPayments,
        accountsReceivable,
        paymentsByMethod
      },
      updateResults
    });

  } catch (error) {
    console.error('❌ Reset error:', error);
    return NextResponse.json({ 
      error: 'Failed to reset chart of accounts',
      details: error 
    }, { status: 500 });
  }
}
