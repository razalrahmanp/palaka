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
    
    console.log('✅ Fetching ONLY bank_transactions table for account:', { bankAccountId, page, limit, offset });

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

    // SIMPLIFIED: Fetch ONLY from bank_transactions table
    const allTransactions: BankTransactionDetail[] = [];

    // Fetch bank transactions for this account
    const { data: bankTransactions, error: bankTransError } = await supabaseAdmin
      .from('bank_transactions')
      .select('id, date, type, amount, description, reference, balance')
      .eq('bank_account_id', bankAccountId)
      .order('date', { ascending: true })
      .order('id', { ascending: true });

    if (bankTransError) {
      console.error('Error fetching bank transactions:', bankTransError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    if (bankTransactions) {
      bankTransactions.forEach(tx => {
        // Determine transaction type from description pattern matching
        let transactionType: 'bank_transaction' | 'vendor_payment' | 'withdrawal' | 'liability_payment' = 'bank_transaction';
        
        // Use description pattern matching to categorize transactions
        if (tx.description?.includes('Vendor Payment')) {
          transactionType = 'vendor_payment';
        } else if (tx.description?.includes('Withdrawal') || tx.description?.includes('Owner')) {
          transactionType = 'withdrawal';
        } else if (tx.description?.includes('Loan Payment') || tx.description?.includes('Liability')) {
          transactionType = 'liability_payment';
        }

        allTransactions.push({
          id: `bank_${tx.id}`,
          date: tx.date,
          type: tx.type,
          amount: tx.amount || 0,
          description: tx.description || 'Bank Transaction',
          reference: tx.reference || '',
          transaction_type: transactionType
        });
      });
    }

    console.log(`✅ Fetched ${allTransactions.length} transactions from bank_transactions table only`);

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

    // Sort all transactions by date (oldest first for proper balance calculation)
    allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance for ALL transactions (oldest to newest)
    console.log('📊 Calculating running balance for', allTransactions.length, 'transactions...');
    
    // Calculate running balance (already sorted oldest first)
    const balanceMap = new Map<string, number>();
    let runningBalance = 0;
    
    allTransactions.forEach((txn) => {
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

    console.log(`✅ Found ${allTransactions.length} total transactions from bank_transactions table for ${bankAccount.name}`);

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
            bank_transactions: allTransactions.length
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