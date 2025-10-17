import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

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

interface DaySheetTransaction {
  id: string;
  time: string;
  date: string;
  source: string;
  type: string;
  description: string;
  category: 'Operating' | 'Investing' | 'Financing';
  paymentMethod: string;
  debit: number;
  credit: number;
  balance: number;
  reference: string;
  sourceId: string;
  timestamp: Date;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const selectedDate = dateParam || format(new Date(), 'yyyy-MM-dd');

    console.log(`📅 Fetching Day Sheet for: ${selectedDate}`);

    const allTransactions: DaySheetTransaction[] = [];

    // 1. SALES PAYMENTS (INFLOW) - Customer payments
    const { data: salesPayments, error: salesError } = await supabaseAdmin
      .from('payments')
      .select(`
        id,
        payment_date,
        amount,
        description,
        reference,
        method,
        invoice_id,
        invoices (
          customer_name
        )
      `)
      .gte('payment_date', `${selectedDate}T00:00:00`)
      .lte('payment_date', `${selectedDate}T23:59:59`)
      .order('payment_date', { ascending: true });

    if (!salesError && salesPayments) {
      salesPayments.forEach((payment: Record<string, unknown>) => {
        const dateStr = payment.payment_date as string;
        if (!dateStr) return; // Skip if no date
        
        const paymentDate = new Date(dateStr);
        if (isNaN(paymentDate.getTime())) return; // Skip if invalid date
        
        allTransactions.push({
          id: `payment_${payment.id}`,
          time: format(paymentDate, 'HH:mm'),
          date: format(paymentDate, 'dd-MM-yyyy'),
          source: 'sales_payment',
          type: 'Sales Payment',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          description: `Payment from ${(payment as any).invoices?.customer_name || 'Customer'}${(payment.description as string) ? ` - ${payment.description}` : ''}`,
          category: 'Operating',
          paymentMethod: (payment.method as string) || 'cash',
          debit: (payment.amount as number) || 0,
          credit: 0,
          balance: 0,
          reference: (payment.reference as string) || (payment.id as string).slice(-8),
          sourceId: payment.id as string,
          timestamp: paymentDate,
        });
      });
    }

    // 2. EXPENSES (OUTFLOW) - Operating and capital expenses
    const { data: expenses, error: expensesError } = await supabaseAdmin
      .from('expenses')
      .select('id, date, amount, description, category, payment_method, receipt_number, entity_type')
      .eq('date', selectedDate)
      .order('created_at', { ascending: true });

    if (!expensesError && expenses) {
      expenses.forEach((expense: Record<string, unknown>) => {
        const dateStr = expense.date as string;
        if (!dateStr) return;
        
        const expenseDate = new Date(`${dateStr}T12:00:00`);
        if (isNaN(expenseDate.getTime())) return;
        
        const isCapex = expense.category === 'CAPEX' || expense.category === 'Capital Expenditure';
        
        allTransactions.push({
          id: `expense_${expense.id}`,
          time: format(expenseDate, 'HH:mm'),
          date: format(expenseDate, 'dd-MM-yyyy'),
          source: 'expense',
          type: isCapex ? 'Asset Purchase' : `${(expense.category as string) || 'General'} Expense`,
          description: `${expense.description} (${(expense.entity_type as string) || 'Al Rams Furniture'})`,
          category: isCapex ? 'Investing' : 'Operating',
          paymentMethod: (expense.payment_method as string) || 'cash',
          debit: 0,
          credit: (expense.amount as number) || 0,
          balance: 0,
          reference: (expense.receipt_number as string) || `EXP-${(expense.id as string).slice(-8)}`,
          sourceId: expense.id as string,
          timestamp: expenseDate,
        });
      });
    }

    // 3. LOAN DISBURSEMENTS (INFLOW) - Money received from loans
    const { data: loanDisbursements, error: loanDisbError } = await supabaseAdmin
      .from('loan_opening_balances')
      .select('id, disbursement_date, original_amount, description, reference_number, payment_method, lender_name')
      .eq('disbursement_date', selectedDate)
      .order('disbursement_date', { ascending: true });

    if (!loanDisbError && loanDisbursements) {
      loanDisbursements.forEach((loan: Record<string, unknown>) => {
        const dateStr = loan.disbursement_date as string;
        if (!dateStr) return;
        
        const loanDate = new Date(`${dateStr}T12:00:00`);
        if (isNaN(loanDate.getTime())) return;
        
        allTransactions.push({
          id: `loan_disb_${loan.id}`,
          time: format(loanDate, 'HH:mm'),
          date: format(loanDate, 'dd-MM-yyyy'),
          source: 'loan_disbursement',
          type: 'Loan Disbursement',
          description: `Loan from ${(loan.lender_name as string) || 'Lender'}${(loan.description as string) ? ` - ${loan.description}` : ''}`,
          category: 'Financing',
          paymentMethod: (loan.payment_method as string) || 'bank_transfer',
          debit: (loan.original_amount as number) || 0,
          credit: 0,
          balance: 0,
          reference: (loan.reference_number as string) || `LOAN-${(loan.id as string).slice(-8)}`,
          sourceId: loan.id as string,
          timestamp: loanDate,
        });
      });
    }

    // 4. LOAN REPAYMENTS (OUTFLOW) - Loan payments
    const { data: loanPayments, error: loanPayError } = await supabaseAdmin
      .from('liability_payments')
      .select('id, payment_date, payment_amount, description, reference_number, payment_method')
      .eq('payment_date', selectedDate)
      .order('payment_date', { ascending: true });

    if (!loanPayError && loanPayments) {
      loanPayments.forEach((payment: Record<string, unknown>) => {
        const dateStr = payment.payment_date as string;
        if (!dateStr) return;
        
        const payDate = new Date(`${dateStr}T12:00:00`);
        if (isNaN(payDate.getTime())) return;
        
        allTransactions.push({
          id: `loan_pay_${payment.id}`,
          time: format(payDate, 'HH:mm'),
          date: format(payDate, 'dd-MM-yyyy'),
          source: 'loan_payment',
          type: 'Loan Payment',
          description: (payment.description as string) || 'Loan Repayment',
          category: 'Financing',
          paymentMethod: (payment.payment_method as string) || 'bank_transfer',
          debit: 0,
          credit: (payment.payment_amount as number) || 0,
          balance: 0,
          reference: (payment.reference_number as string) || `LP-${(payment.id as string).slice(-8)}`,
          sourceId: payment.id as string,
          timestamp: payDate,
        });
      });
    }

    // 5. INVESTMENTS (INFLOW) - Capital contributions
    const { data: investments, error: investError } = await supabaseAdmin
      .from('investments')
      .select('id, investment_date, amount, description, reference_number, payment_method, investor_name')
      .eq('investment_date', selectedDate)
      .order('investment_date', { ascending: true });

    if (!investError && investments) {
      investments.forEach((inv: Record<string, unknown>) => {
        const dateStr = inv.investment_date as string;
        if (!dateStr) return;
        
        const invDate = new Date(`${dateStr}T12:00:00`);
        if (isNaN(invDate.getTime())) return;
        
        allTransactions.push({
          id: `invest_${inv.id}`,
          time: format(invDate, 'HH:mm'),
          date: format(invDate, 'dd-MM-yyyy'),
          source: 'investment',
          type: 'Investment/Capital',
          description: `Investment from ${(inv.investor_name as string) || 'Investor'}${(inv.description as string) ? ` - ${inv.description}` : ''}`,
          category: 'Financing',
          paymentMethod: (inv.payment_method as string) || 'bank_transfer',
          debit: (inv.amount as number) || 0,
          credit: 0,
          balance: 0,
          reference: (inv.reference_number as string) || `INV-${(inv.id as string).slice(-8)}`,
          sourceId: inv.id as string,
          timestamp: invDate,
        });
      });
    }

    // 6. WITHDRAWALS (OUTFLOW) - Partner/owner withdrawals
    const { data: withdrawals, error: withdrawError } = await supabaseAdmin
      .from('withdrawals')
      .select('id, withdrawal_date, amount, description, reference_number, payment_method')
      .eq('withdrawal_date', selectedDate)
      .order('withdrawal_date', { ascending: true });

    if (!withdrawError && withdrawals) {
      withdrawals.forEach((withdrawal: Record<string, unknown>) => {
        const dateStr = withdrawal.withdrawal_date as string;
        if (!dateStr) return;
        
        const withDate = new Date(`${dateStr}T12:00:00`);
        if (isNaN(withDate.getTime())) return;
        
        allTransactions.push({
          id: `withdrawal_${withdrawal.id}`,
          time: format(withDate, 'HH:mm'),
          date: format(withDate, 'dd-MM-yyyy'),
          source: 'withdrawal',
          type: 'Partner Withdrawal',
          description: (withdrawal.description as string) || 'Owner Draw',
          category: 'Financing',
          paymentMethod: (withdrawal.payment_method as string) || 'cash',
          debit: 0,
          credit: (withdrawal.amount as number) || 0,
          balance: 0,
          reference: (withdrawal.reference_number as string) || `WD-${withdrawal.id}`,
          sourceId: (withdrawal.id as number).toString(),
          timestamp: withDate,
        });
      });
    }

    // 7. CUSTOMER REFUNDS (OUTFLOW) - Refunds to customers
    const { data: refunds, error: refundsError } = await supabaseAdmin
      .from('invoice_refunds')
      .select('id, refund_date, refund_amount, customer_name, refund_method, status')
      .eq('refund_date', selectedDate)
      .order('refund_date', { ascending: true });

    if (!refundsError && refunds) {
      refunds.forEach((refund: Record<string, unknown>) => {
        const dateStr = refund.refund_date as string;
        if (!dateStr) return;
        
        const refundDate = new Date(`${dateStr}T12:00:00`);
        if (isNaN(refundDate.getTime())) return;
        
        allTransactions.push({
          id: `refund_${refund.id}`,
          time: format(refundDate, 'HH:mm'),
          date: format(refundDate, 'dd-MM-yyyy'),
          source: 'refund',
          type: 'Customer Refund',
          description: `Refund to ${(refund.customer_name as string) || 'Customer'} (${refund.status})`,
          category: 'Financing',
          paymentMethod: (refund.refund_method as string) || 'cash',
          debit: 0,
          credit: (refund.refund_amount as number) || 0,
          balance: 0,
          reference: `REF-${(refund.id as string).slice(-8)}`,
          sourceId: refund.id as string,
          timestamp: refundDate,
        });
      });
    }

    // Sort all transactions by timestamp
    allTransactions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Calculate running balance
    let runningBalance = 0;
    const transactionsWithBalance = allTransactions.map(tx => {
      runningBalance += (tx.debit - tx.credit);
      return {
        ...tx,
        balance: runningBalance,
      };
    });

    // Calculate summary
    const totalReceipts = allTransactions.reduce((sum, tx) => sum + tx.debit, 0);
    const totalPayments = allTransactions.reduce((sum, tx) => sum + tx.credit, 0);
    const netCashFlow = totalReceipts - totalPayments;

    // Group by category
    const byCategory = {
      operating: {
        receipts: allTransactions.filter(t => t.category === 'Operating').reduce((s, t) => s + t.debit, 0),
        payments: allTransactions.filter(t => t.category === 'Operating').reduce((s, t) => s + t.credit, 0),
        net: 0,
      },
      investing: {
        receipts: allTransactions.filter(t => t.category === 'Investing').reduce((s, t) => s + t.debit, 0),
        payments: allTransactions.filter(t => t.category === 'Investing').reduce((s, t) => s + t.credit, 0),
        net: 0,
      },
      financing: {
        receipts: allTransactions.filter(t => t.category === 'Financing').reduce((s, t) => s + t.debit, 0),
        payments: allTransactions.filter(t => t.category === 'Financing').reduce((s, t) => s + t.credit, 0),
        net: 0,
      },
    };

    byCategory.operating.net = byCategory.operating.receipts - byCategory.operating.payments;
    byCategory.investing.net = byCategory.investing.receipts - byCategory.investing.payments;
    byCategory.financing.net = byCategory.financing.receipts - byCategory.financing.payments;

    // Group by payment method
    const byPaymentMethod: Record<string, number> = {};
    allTransactions.forEach(tx => {
      const method = tx.paymentMethod || 'unknown';
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + (tx.debit || tx.credit);
    });

    const summary = {
      date: selectedDate,
      totalReceipts,
      totalPayments,
      netCashFlow,
      transactionCount: allTransactions.length,
      byCategory,
      byPaymentMethod,
    };

    console.log(`✅ Day Sheet loaded: ${allTransactions.length} transactions, Net: ₹${netCashFlow.toLocaleString()}`);

    return NextResponse.json({
      success: true,
      transactions: transactionsWithBalance,
      summary,
    });

  } catch (error) {
    console.error('❌ Error fetching day sheet:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch day sheet',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
