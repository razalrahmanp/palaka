// src/app/api/finance/debug/payment-methods/route.ts
import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log('🔍 Debug: Analyzing payment methods and their distribution...');

    // Get all payments with their methods
    const { data: payments, error } = await supabase
      .from("payments")
      .select("amount, method, date")
      .order("date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group payments by method
    const methodBreakdown = payments?.reduce((groups, payment) => {
      const method = payment.method || 'UNKNOWN';
      if (!groups[method]) {
        groups[method] = {
          count: 0,
          total_amount: 0,
          payments: []
        };
      }
      groups[method].count++;
      groups[method].total_amount += Number(payment.amount) || 0;
      groups[method].payments.push({
        amount: payment.amount,
        date: payment.date
      });
      return groups;
    }, {} as Record<string, { count: number; total_amount: number; payments: { amount: number; date: string }[] }>) || {};

    // Calculate totals
    const totalAmount = payments?.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0) || 0;
    const totalCount = payments?.length || 0;

    // Map methods to account types
    const accountTypeMapping = {
      'BANK TRANSFER': 'BANK',
      'CARD': 'BANK',
      'UPI': 'UPI',
      'CASH': 'NONE'
    };

    const summary = {
      total_payments: totalCount,
      total_amount: totalAmount,
      method_breakdown: methodBreakdown,
      account_type_mapping: accountTypeMapping,
      expected_bank_balance: (methodBreakdown['BANK TRANSFER']?.total_amount || 0) + (methodBreakdown['CARD']?.total_amount || 0),
      expected_upi_balance: methodBreakdown['UPI']?.total_amount || 0,
      cash_not_in_accounts: methodBreakdown['CASH']?.total_amount || 0
    };

    console.log('💰 Payment Method Analysis:', {
      totalPayments: summary.total_payments,
      totalAmount: summary.total_amount,
      expectedBankBalance: summary.expected_bank_balance,
      expectedUpiBalance: summary.expected_upi_balance,
      cashAmount: summary.cash_not_in_accounts
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error('💥 Payment Methods Debug Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
