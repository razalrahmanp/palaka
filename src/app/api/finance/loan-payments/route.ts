import { NextResponse, NextRequest } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabasePool';

interface LoanPaymentDetail {
  id: string;
  date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  description: string;
  payment_method: string;
  reference_number?: string;
  upi_reference?: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loan_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!loanId) {
      return NextResponse.json(
        { success: false, error: 'Loan ID is required' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;
    
    console.log('Fetching payments for loan:', { loanId, page, limit, offset });

    // First, verify loan exists
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loan_opening_balances')
      .select(`
        id, loan_name, bank_name, loan_type, loan_number, 
        original_loan_amount, opening_balance, current_balance, 
        interest_rate, loan_tenure_months, emi_amount, 
        loan_start_date, loan_end_date, status, description
      `)
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json(
        { success: false, error: 'Loan not found' },
        { status: 404 }
      );
    }

    // Fetch liability payments for this loan
    const { data: payments, error: paymentError } = await supabaseAdmin
      .from('liability_payments')
      .select(`
        id, date, principal_amount, interest_amount, total_amount, 
        description, payment_method, reference_number, upi_reference, created_at
      `)
      .eq('loan_id', loanId)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (paymentError) {
      console.error('Error fetching loan payments:', paymentError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch loan payments' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('liability_payments')
      .select('*', { count: 'exact', head: true })
      .eq('loan_id', loanId);

    if (countError) {
      console.error('Error getting payment count:', countError);
    }

    // Calculate summary statistics from all payments
    const { data: allPayments, error: summaryError } = await supabaseAdmin
      .from('liability_payments')
      .select('principal_amount, interest_amount, total_amount')
      .eq('loan_id', loanId);

    let totalPrincipalPaid = 0;
    let totalInterestPaid = 0;
    let totalAmountPaid = 0;

    if (!summaryError && allPayments) {
      allPayments.forEach(payment => {
        totalPrincipalPaid += payment.principal_amount || 0;
        totalInterestPaid += payment.interest_amount || 0;
        totalAmountPaid += payment.total_amount || 0;
      });
    }

    // Calculate remaining balance
    const remainingBalance = (loan.opening_balance || loan.original_loan_amount) - totalPrincipalPaid;

    // Format loan display name
    const displayName = `${loan.loan_name}${loan.bank_name ? ` (${loan.bank_name})` : ''}`;

    console.log(`Found ${totalCount || 0} total payments for loan ${loan.loan_name}`);

    return NextResponse.json({
      success: true,
      data: {
        loan: {
          id: loan.id,
          name: displayName,
          loan_type: loan.loan_type,
          loan_number: loan.loan_number,
          bank_name: loan.bank_name,
          original_amount: loan.original_loan_amount,
          opening_balance: loan.opening_balance,
          current_balance: loan.current_balance,
          interest_rate: loan.interest_rate,
          emi_amount: loan.emi_amount,
          loan_tenure_months: loan.loan_tenure_months,
          loan_start_date: loan.loan_start_date,
          loan_end_date: loan.loan_end_date,
          status: loan.status,
          description: loan.description
        },
        summary: {
          total_principal_paid: totalPrincipalPaid,
          total_interest_paid: totalInterestPaid,
          total_amount_paid: totalAmountPaid,
          remaining_balance: remainingBalance,
          payment_count: totalCount || 0,
          original_loan_amount: loan.original_loan_amount,
          completion_percentage: loan.original_loan_amount > 0 
            ? ((totalPrincipalPaid / loan.original_loan_amount) * 100).toFixed(2)
            : 0
        },
        payments: payments || [],
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit),
          hasMore: (page * limit) < (totalCount || 0)
        }
      }
    });

  } catch (error) {
    console.error('Error in loan-payments API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch loan payments' },
      { status: 500 }
    );
  }
}