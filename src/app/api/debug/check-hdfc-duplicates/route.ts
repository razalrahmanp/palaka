// Debug API to check for duplicate transactions between bank_transactions and payments
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const hdfcAccountId = 'cd9fee22-fa5e-4487-83c8-afefaa866009';
    
    // Get bank transactions
    const { data: bankTrans } = await supabase
      .from('bank_transactions')
      .select('id, date, amount, description, reference, type')
      .eq('bank_account_id', hdfcAccountId)
      .order('date', { ascending: false });

    // Get sales payments
    const { data: salesPayments } = await supabase
      .from('payments')
      .select('id, date, amount, description, reference, method, invoice_id')
      .eq('bank_account_id', hdfcAccountId)
      .order('date', { ascending: false });

    // Check for potential duplicates
    const duplicates = [];
    const bankTransByDate = new Map();
    
    // Group bank transactions by date and amount
    bankTrans?.forEach(bt => {
      const key = `${bt.date}-${bt.amount}`;
      if (!bankTransByDate.has(key)) {
        bankTransByDate.set(key, []);
      }
      bankTransByDate.get(key).push(bt);
    });

    // Check if sales payments match any bank transactions
    salesPayments?.forEach(sp => {
      const key = `${sp.date}-${sp.amount}`;
      const matchingBankTrans = bankTransByDate.get(key);
      if (matchingBankTrans) {
        duplicates.push({
          date: sp.date,
          amount: sp.amount,
          sales_payment: sp,
          matching_bank_transactions: matchingBankTrans
        });
      }
    });

    return NextResponse.json({
      hdfc_account_id: hdfcAccountId,
      counts: {
        bank_transactions: bankTrans?.length || 0,
        sales_payments: salesPayments?.length || 0,
        potential_duplicates: duplicates.length
      },
      sample_data: {
        latest_bank_transaction: bankTrans?.[0],
        latest_sales_payment: salesPayments?.[0]
      },
      duplicates: duplicates.slice(0, 10), // Show first 10 duplicates
      analysis: {
        ui_issue: "UI shows 55 but API returns 109 (55 bank + 54 sales)",
        likely_cause: duplicates.length > 0 
          ? "Frontend is deduplicating transactions correctly - same transactions exist in both tables"
          : "Frontend is filtering one source or has display logic limiting to one source",
        recommendation: duplicates.length > 0
          ? "Keep deduplication logic but fix count display to show actual unique transactions"
          : "Check frontend to see why it's not showing all 109 transactions"
      }
    });

  } catch (error) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}