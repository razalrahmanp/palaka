import { NextResponse, NextRequest } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabasePool';

interface BankTransactionDetail {
  id: string;
  date: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  description: string;
  reference: string;
  transaction_type: 'bank_transaction' | 'vendor_payment' | 'withdrawal' | 'liability_payment';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bankAccountId = searchParams.get('bank_account_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!bankAccountId) {
      return NextResponse.json(
        { success: false, error: 'Bank Account ID is required' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;
    
    console.log('Fetching comprehensive transactions for bank account:', { bankAccountId, page, limit, offset });

    // First, verify bank account exists
    const { data: bankAccount, error: bankError } = await supabaseAdmin
      .from('bank_accounts')
      .select('id, name, account_number, account_type, current_balance, upi_id, is_active')
      .eq('id', bankAccountId)
      .single();

    if (bankError || !bankAccount) {
      return NextResponse.json(
        { success: false, error: 'Bank account not found' },
        { status: 404 }
      );
    }

    // Fetch all transaction types for this bank account
    const allTransactions: BankTransactionDetail[] = [];

    // 1. Fetch bank transactions (existing) for this account (excluding sales payments to avoid duplicates)
    const { data: bankTransactions, error: bankTransError } = await supabaseAdmin
      .from('bank_transactions')
      .select('id, date, type, amount, description, reference')
      .eq('bank_account_id', bankAccountId)
      .not('description', 'like', '%Sales Payment%')  // Exclude sales payments - we get these from payments table
      .not('description', 'like', '%Payment received%')  // Exclude payment received entries if any
      .order('date', { ascending: false });

    if (!bankTransError && bankTransactions) {
      bankTransactions.forEach(tx => {
        // Determine transaction type from description pattern matching
        let transactionType: 'bank_transaction' | 'vendor_payment' | 'withdrawal' | 'liability_payment' = 'bank_transaction';
        
        // Use description pattern matching to categorize transactions
        if (tx.description?.includes('Expense:')) {
          transactionType = 'bank_transaction';
        } else if (tx.description?.includes('Payment received')) {
          transactionType = 'bank_transaction';
        } else if (tx.description?.includes('Vendor Payment')) {
          transactionType = 'vendor_payment';
        } else if (tx.description?.includes('Withdrawal') || tx.description?.includes('Owner')) {
          transactionType = 'withdrawal';
        } else if (tx.description?.includes('Loan Payment') || tx.description?.includes('Liability')) {
          transactionType = 'liability_payment';
        }

        // Use description as-is (no payment method info available in bank_transactions table)
        const enhancedDescription = tx.description || 'Bank Transaction';

        allTransactions.push({
          id: `bank_${tx.id}`,
          date: tx.date,
          type: tx.type,
          amount: tx.amount || 0,
          description: enhancedDescription,
          reference: tx.reference || '',
          transaction_type: transactionType
        });
      });
    }

    // 1.5. Fetch transactions from linked UPI accounts (UPI accounts that are linked to this bank account)
    const { data: linkedUpiAccounts, error: upiError } = await supabaseAdmin
      .from('bank_accounts')
      .select('id, name, upi_id')
      .eq('linked_bank_account_id', bankAccountId)
      .eq('account_type', 'UPI')
      .eq('is_active', true);

    if (!upiError && linkedUpiAccounts) {
      for (const upiAccount of linkedUpiAccounts) {
        // Fetch transactions from this linked UPI account, but filter out cash expenses
        const { data: upiTransactions, error: upiTransError } = await supabaseAdmin
          .from('bank_transactions')
          .select('id, date, type, amount, description, reference')
          .eq('bank_account_id', upiAccount.id)
          .order('date', { ascending: false });

        if (!upiTransError && upiTransactions) {
          for (const tx of upiTransactions) {
            // Skip transactions that look like cash expenses based on description pattern
            let shouldInclude = true;
            
            // If this looks like an expense transaction, check if it should be cash
            if (tx.description && tx.description.includes('Expense:')) {
              // Try to extract expense info from description and check if it might be cash
              // For now, we'll be conservative and exclude expenses from "Al rams Furniture" UPI account
              // since this account seems to be collecting cash expenses incorrectly
              console.log(`Filtering out expense transaction from UPI account: ${tx.description}`);
              shouldInclude = false;
            }
            
            if (shouldInclude) {
              allTransactions.push({
                id: `upi_${tx.id}`,
                date: tx.date,
                type: tx.type,
                amount: tx.amount || 0,
                description: `${tx.description || 'UPI Transaction'} (via ${upiAccount.name})`,
                reference: tx.reference || '',
                transaction_type: 'bank_transaction'
              });
            }
          }
        }
      }
    }

    // 2. Fetch vendor payments made through this bank account
    const { data: vendorPayments, error: vendorPayError } = await supabaseAdmin
      .from('vendor_payment_history')
      .select('id, payment_date, amount, description, reference_number, supplier_id, suppliers(name)')
      .eq('bank_account_id', bankAccountId)
      .order('payment_date', { ascending: false });

    if (!vendorPayError && vendorPayments) {
      vendorPayments.forEach(payment => {
        const supplier = payment.suppliers as { name?: string } | null;
        allTransactions.push({
          id: `vendor_${payment.id}`,
          date: payment.payment_date,
          type: 'withdrawal',
          amount: payment.amount || 0,
          description: `Vendor Payment: ${supplier?.name || 'Unknown Supplier'}${payment.description ? ` - ${payment.description}` : ''}`,
          reference: payment.reference_number || '',
          transaction_type: 'vendor_payment'
        });
      });
    }

    // 2.5. Fetch sales payments received through this bank account
    const { data: salesPayments, error: salesPayError } = await supabaseAdmin
      .from('payments')
      .select('id, payment_date, date, amount, description, reference, method, invoice_id')
      .eq('bank_account_id', bankAccountId)
      .order('payment_date', { ascending: false });

    if (!salesPayError && salesPayments) {
      salesPayments.forEach(payment => {
        // Use payment_date if available, otherwise fall back to date
        const transactionDate = payment.payment_date || payment.date;
        
        // Create descriptive text similar to what's shown in bank_transactions
        let description = 'Sales Payment';
        if (payment.invoice_id) {
          description = `Payment received for Sales Order via ${payment.method || 'bank_transfer'}`;
        }
        if (payment.description) {
          description += `: ${payment.description}`;
        }
        description += ` (${payment.method || 'bank_transfer'})`;
        
        allTransactions.push({
          id: `payment_${payment.id}`,
          date: transactionDate,
          type: 'deposit',
          amount: payment.amount || 0,
          description: description,
          reference: payment.reference || '',
          transaction_type: 'bank_transaction'
        });
      });
    }

    // 3. Fetch withdrawals (owner drawings) made through this bank account
    const { data: withdrawals, error: withdrawalError } = await supabaseAdmin
      .from('withdrawals')
      .select(`
        id, withdrawal_date, amount, description, reference_number, partner_id,
        partners(name),
        withdrawal_categories(category_name),
        withdrawal_subcategories(subcategory_name)
      `)
      .eq('bank_account_id', bankAccountId)
      .order('withdrawal_date', { ascending: false });

    if (!withdrawalError && withdrawals) {
      withdrawals.forEach(withdrawal => {
        const partner = withdrawal.partners as { name?: string } | null;
        const category = withdrawal.withdrawal_categories as { category_name?: string } | null;
        const subcategory = withdrawal.withdrawal_subcategories as { subcategory_name?: string } | null;
        
        let description = `Owner Withdrawal: ${partner?.name || 'Unknown Partner'}`;
        if (category?.category_name) {
          description += ` - ${category.category_name}`;
          if (subcategory?.subcategory_name) {
            description += ` (${subcategory.subcategory_name})`;
          }
        }
        if (withdrawal.description) {
          description += ` - ${withdrawal.description}`;
        }

        allTransactions.push({
          id: `withdrawal_${withdrawal.id}`,
          date: withdrawal.withdrawal_date,
          type: 'withdrawal',
          amount: withdrawal.amount || 0,
          description,
          reference: withdrawal.reference_number || '',
          transaction_type: 'withdrawal'
        });
      });
    }

    // 4. Fetch liability payments made through this bank account
    const { data: liabilityPayments, error: liabilityError } = await supabaseAdmin
      .from('liability_payments')
      .select(`
        id, date, total_amount, description, reference_number, loan_id,
        loan_opening_balances(loan_name, bank_name)
      `)
      .eq('bank_account_id', bankAccountId)
      .order('date', { ascending: false });

    if (!liabilityError && liabilityPayments) {
      liabilityPayments.forEach(payment => {
        const loan = payment.loan_opening_balances as { loan_name?: string; bank_name?: string } | null;
        
        let description = `Loan Payment: ${loan?.loan_name || 'Unknown Loan'}`;
        if (loan?.bank_name) {
          description += ` (${loan.bank_name})`;
        }
        if (payment.description) {
          description += ` - ${payment.description}`;
        }

        allTransactions.push({
          id: `liability_${payment.id}`,
          date: payment.date,
          type: 'withdrawal',
          amount: payment.total_amount || 0,
          description,
          reference: payment.reference_number || '',
          transaction_type: 'liability_payment'
        });
      });
    }

    // 6. Get invoice returns (sales returns that create refunds)
    const { data: invoiceReturns, error: returnsError } = await supabaseAdmin
      .from('returns')
      .select(`
        id,
        created_at,
        return_value,
        order_id,
        reason,
        return_type,
        sales_orders!inner(
          invoice_generated,
          invoices!inner(
            bank_account_id,
            total_amount
          )
        )
      `)
      .gt('return_value', 0)
      .not('sales_orders.invoices.bank_account_id', 'is', null)
      .eq('sales_orders.invoices.bank_account_id', bankAccountId);

    if (invoiceReturns && !returnsError) {
      invoiceReturns.forEach(returnItem => {
        allTransactions.push({
          id: `invoice_return_${returnItem.id}`,
          date: returnItem.created_at.split('T')[0],
          type: 'deposit',
          amount: returnItem.return_value || 0,
          description: `Invoice Return: ${returnItem.reason || returnItem.return_type || 'Customer Return'} (Order ${returnItem.order_id ? returnItem.order_id.slice(-8) : 'N/A'})`,
          reference: `RET-${returnItem.id.slice(-8)}`,
          transaction_type: 'bank_transaction'
        });
      });
    }

    // 7. Get purchase returns (supplier returns with payment reversals)
    const { data: purchaseReturns, error: purchaseReturnsError } = await supabaseAdmin
      .from('purchase_returns')
      .select(`
        id,
        return_date,
        net_return_amount,
        return_number,
        reason,
        reason_description,
        reversal_bank_account_id,
        reversal_method,
        reversal_reference_number,
        suppliers!inner(name)
      `)
      .eq('is_payment_reversed', true)  
      .eq('reversal_bank_account_id', bankAccountId)
      .gt('net_return_amount', 0);

    if (purchaseReturns && !purchaseReturnsError) {
      purchaseReturns.forEach(purchaseReturn => {
        const supplierName = Array.isArray(purchaseReturn.suppliers) 
          ? (purchaseReturn.suppliers[0] as { name: string })?.name 
          : (purchaseReturn.suppliers as { name: string })?.name || 'Unknown Supplier';
        const reasonText = purchaseReturn.reason_description || purchaseReturn.reason || 'Purchase Return';
        
        allTransactions.push({
          id: `purchase_return_${purchaseReturn.id}`,
          date: purchaseReturn.return_date,
          type: 'deposit',
          amount: purchaseReturn.net_return_amount || 0,
          description: `Purchase Return from ${supplierName}: ${reasonText} (${purchaseReturn.reversal_method?.toUpperCase() || 'BANK'})`,
          reference: purchaseReturn.reversal_reference_number || purchaseReturn.return_number || `PR-${purchaseReturn.id.slice(-8)}`,
          transaction_type: 'bank_transaction'
        });
      });
    }

    // 8. Get bank-linked expenses (non-cash expenses paid via this bank account)
    const { data: bankExpenses, error: expensesError } = await supabaseAdmin
      .from('expenses')
      .select('id, date, description, amount, payment_method, category, entity_type')
      .eq('bank_account_id', bankAccountId)
      .neq('payment_method', 'cash');

    if (bankExpenses && !expensesError) {
      bankExpenses.forEach(expense => {
        allTransactions.push({
          id: `bank_expense_${expense.id}`,
          date: expense.date,
          type: 'withdrawal',
          amount: expense.amount || 0,
          description: `${expense.category || 'Expense'}: ${expense.description} (${expense.payment_method?.toUpperCase() || 'BANK'})`,
          reference: `EXP-${expense.id.slice(-8)}`,
          transaction_type: 'bank_transaction'
        });
      });
    }

    // Sort all transactions by date (most recent first)
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate running balance for ALL transactions (oldest to newest)
    console.log('📊 Calculating running balance for', allTransactions.length, 'transactions...');
    
    // Create a copy sorted chronologically (oldest first) for balance calculation
    const sortedForBalance = [...allTransactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Calculate running balance
    const balanceMap = new Map<string, number>();
    let runningBalance = 0;
    
    sortedForBalance.forEach((txn) => {
      if (txn.type === 'deposit') {
        runningBalance += Math.abs(txn.amount || 0);
      } else {
        runningBalance -= Math.abs(txn.amount || 0);
      }
      balanceMap.set(txn.id, runningBalance);
    });

    console.log('💰 Final running balance:', runningBalance);
    console.log('📊 Balance map size:', balanceMap.size);

    // Apply the calculated running balance to all transactions
    allTransactions.forEach(transaction => {
      const balance = balanceMap.get(transaction.id);
      // @ts-expect-error - adding running_balance field dynamically
      transaction.running_balance = balance || 0;
    });

    // Get paginated results
    const paginatedTransactions = allTransactions.slice(offset, offset + limit);

    console.log(`Found ${allTransactions.length} total transactions for bank account ${bankAccount.name}: ${bankTransactions?.length || 0} bank, ${linkedUpiAccounts?.length || 0} linked UPI accounts, ${salesPayments?.length || 0} sales, ${vendorPayments?.length || 0} vendor, ${withdrawals?.length || 0} withdrawals, ${liabilityPayments?.length || 0} liability payments, ${invoiceReturns?.length || 0} invoice returns, ${purchaseReturns?.length || 0} purchase returns, ${bankExpenses?.length || 0} bank-linked expenses`);

    // Calculate summary statistics from all transactions
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let depositCount = 0;
    let withdrawalCount = 0;

    allTransactions.forEach(tx => {
      if (tx.type === 'deposit') {
        totalDeposits += tx.amount;
        depositCount++;
      } else if (tx.type === 'withdrawal') {
        totalWithdrawals += tx.amount;
        withdrawalCount++;
      }
    });

    // Count linked UPI transactions for breakdown
    let linkedUpiTransactionCount = 0;
    if (linkedUpiAccounts) {
      for (const upiAccount of linkedUpiAccounts) {
        const { count: upiCount } = await supabaseAdmin
          .from('bank_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('bank_account_id', upiAccount.id);
        linkedUpiTransactionCount += upiCount || 0;
      }
    }

    // Format account display name
    let displayName = bankAccount.name;
    if (bankAccount.account_type === 'UPI' && bankAccount.upi_id) {
      displayName += ` (UPI: ${bankAccount.upi_id})`;
    } else if (bankAccount.account_number) {
      displayName += ` (${bankAccount.account_number})`;
    }

    const response = NextResponse.json({
      success: true,
      data: {
        bank_account: {
          id: bankAccount.id,
          name: displayName,
          account_number: bankAccount.account_number,
          account_type: bankAccount.account_type,
          current_balance: bankAccount.current_balance,
          upi_id: bankAccount.upi_id,
          is_active: bankAccount.is_active
        },
        summary: {
          total_deposits: totalDeposits,
          total_withdrawals: totalWithdrawals,
          deposit_count: depositCount,
          withdrawal_count: withdrawalCount,
          net_balance: totalDeposits - totalWithdrawals,
          current_balance: bankAccount.current_balance,
          transaction_count: allTransactions.length,
          breakdown: {
            bank_transactions: bankTransactions?.length || 0,
            linked_upi_transactions: linkedUpiTransactionCount,
            sales_payments: salesPayments?.length || 0,
            vendor_payments: vendorPayments?.length || 0,
            owner_withdrawals: withdrawals?.length || 0,
            loan_payments: liabilityPayments?.length || 0
          }
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

    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('ETag', `"bank-transactions-${bankAccountId}-${Date.now()}"`);
    response.headers.set('Last-Modified', new Date().toUTCString());

    return response;

  } catch (error) {
    console.error('Error in bank-transactions API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bank transactions' },
      { status: 500 }
    );
  }
}