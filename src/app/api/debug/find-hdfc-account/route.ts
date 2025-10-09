// Debug API to find the correct HDFC bank account ID
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    // Get all bank accounts to find HDFC
    const { data: bankAccounts, error: accountsError } = await supabase
      .from('bank_accounts')
      .select('id, name, account_number, account_type, current_balance, is_active')
      .order('name');

    // Find HDFC account
    const hdfcAccount = bankAccounts?.find(acc => 
      acc.name?.toLowerCase().includes('hdfc') || 
      acc.account_number?.includes('50200086008081')
    );

    if (!hdfcAccount) {
      return NextResponse.json({
        error: 'HDFC account not found',
        available_accounts: bankAccounts?.map(acc => ({
          id: acc.id,
          name: acc.name,
          account_number: acc.account_number,
          type: acc.account_type
        })) || []
      });
    }

    // Now get transaction counts for the correct HDFC account
    const { count: directBankTransCount } = await supabase
      .from('bank_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('bank_account_id', hdfcAccount.id);

    const { count: salesPaymentsCount } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('bank_account_id', hdfcAccount.id);

    // Get actual transactions to check for discrepancies
    const { data: allTransactions, error: transError } = await supabase
      .from('bank_transactions')
      .select('id, date, type, amount, description, reference, created_at')
      .eq('bank_account_id', hdfcAccount.id)
      .order('date', { ascending: false })
      .limit(60); // Get more than 55 to see if there are hidden ones

    return NextResponse.json({
      hdfc_account: {
        id: hdfcAccount.id,
        name: hdfcAccount.name,
        account_number: hdfcAccount.account_number,
        current_balance: hdfcAccount.current_balance
      },
      counts: {
        direct_bank_transactions: directBankTransCount || 0,
        sales_payments: salesPaymentsCount || 0,
        actual_fetched: allTransactions?.length || 0
      },
      sample_transactions: allTransactions?.slice(0, 5) || [],
      analysis: {
        ui_shows: "55 transactions",
        pagination_shows: "54 total transactions", 
        actual_count: directBankTransCount + (salesPaymentsCount || 0),
        discrepancy: Math.abs(55 - (directBankTransCount + (salesPaymentsCount || 0)))
      }
    });

  } catch (error) {
    console.error('Error finding HDFC account:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}