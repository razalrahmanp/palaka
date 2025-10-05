import { NextResponse, NextRequest } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

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

    // 1. Fetch bank transactions (existing) for this account
    const { data: bankTransactions, error: bankTransError } = await supabaseAdmin
      .from('bank_transactions')
      .select('id, date, type, amount, description, reference, source_type, payment_method')
      .eq('bank_account_id', bankAccountId)
      .order('date', { ascending: false });

    if (!bankTransError && bankTransactions) {
      bankTransactions.forEach(tx => {
        // Use source_type if available, otherwise determine from description pattern
        let transactionType: 'bank_transaction' | 'vendor_payment' | 'withdrawal' | 'liability_payment' = 'bank_transaction';
        
        if (tx.source_type) {
          // Map source_type to transaction_type
          switch (tx.source_type) {
            case 'expense':
              transactionType = 'bank_transaction';
              break;
            case 'vendor_payment':
              transactionType = 'vendor_payment';
              break;
            case 'withdrawal':
              transactionType = 'withdrawal';
              break;
            case 'liability_payment':
              transactionType = 'liability_payment';
              break;
            case 'sales_payment':
              transactionType = 'bank_transaction';
              break;
            default:
              transactionType = 'bank_transaction';
          }
        } else {
          // Fallback to description pattern matching for old records
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
        }

        // Update description to show payment method if available
        let enhancedDescription = tx.description || 'Bank Transaction';
        if (tx.payment_method && tx.payment_method !== 'bank_transfer') {
          enhancedDescription += ` (${tx.payment_method.toUpperCase()})`;
        }

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
        // Fetch transactions from this linked UPI account
        const { data: upiTransactions, error: upiTransError } = await supabaseAdmin
          .from('bank_transactions')
          .select('id, date, type, amount, description, reference')
          .eq('bank_account_id', upiAccount.id)
          .order('date', { ascending: false });

        if (!upiTransError && upiTransactions) {
          upiTransactions.forEach(tx => {
            allTransactions.push({
              id: `upi_${tx.id}`,
              date: tx.date,
              type: tx.type,
              amount: tx.amount || 0,
              description: `${tx.description || 'UPI Transaction'} (via ${upiAccount.name})`,
              reference: tx.reference || '',
              transaction_type: 'bank_transaction'
            });
          });
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

    // Sort all transactions by date (most recent first)
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Get paginated results
    const paginatedTransactions = allTransactions.slice(offset, offset + limit);

    console.log(`Found ${allTransactions.length} total transactions for bank account ${bankAccount.name}: ${bankTransactions?.length || 0} bank, ${linkedUpiAccounts?.length || 0} linked UPI accounts, ${vendorPayments?.length || 0} vendor, ${withdrawals?.length || 0} withdrawals, ${liabilityPayments?.length || 0} liability payments`);

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

    return NextResponse.json({
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

  } catch (error) {
    console.error('Error in bank-transactions API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bank transactions' },
      { status: 500 }
    );
  }
}