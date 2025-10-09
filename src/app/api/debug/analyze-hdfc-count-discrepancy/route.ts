// Debug API to analyze HDFC bank account transaction count discrepancy
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const bankAccountId = 'c8bc5e8b-9f4e-4c70-a5b6-2f8b1b4e5c6d'; // HDFC account ID
    
    // Get exact count from bank_transactions table
    const { count: directBankTransCount, error: directCountError } = await supabase
      .from('bank_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('bank_account_id', bankAccountId);

    // Get actual bank transactions data
    const { data: directBankTrans, error: directBankError } = await supabase
      .from('bank_transactions')
      .select('id, date, type, amount, description, reference, created_at')
      .eq('bank_account_id', bankAccountId)
      .order('date', { ascending: false });

    // Get sales payments for this bank account
    const { data: salesPayments, error: salesError } = await supabase
      .from('payments')
      .select('id, date, amount, method, description, reference, invoice_id, created_at')
      .eq('bank_account_id', bankAccountId)
      .order('date', { ascending: false });

    // Check for linked UPI accounts
    const { data: linkedUpiAccounts, error: upiError } = await supabase
      .from('bank_accounts')
      .select('id, name, upi_id')
      .eq('linked_bank_account_id', bankAccountId)
      .eq('account_type', 'UPI');

    // Get UPI transactions if any linked accounts exist
    let linkedUpiTransactions = [];
    if (linkedUpiAccounts && linkedUpiAccounts.length > 0) {
      for (const upiAccount of linkedUpiAccounts) {
        const { data: upiTrans } = await supabase
          .from('bank_transactions')  
          .select('id, date, type, amount, description, reference, created_at')
          .eq('bank_account_id', upiAccount.id)
          .order('date', { ascending: false });
        
        if (upiTrans) {
          linkedUpiTransactions.push(...upiTrans.map(tx => ({
            ...tx,
            upi_account_name: upiAccount.name,
            upi_id: upiAccount.upi_id
          })));
        }
      }
    }

    // Calculate total transactions that should appear
    const totalTransactions = 
      (directBankTrans?.length || 0) + 
      (salesPayments?.length || 0) + 
      (linkedUpiTransactions?.length || 0);

    return NextResponse.json({
      hdfc_account_id: bankAccountId,
      counts: {
        direct_bank_transactions: directBankTransCount || 0,
        actual_bank_transactions: directBankTrans?.length || 0,
        sales_payments: salesPayments?.length || 0,
        linked_upi_accounts: linkedUpiAccounts?.length || 0,
        linked_upi_transactions: linkedUpiTransactions?.length || 0,
        calculated_total: totalTransactions
      },
      sample_data: {
        latest_bank_transaction: directBankTrans?.[0] || null,
        latest_sales_payment: salesPayments?.[0] || null,
        linked_upi_accounts: linkedUpiAccounts || [],
        latest_upi_transaction: linkedUpiTransactions?.[0] || null
      },
      analysis: {
        discrepancy: "UI shows 55 transactions but pagination shows 54",
        possible_causes: [
          "One transaction is being double-counted in summary but filtered out in results",
          "API pagination logic has an off-by-one error", 
          "One transaction has invalid data causing display issues",
          "Cached count vs actual data mismatch",
          "Linked UPI account transactions being counted but not displayed"
        ]
      }
    });

  } catch (error) {
    console.error('Error analyzing HDFC transaction count:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}