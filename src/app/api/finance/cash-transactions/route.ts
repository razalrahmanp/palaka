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

    const offset = (page - 1) * limit;

    // Step 1: Get all CASH type account IDs from bank_accounts table
    // This ensures we only show transactions for accounts marked as CASH type
    console.log('🔍 Step 1: Fetching CASH account IDs from bank_accounts...');
    const { data: cashAccountsData, error: cashAccountError } = await supabaseAdmin
      .from('bank_accounts')
      .select('id')
      .eq('account_type', 'CASH');

    if (cashAccountError) {
      console.error('❌ Error fetching cash account IDs:', cashAccountError);
      return NextResponse.json({
        success: false,
        error: `Failed to fetch cash accounts: ${cashAccountError.message}`
      }, { status: 500 });
    }

    const cashAccountIds = (cashAccountsData || []).map(acc => acc.id);
    console.log('✅ Found CASH accounts:', cashAccountIds.length, 'accounts');

    if (cashAccountIds.length === 0) {
      console.log('⚠️ No cash accounts found, returning empty result');
      // No cash accounts found, return empty result
      return NextResponse.json({
        success: true,
        transactions: [],
        total_count: 0,
        current_page: page,
        total_pages: 0,
        filters_applied: {
          cash_account_id,
          source_type,
          transaction_type,
          date_from,
          date_to,
          search
        }
      });
    }

    // Step 2: Fetch transactions from bank_transactions table for these CASH accounts
    // Using the same unified table as BANK and UPI account types
    console.log('🔍 Step 2: Building query for bank_transactions...');
    let query = supabaseAdmin
      .from('bank_transactions')
      .select(`
        *,
        bank_account:bank_accounts!bank_transactions_bank_account_id_fkey (
          id,
          name,
          account_type,
          current_balance
        )
      `, { count: 'exact' })
      .in('bank_account_id', cashAccountIds);

    // Apply filters
    if (cash_account_id) {
      query = query.eq('bank_account_id', cash_account_id);
    }
    // Note: bank_transactions table uses 'date' and 'type' columns, not 'transaction_date' and 'transaction_type'
    if (date_from) {
      query = query.gte('date', date_from);
    }
    if (date_to) {
      query = query.lte('date', date_to);
    }

    // Apply search filter if provided
    if (search) {
      const searchPattern = `%${search}%`;
      query = query.or(`description.ilike.${searchPattern},reference_number.ilike.${searchPattern}`);
    }

    // Apply ordering and pagination
    query = query
      .order('date', { ascending: false });

    if (!export_data) {
      query = query.range(offset, offset + limit - 1);
    }

    console.log('🔍 Step 3: Executing query...');
    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching cash transactions from cash_transactions table:', error);
      return NextResponse.json({
        success: false,
        error: `Database query failed: ${error.message}`,
        details: error
      }, { status: 500 });
    }

    console.log('✅ Query successful, received', data?.length || 0, 'transactions');

    // Transform the data from bank_transactions table to match the expected cash transactions format
    // bank_transactions columns: id, date, type (deposit/withdrawal), amount, description, reference
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactions = (data || []).map((transaction: any) => ({
      id: transaction.id,
      transaction_date: transaction.date, // map 'date' to 'transaction_date'
      transaction_type: transaction.type === 'deposit' ? 'CREDIT' : 'DEBIT', // map 'deposit' to 'CREDIT', 'withdrawal' to 'DEBIT'
      amount: Math.abs(transaction.amount || 0),
      description: transaction.description || 'Cash Transaction',
      source_type: extractSourceType(transaction.description || ''),
      source_id: null,
      reference_number: transaction.reference || null,
      running_balance: 0, // bank_transactions doesn't have running_balance, will need to calculate
      cash_account_id: transaction.bank_account_id,
      cash_account_name: transaction.bank_account?.name || 'Unknown Account',
      source_description: extractSourceDescription(transaction.description || ''),
      created_at: transaction.date
    }));

    const total_count = count || 0;
    const total_pages = Math.ceil(total_count / limit);

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

      const csvRows = transactions.map((transaction) => [
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