// ================================================================================================
// CASH TRANSACTIONS API ENDPOINT - UPDATED TO USE CENTRALIZED SYSTEM
// ================================================================================================
// Handles all cash transaction operations: GET (with filtering), POST (create), DELETE
// Integrates with the centralized cash management system
// ================================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabasePool';
import { createCashTransaction, getCashTransactions, validateCashBalance } from '@/lib/cashManager';



// ================================================================================================
// GET - Fetch cash transactions with filtering and pagination
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

    console.log('💰 Fetching cash transactions with filters:', {
      page, limit, cash_account_id, source_type, transaction_type, date_from, date_to, search, export_data
    });

    // Use the centralized cash transactions function
    const result = await getCashTransactions({
      page: export_data ? undefined : page,
      limit: export_data ? undefined : limit,
      cash_account_id,
      source_type,
      transaction_type,
      date_from,
      date_to
    });

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
      const csvRows = result.transactions.map((transaction: any) => [
        transaction.transaction_date,
        transaction.transaction_type,
        transaction.amount.toString(),
        `"${transaction.description.replace(/"/g, '""')}"`,
        transaction.source_description,
        transaction.cash_account_name,
        transaction.reference_number || '',
        transaction.running_balance.toString(),
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

    // Apply search filter if provided (done at API level for flexibility)
    let filteredTransactions = result.transactions;
    if (search) {
      const searchLower = search.toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filteredTransactions = result.transactions.filter((transaction: any) =>
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.reference_number?.toLowerCase().includes(searchLower) ||
        transaction.cash_account_name.toLowerCase().includes(searchLower) ||
        transaction.source_description.toLowerCase().includes(searchLower)
      );
    }

    // Recalculate pagination for filtered results
    const total_count = search ? filteredTransactions.length : result.total_count;
    const total_pages = Math.ceil(total_count / limit);
    const offset = (page - 1) * limit;
    const paginatedTransactions = search ? filteredTransactions.slice(offset, offset + limit) : filteredTransactions;

    console.log('✅ Successfully fetched cash transactions:', {
      total_count,
      current_page: page,
      total_pages,
      returned_count: paginatedTransactions.length
    });

    return NextResponse.json({
      success: true,
      transactions: paginatedTransactions,
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
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
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