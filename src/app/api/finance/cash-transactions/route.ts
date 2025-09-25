import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';



export async function GET() {
  try {
    const allTransactions: {
      id: string;
      transaction_date: string;
      description: string;
      amount: number;
      transaction_type: string;
      reference_number: string;
      account_name: string;
      source: string;
      balance_after: number;
    }[] = [];

    // 1. Fetch investments with cash payment method
    const { data: investments, error: investmentsError } = await supabase
      .from('investments')
      .select('id, amount, investment_date, description, payment_method, reference_number')
      .or('payment_method.ilike.cash,payment_method.ilike.CASH')
      .order('investment_date', { ascending: false });

    if (!investmentsError && investments) {
      investments.forEach(inv => {
        allTransactions.push({
          id: `inv_${inv.id}`,
          transaction_date: inv.investment_date,
          description: inv.description || 'Investment',
          amount: parseFloat(inv.amount.toString()),
          transaction_type: 'CREDIT',
          reference_number: inv.reference_number || 'N/A',
          account_name: 'Cash',
          source: 'Investment',
          balance_after: 0
        });
      });
    }

    // 2. Fetch liability payments with cash payment method
    const { data: liabilityPayments, error: liabilityError } = await supabase
      .from('liability_payments')
      .select('id, total_amount, date, description, payment_method, reference_number')
      .or('payment_method.ilike.cash,payment_method.ilike.CASH')
      .order('date', { ascending: false });

    if (!liabilityError && liabilityPayments) {
      liabilityPayments.forEach(payment => {
        allTransactions.push({
          id: `liability_${payment.id}`,
          transaction_date: payment.date,
          description: payment.description || 'Liability Payment',
          amount: parseFloat(payment.total_amount.toString()),
          transaction_type: 'DEBIT',
          reference_number: payment.reference_number || 'N/A',
          account_name: 'Cash',
          source: 'Liability Payment',
          balance_after: 0
        });
      });
    }

    // 3. Fetch withdrawals with cash payment method
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('withdrawals')
      .select('id, amount, withdrawal_date, description, payment_method, reference_number')
      .or('payment_method.ilike.cash,payment_method.ilike.CASH')
      .order('withdrawal_date', { ascending: false });

    if (!withdrawalsError && withdrawals) {
      withdrawals.forEach(withdrawal => {
        allTransactions.push({
          id: `withdrawal_${withdrawal.id}`,
          transaction_date: withdrawal.withdrawal_date,
          description: withdrawal.description || 'Withdrawal',
          amount: parseFloat(withdrawal.amount.toString()),
          transaction_type: 'DEBIT',
          reference_number: withdrawal.reference_number || 'N/A',
          account_name: 'Cash',
          source: 'Withdrawal',
          balance_after: 0
        });
      });
    }

    // 4. Fetch payments with cash method (sales orders)
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, amount, payment_date, date, method, reference, description')
      .or('method.ilike.cash,method.ilike.CASH')
      .order('date', { ascending: false });

    if (!paymentsError && payments) {
      payments.forEach(payment => {
        allTransactions.push({
          id: `payment_${payment.id}`,
          transaction_date: payment.date || payment.payment_date,
          description: payment.description || 'Sales Payment',
          amount: parseFloat(payment.amount.toString()),
          transaction_type: 'CREDIT',
          reference_number: payment.reference || 'N/A',
          account_name: 'Cash',
          source: 'Sales',
          balance_after: 0
        });
      });
    }
    
    // Sort all transactions by date (oldest first for balance calculation)
    allTransactions.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

    // Calculate running balances
    let runningBalance = 0;
    allTransactions.forEach(transaction => {
      if (transaction.transaction_type === 'CREDIT') {
        runningBalance += transaction.amount;
      } else {
        runningBalance -= transaction.amount;
      }
      transaction.balance_after = runningBalance;
    });

    // Sort again by date (newest first for display)
    allTransactions.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

    return NextResponse.json(allTransactions);
  } catch (error) {
    console.error('Error in cash transactions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

