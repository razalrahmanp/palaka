import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface LoanTransaction {
  id: string;
  date: string;
  description: string;
  reference_number?: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loan_id');

    if (!loanId) {
      return NextResponse.json(
        { success: false, error: 'loan_id is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching loan transactions for loan:', loanId);

    // Fetch loan details
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loan_opening_balances')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      console.error('Error fetching loan:', loanError);
      return NextResponse.json(
        { success: false, error: 'Loan not found' },
        { status: 404 }
      );
    }

    // Fetch liability payments for this loan
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('liability_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('date', { ascending: true });

    if (paymentsError) {
      console.error('Error fetching liability payments:', paymentsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    console.log(`✅ Found ${payments?.length || 0} liability payments for loan ${loanId}`);

    // Transform payments to transaction format
    const transactions: LoanTransaction[] = (payments || []).map(payment => ({
      id: payment.id,
      date: payment.date,
      description: payment.description || `EMI Payment - ${payment.payment_method}`,
      reference_number: payment.reference_number || payment.upi_reference || 'N/A',
      principal_amount: payment.principal_amount || 0,
      interest_amount: payment.interest_amount || 0,
      total_amount: payment.total_amount || 0,
      payment_method: payment.payment_method || 'Unknown',
      payment_status: payment.payment_status || 'completed',
      created_at: payment.created_at
    }));

    // Calculate summary
    const totalPrincipalPaid = transactions.reduce((sum, txn) => sum + txn.principal_amount, 0);
    const totalInterestPaid = transactions.reduce((sum, txn) => sum + txn.interest_amount, 0);
    const totalPaid = transactions.reduce((sum, txn) => sum + txn.total_amount, 0);

    const originalAmount = loan.original_loan_amount || 0;
    const openingBalance = loan.opening_balance || loan.current_balance || originalAmount;
    const currentBalance = openingBalance - totalPrincipalPaid;

    const summary = {
      loan_name: loan.loan_name,
      bank_name: loan.bank_name,
      loan_type: loan.loan_type,
      original_amount: originalAmount,
      opening_balance: openingBalance,
      total_paid: totalPaid,
      total_principal_paid: totalPrincipalPaid,
      total_interest_paid: totalInterestPaid,
      current_balance: currentBalance,
      emi_amount: loan.emi_amount,
      interest_rate: loan.interest_rate,
      loan_tenure_months: loan.loan_tenure_months,
      loan_start_date: loan.loan_start_date,
      loan_end_date: loan.loan_end_date
    };

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        summary
      }
    });

  } catch (error) {
    console.error('Error in loan-transactions API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
