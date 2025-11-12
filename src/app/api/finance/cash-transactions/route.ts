// ================================================================================================
// CASH TRANSACTIONS API ENDPOINT - UPDATED TO FETCH FROM BANK_TRANSACTIONS TABLE
// ================================================================================================
// Handles all cash transaction operations: GET (with filtering), POST (create), DELETE
// Fetches transactions from bank_transactions table where account_type = 'CASH'
// ================================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabasePool';
import { createCashTransaction, validateCashBalance } from '@/lib/cashManager';

// Helper function to extract source type from description
function extractSourceType(description: string): string {
  if (description.includes('Sales Payment') || description.includes('Payment received')) return 'sales_payment';
  if (description.includes('Expense:') || description.includes('Vendor payment')) return 'expense';
  if (description.includes('Withdrawal') || description.includes('Owner')) return 'withdrawal';
  if (description.includes('Investment') || description.includes('Capital contribution')) return 'investment';
  if (description.includes('Liability') || description.includes('Loan Payment')) return 'liability_payment';
  if (description.includes('Refund')) return 'refund';
  if (description.includes('Fund Transfer')) return 'fund_transfer';
  return 'manual_adjustment';
}

// Helper function to extract source description from transaction description
function extractSourceDescription(description: string): string {
  if (description.includes('Sales Payment') || description.includes('Payment received')) return 'Sales Receipt';
  if (description.includes('Expense:') || description.includes('Vendor payment')) return 'Expense Payment';
  if (description.includes('Withdrawal')) return 'Withdrawal';
  if (description.includes('Investment')) return 'Investment';
  if (description.includes('Liability')) return 'Liability Payment';
  if (description.includes('Refund')) return 'Refund';
  if (description.includes('Fund Transfer')) return 'Fund Transfer';
  return 'Cash Transaction';
}

// ================================================================================================
// GET - Fetch cash transactions from bank_transactions table
// ================================================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const cash_account_id = searchParams.get('cash_account_id') || undefined;
    const source_type = searchParams.get('source_type') || undefined;
    const transaction_type = searchParams.get('transaction_type') as 'DEBIT' | 'CREDIT' | undefined;
    const date_from = searchParams.get('date_from') || undefined;
    const date_to = searchParams.get('date_to') || undefined;
    const search = searchParams.get('search') || undefined;
    const export_data = searchParams.get('export') === 'true';

    console.log('💰 Fetching cash transactions from cash_transactions table with filters:', {
      page, limit, cash_account_id, source_type, transaction_type, date_from, date_to, search, export_data
    });

    // Using direct Supabase query instead of RPC to bypass 1000 row limit
    console.log('🔍 Using direct query with high limit to fetch all transactions');
    
    // Call RPC function without any limit to fetch ALL transactions
    // Supabase RPC functions don't respect .limit(), so we need to use .select() instead
    console.log('🔍 Using direct query instead of RPC to bypass 1000 row limit');
    
    let query = supabaseAdmin
      .from('bank_transactions')
      .select(`
        id,
        date,
        type,
        amount,
        description,
        reference,
        bank_account_id,
        bank_accounts!inner (
          id,
          name,
          account_number,
          account_type
        )
      `, { count: 'exact' })
      .eq('bank_accounts.account_type', 'CASH')
      .order('date', { ascending: false });

    // Apply filters
    if (cash_account_id) {
      query = query.eq('bank_account_id', cash_account_id);
    }
    if (transaction_type) {
      // Map CREDIT/DEBIT to deposit/withdrawal
      const dbType = transaction_type === 'CREDIT' ? 'deposit' : 'withdrawal';
      query = query.eq('type', dbType);
    }
    if (date_from) {
      query = query.gte('date', date_from);
    }
    if (date_to) {
      query = query.lte('date', date_to);
    }
    if (search) {
      query = query.or(`description.ilike.%${search}%,reference.ilike.%${search}%`);
    }

    // Implement proper pagination
    const offset = (page - 1) * limit;
    const rangeEnd = offset + limit - 1;
    
    console.log(`📄 Fetching page ${page}, offset ${offset}, limit ${limit}`);
    const { data, error, count } = await query.range(offset, rangeEnd);

    if (error) {
      console.error('❌ Error querying transactions:', error);
      return NextResponse.json({
        success: false,
        error: `Query failed: ${error.message}`,
        details: error
      }, { status: 500 });
    }

    console.log('✅ Query successful, received', data?.length || 0, 'transactions');
    if (count !== null) {
      console.log('📊 Total count from query:', count);
    }
    if (data && data.length > 0) {
      console.log('📝 First transaction:', data[0]);
    } else {
      console.log('⚠️ No transactions returned from query');
    }

    // Transform the data to match the expected cash transactions format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappedTransactions = (data || []).map((transaction: any) => ({
      id: transaction.id,
      transaction_date: transaction.date,
      transaction_type: transaction.type === 'deposit' ? 'CREDIT' : 'DEBIT',
      amount: Math.abs(transaction.amount || 0),
      description: transaction.description || 'Cash Transaction',
      source_type: extractSourceType(transaction.description || ''),
      source_id: null,
      reference_number: transaction.reference || null,
      running_balance: 0, // Will be calculated below
      cash_account_id: transaction.bank_account_id,
      cash_account_name: transaction.bank_accounts?.name || transaction.bank_accounts?.account_number || 'Unknown Account',
      source_description: extractSourceDescription(transaction.description || ''),
      created_at: transaction.date
    }));

    // Fetch customer names for sales order payments
    console.log('👥 Fetching customer names for sales order payments...');
    const orderReferences = mappedTransactions
      .filter(t => t.reference_number && t.reference_number.startsWith('Order-'))
      .map(t => t.reference_number!.replace('Order-', ''));
    
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
          // Supabase returns customers as an array when using joins
          const customers = order.customers as unknown as { id: string; name: string } | null;
          if (customers && customers.name) {
            orderCustomerMap.set(order.id, customers.name);
          }
        });

        // Update descriptions with customer names
        mappedTransactions.forEach(transaction => {
          if (transaction.reference_number && transaction.reference_number.startsWith('Order-')) {
            const orderId = transaction.reference_number.replace('Order-', '');
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

    // Calculate running balance properly:
    // We need to fetch ALL transactions for this cash account (not just current page)
    // to calculate the correct running balance for each transaction
    console.log('📊 Fetching ALL transactions for running balance calculation...');
    
    const { data: allTransactionsData, error: balanceError } = await supabaseAdmin
      .from('bank_transactions')
      .select(`
        id,
        date,
        type,
        amount,
        bank_account_id
      `)
      .eq('bank_account_id', cash_account_id || mappedTransactions[0]?.cash_account_id)
      .order('date', { ascending: true })
      .order('id', { ascending: true }); // Secondary sort by ID for same-date transactions

    if (balanceError) {
      console.error('❌ Error fetching transactions for balance calculation:', balanceError);
    } else {
      console.log('✅ Fetched', allTransactionsData?.length || 0, 'transactions for balance calculation');
      if (allTransactionsData && allTransactionsData.length > 0) {
        console.log('📝 First transaction for balance:', {
          id: allTransactionsData[0].id,
          date: allTransactionsData[0].date,
          type: allTransactionsData[0].type,
          amount: allTransactionsData[0].amount
        });
        console.log('📝 Last transaction for balance:', {
          id: allTransactionsData[allTransactionsData.length - 1].id,
          date: allTransactionsData[allTransactionsData.length - 1].date,
          type: allTransactionsData[allTransactionsData.length - 1].type,
          amount: allTransactionsData[allTransactionsData.length - 1].amount
        });
      }
    }

    // Calculate running balance for ALL transactions
    const balanceMap = new Map<string, number>();
    let runningBalance = 0;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (allTransactionsData || []).forEach((txn: any) => {
      if (txn.type === 'deposit') {
        runningBalance += Math.abs(txn.amount || 0);
      } else {
        runningBalance -= Math.abs(txn.amount || 0);
      }
      balanceMap.set(txn.id, runningBalance);
    });

    console.log('💰 Final running balance:', runningBalance);
    console.log('📊 Balance map size:', balanceMap.size);

    // Apply the calculated running balance to our mapped transactions
    mappedTransactions.forEach(transaction => {
      const balance = balanceMap.get(transaction.id);
      transaction.running_balance = balance || 0;
      if (!balance && balance !== 0) {
        console.log('⚠️ No balance found for transaction:', transaction.id);
      }
    });

    console.log('✅ Running balance calculated for', allTransactionsData?.length || 0, 'total transactions');

    // Return transactions in original order (DESC by date from RPC function)
    const transactions = mappedTransactions;

    const total_count = data?.length || 0;
    const total_pages = limit > 0 ? Math.ceil(total_count / limit) : 1;

    // If export is requested, return CSV data
    if (export_data) {
      const csvHeaders = [
        'Date',
        'Type',
        'Amount',
        'Description',
        'Source',
        'Account',
        'Reference',
        'Running Balance',
        'Created At'
      ].join(',');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const csvRows = transactions.map((transaction: any) => [
        transaction.transaction_date,
        transaction.transaction_type,
        transaction.amount.toString(),
        `"${transaction.description.replace(/"/g, '""')}"`,
        transaction.source_description,
        transaction.cash_account_name,
        transaction.reference_number || '',
        transaction.running_balance?.toString() || '0',
        transaction.created_at
      ].join(','));

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="cash_transactions_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    console.log('✅ Successfully fetched cash transactions from cash_transactions table:', {
      total_count,
      current_page: page,
      total_pages,
      returned_count: transactions.length
    });

    return NextResponse.json({
      success: true,
      transactions: transactions,
      total_count,
      current_page: page,
      total_pages,
      filters_applied: {
        cash_account_id,
        source_type,
        transaction_type,
        date_from,
        date_to,
        search
      }
    });

  } catch (error) {
    console.error('❌ Error in GET /api/finance/cash-transactions:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorType: error instanceof Error ? error.constructor.name : typeof error
    }, { status: 500 });
  }
}

// ================================================================================================
// POST - Create a new cash transaction
// ================================================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      transaction_date,
      amount,
      transaction_type,
      description,
      reference_number,
      cash_account_id,
      notes,
      source_type = 'manual_adjustment',
      source_id,
      created_by,
      journal_entry_id
    } = body;

    console.log('💰 Creating new cash transaction:', {
      transaction_date,
      amount,
      transaction_type,
      description,
      source_type,
      cash_account_id
    });

    // Validation
    if (!amount || amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Amount is required and must be greater than 0'
      }, { status: 400 });
    }

    if (!description?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Description is required'
      }, { status: 400 });
    }

    if (!transaction_type || !['DEBIT', 'CREDIT'].includes(transaction_type)) {
      return NextResponse.json({
        success: false,
        error: 'Transaction type must be either DEBIT or CREDIT'
      }, { status: 400 });
    }

    // For DEBIT transactions, validate sufficient balance
    if (transaction_type === 'DEBIT') {
      const balanceCheck = await validateCashBalance(amount, cash_account_id);
      if (!balanceCheck.valid) {
        return NextResponse.json({
          success: false,
          error: balanceCheck.error || 'Insufficient cash balance'
        }, { status: 400 });
      }
    }

    // Create the transaction using centralized function
    const result = await createCashTransaction({
      transaction_date: transaction_date || new Date().toISOString().split('T')[0],
      amount: parseFloat(amount.toString()),
      transaction_type,
      description: description.trim(),
      reference_number: reference_number?.trim() || undefined,
      source_type,
      source_id: source_id?.toString() || undefined,
      cash_account_id: cash_account_id || undefined,
      notes: notes?.trim() || undefined,
      created_by: created_by || undefined,
      journal_entry_id: journal_entry_id || undefined
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to create cash transaction'
      }, { status: 500 });
    }

    console.log('✅ Cash transaction created successfully:', result.transaction_id);

    return NextResponse.json({
      success: true,
      message: 'Cash transaction created successfully',
      transaction_id: result.transaction_id
    });

  } catch (error) {
    console.error('❌ Error in POST /api/finance/cash-transactions:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// ================================================================================================
// DELETE - Soft delete a cash transaction
// ================================================================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transaction_id = searchParams.get('id');

    if (!transaction_id) {
      return NextResponse.json({
        success: false,
        error: 'Transaction ID is required'
      }, { status: 400 });
    }

    console.log('💰 Soft deleting cash transaction:', transaction_id);

    // Get transaction details before deletion
    const { data: transaction, error: fetchError } = await supabaseAdmin
      .from('cash_transactions')
      .select('*')
      .eq('id', transaction_id)
      .eq('is_deleted', false)
      .single();

    if (fetchError || !transaction) {
      return NextResponse.json({
        success: false,
        error: 'Transaction not found'
      }, { status: 404 });
    }

    // Prevent deletion of system transactions
    if (transaction.source_type === 'opening_balance') {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete opening balance transactions'
      }, { status: 400 });
    }

    // Soft delete the transaction
    const { error: deleteError } = await supabaseAdmin
      .from('cash_transactions')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: transaction.created_by // Use same user or get from auth
      })
      .eq('id', transaction_id);

    if (deleteError) {
      console.error('❌ Error deleting cash transaction:', deleteError);
      return NextResponse.json({
        success: false,
        error: deleteError.message
      }, { status: 500 });
    }

    console.log('✅ Cash transaction deleted successfully:', transaction_id);

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error in DELETE /api/finance/cash-transactions:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}