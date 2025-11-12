import { NextResponse, NextRequest } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabasePool';

interface CashTransaction {
  id: string;
  date: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  description: string;
  reference: string;
  source: 'expense' | 'sales_payment' | 'investment' | 'liability_payment' | 'manual' | 'vendor_payment';
  balance_after?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = (page - 1) * limit;
    
    console.log('Fetching comprehensive cash transactions with pagination:', { page, limit, offset });

    const allTransactions: CashTransaction[] = [];

    // 1. Cash Expenses (all expenses with payment_method = 'cash')
    const { data: expenses, error: expensesError } = await supabaseAdmin
      .from('expenses')
      .select('id, date, amount, description, payment_method, created_at')
      .or('payment_method.ilike.cash,payment_method.ilike.CASH')
      .order('date', { ascending: false });

    if (!expensesError && expenses) {
      expenses.forEach(expense => {
        allTransactions.push({
          id: `expense_${expense.id}`,
          date: expense.date,
          type: 'withdrawal',
          amount: expense.amount,
          description: `Expense: ${expense.description}`,
          reference: `EXP-${String(expense.id).slice(0, 8)}`,
          source: 'expense'
        });
      });
    }

    // 2. Cash Sales Payments
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select('id, amount, payment_date, date, method, reference, description, sales_order_id')
      .or('method.ilike.cash,method.ilike.CASH')
      .order('date', { ascending: false });

    if (!paymentsError && payments) {
      payments.forEach(payment => {
        allTransactions.push({
          id: `payment_${payment.id}`,
          date: payment.date || payment.payment_date,
          type: 'deposit',
          amount: payment.amount,
          description: payment.description || 'Sales Payment',
          reference: payment.reference || `PAY-${String(payment.id).slice(0, 8)}`,
          source: 'sales_payment'
        });
      });
    }

    // 3. Cash Investments
    const { data: investments, error: investmentsError } = await supabaseAdmin
      .from('investments')
      .select('id, amount, investment_date, description, payment_method, reference_number')
      .or('payment_method.ilike.cash,payment_method.ilike.CASH')
      .order('investment_date', { ascending: false });

    if (!investmentsError && investments) {
      investments.forEach(investment => {
        allTransactions.push({
          id: `investment_${investment.id}`,
          date: investment.investment_date,
          type: 'deposit',
          amount: investment.amount,
          description: `Investment: ${investment.description}`,
          reference: investment.reference_number || `INV-${String(investment.id).slice(0, 8)}`,
          source: 'investment'
        });
      });
    }

    // 4. Cash Liability Payments
    const { data: liabilityPayments, error: liabilityError } = await supabaseAdmin
      .from('liability_payments')
      .select('id, date, total_amount, description, payment_method, reference_number')
      .or('payment_method.ilike.cash,payment_method.ilike.CASH')
      .order('date', { ascending: false });

    if (!liabilityError && liabilityPayments) {
      liabilityPayments.forEach(liability => {
        allTransactions.push({
          id: `liability_${liability.id}`,
          date: liability.date,
          type: 'withdrawal',
          amount: liability.total_amount,
          description: `Liability Payment: ${liability.description}`,
          reference: liability.reference_number || `LIB-${String(liability.id).slice(0, 8)}`,
          source: 'liability_payment'
        });
      });
    }

    // 5. Cash Vendor Payments
    const { data: vendorPayments, error: vendorError } = await supabaseAdmin
      .from('vendor_payments')
      .select('id, amount, payment_date, description, payment_method, reference_number')
      .or('payment_method.ilike.cash,payment_method.ilike.CASH')
      .order('payment_date', { ascending: false });

    if (!vendorError && vendorPayments) {
      vendorPayments.forEach(vendorPayment => {
        allTransactions.push({
          id: `vendor_${vendorPayment.id}`,
          date: vendorPayment.payment_date,
          type: 'withdrawal',
          amount: vendorPayment.amount,
          description: `Vendor Payment: ${vendorPayment.description}`,
          reference: vendorPayment.reference_number || `VEN-${String(vendorPayment.id).slice(0, 8)}`,
          source: 'vendor_payment'
        });
      });
    }

    // 6. Manual cash transactions from bank_accounts table with account_type = 'CASH'
    // EXCLUDE vendor payment entries (reference starts with 'VP-') to avoid double counting
    const { data: cashAccounts, error: cashAccountsError } = await supabaseAdmin
      .from('bank_accounts')
      .select('id, name, current_balance')
      .eq('account_type', 'CASH')
      .eq('is_active', true);

    const cashAccountTransactions: CashTransaction[] = [];
    if (!cashAccountsError && cashAccounts) {
      for (const cashAccount of cashAccounts) {
        const { data: bankTransactions, error: bankTxError } = await supabaseAdmin
          .from('bank_transactions')
          .select('id, date, type, amount, description, reference')
          .eq('bank_account_id', cashAccount.id)
          .order('date', { ascending: false });

        if (!bankTxError && bankTransactions) {
          bankTransactions.forEach(tx => {
            // Skip vendor payment entries - they're already included from vendor_payments table
            if (tx.reference && tx.reference.startsWith('VP-')) {
              return;
            }
            
            cashAccountTransactions.push({
              id: `cash_tx_${tx.id}`,
              date: tx.date,
              type: tx.type,
              amount: tx.amount,
              description: `${cashAccount.name}: ${tx.description}`,
              reference: tx.reference || `CTX-${String(tx.id).slice(0, 8)}`,
              source: 'manual'
            });
          });
        }
      }
    }

    allTransactions.push(...cashAccountTransactions);

    // Fetch customer names for sales order payments
    console.log('👥 Fetching customer names for sales order payments...');
    const orderReferences = allTransactions
      .filter(t => t.reference && t.reference.startsWith('Order-'))
      .map(t => t.reference.replace('Order-', ''));
    
    if (orderReferences.length > 0) {
      console.log(`🔍 Found ${orderReferences.length} sales order references`);
      
      const { data: ordersData, error: ordersError } = await supabaseAdmin
        .from('sales_orders')
        .select(`
          id,
          customer_id,
          customers (
            id,
            name
          )
        `)
        .in('id', orderReferences);

      if (ordersError) {
        console.error('❌ Error fetching order customer data:', ordersError);
      } else if (ordersData && ordersData.length > 0) {
        console.log(`✅ Fetched customer data for ${ordersData.length} orders`);
        
        // Create a map of order ID to customer name
        const orderCustomerMap = new Map<string, string>();
        ordersData.forEach((order) => {
          // Supabase returns customers as an object when using joins
          const customers = order.customers as unknown as { id: string; name: string } | null;
          if (customers && customers.name) {
            orderCustomerMap.set(order.id, customers.name);
          }
        });

        // Update descriptions with customer names
        allTransactions.forEach(transaction => {
          if (transaction.reference && transaction.reference.startsWith('Order-')) {
            const orderId = transaction.reference.replace('Order-', '');
            const customerName = orderCustomerMap.get(orderId);
            
            if (customerName && !transaction.description.includes(customerName)) {
              // Append customer name to description if not already present
              transaction.description = `${transaction.description} - ${customerName}`;
            }
          }
        });
        
        console.log('✅ Updated transaction descriptions with customer names');
      }
    }

    // Sort all transactions by date (most recent first)
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate running balance for cash transactions
    let runningBalance = 0;
    
    // Calculate total cash position from cash accounts
    const totalCashAccountBalance = cashAccounts?.reduce((total, account) => 
      total + (account.current_balance || 0), 0) || 0;

    // Start with current cash balance and work backwards
    for (let i = 0; i < allTransactions.length; i++) {
      const transaction = allTransactions[i];
      if (i === 0) {
        // First transaction gets the current balance
        runningBalance = totalCashAccountBalance;
      } else {
        // Calculate balance before this transaction
        const prevTransaction = allTransactions[i - 1];
        if (prevTransaction.type === 'deposit') {
          runningBalance -= prevTransaction.amount;
        } else {
          runningBalance += prevTransaction.amount;
        }
      }
      transaction.balance_after = runningBalance;
    }

    // Apply pagination
    const paginatedTransactions = allTransactions.slice(offset, offset + limit);

    // Calculate summary statistics
    const totalDeposits = allTransactions
      .filter(tx => tx.type === 'deposit')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const totalWithdrawals = allTransactions
      .filter(tx => tx.type === 'withdrawal')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const sourceBreakdown = allTransactions.reduce((acc, tx) => {
      acc[tx.source] = (acc[tx.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: {
        cash_accounts: cashAccounts,
        summary: {
          total_deposits: totalDeposits,
          total_withdrawals: totalWithdrawals,
          net_cash_flow: totalDeposits - totalWithdrawals,
          current_cash_balance: totalCashAccountBalance,
          transaction_count: allTransactions.length,
          source_breakdown: sourceBreakdown
        },
        transactions: paginatedTransactions,
        pagination: {
          page,
          limit,
          total: allTransactions.length,
          totalPages: Math.ceil(allTransactions.length / limit),
          hasMore: (page * limit) < allTransactions.length
        }
      }
    });

  } catch (error) {
    console.error('Error in cash-ledger API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cash transactions' },
      { status: 500 }
    );
  }
}