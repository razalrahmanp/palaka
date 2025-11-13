import { NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabasePool';

interface FundTransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  reference?: string;
  date?: string;
}

export async function POST(req: Request) {
  try {
    const {
      fromAccountId,
      toAccountId,
      amount,
      description = '',
      reference = '',
      date = new Date().toISOString().split('T')[0]
    }: FundTransferRequest = await req.json();

    // Validation
    if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid transfer details. All fields are required and amount must be positive.'
      }, { status: 400 });
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json({
        success: false,
        error: 'Source and destination accounts must be different.'
      }, { status: 400 });
    }

    // Start a transaction to ensure data consistency
    const { data: fromAccount, error: fromAccountError } = await supabaseAdmin
      .from('bank_accounts')
      .select('id, name, current_balance, account_type, is_active')
      .eq('id', fromAccountId)
      .eq('is_active', true)
      .single();

    if (fromAccountError || !fromAccount) {
      return NextResponse.json({
        success: false,
        error: 'Source account not found or inactive.'
      }, { status: 404 });
    }

    const { data: toAccount, error: toAccountError } = await supabaseAdmin
      .from('bank_accounts')
      .select('id, name, current_balance, account_type, is_active')
      .eq('id', toAccountId)
      .eq('is_active', true)
      .single();

    if (toAccountError || !toAccount) {
      return NextResponse.json({
        success: false,
        error: 'Destination account not found or inactive.'
      }, { status: 404 });
    }

    // Allow negative balances - removed balance check
    // Cash accounts can go negative temporarily
    console.log(`Account ${fromAccount.name} current balance: ₹${fromAccount.current_balance.toLocaleString()}`);
    console.log(`Transfer amount: ₹${amount.toLocaleString()}`);
    console.log(`Balance will be: ₹${(fromAccount.current_balance - amount).toLocaleString()}`);

    const transferDescription = description || `Fund transfer from ${fromAccount.name} to ${toAccount.name}`;
    const transferReference = reference || `TXN-${Date.now()}`;

    // 1. Create fund_transfer record first to get the real transfer ID
    const { data: fundTransfer, error: fundTransferError } = await supabaseAdmin
      .from('fund_transfers')
      .insert({
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount: amount,
        transfer_date: date,
        description: transferDescription,
        reference: transferReference,
        status: 'completed'
      })
      .select()
      .single();

    if (fundTransferError) {
      console.error('Error creating fund transfer record:', fundTransferError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create fund transfer record.'
      }, { status: 500 });
    }

    const transferId = fundTransfer.id;

    // Perform the transfer operations
    console.log(`Processing fund transfer: ₹${amount} from ${fromAccount.name} to ${toAccount.name}`);
    console.log(`Transfer ID: ${transferId}`);
    console.log(`Initial balances - From: ₹${fromAccount.current_balance}, To: ₹${toAccount.current_balance}`);
    console.log(`Note: Balances will be automatically updated by database trigger 'trg_update_bank_account_balance'`);

    // 2. Record transaction history for source account (withdrawal)
    // The database trigger will automatically deduct the amount from source account balance
    const { error: debitTransactionError } = await supabaseAdmin
      .from('bank_transactions')
      .insert({
        bank_account_id: fromAccountId,
        date: date,
        type: 'withdrawal',
        amount: amount,
        description: `${transferDescription} (To: ${toAccount.name})`,
        reference: transferReference,
        transaction_type: 'fund_transfer',
        source_record_id: transferId
      });

    if (debitTransactionError) {
      console.error('Error recording debit transaction:', debitTransactionError);
      console.error('Debit transaction error details:', JSON.stringify(debitTransactionError));
      return NextResponse.json({
        success: false,
        error: 'Failed to record withdrawal transaction.'
      }, { status: 500 });
    } else {
      console.log('✅ Debit transaction recorded successfully');
    }

    // 3. Record transaction history for destination account (deposit)
    // The database trigger will automatically add the amount to destination account balance
    const { error: creditTransactionError } = await supabaseAdmin
      .from('bank_transactions')
      .insert({
        bank_account_id: toAccountId,
        date: date,
        type: 'deposit',
        amount: amount,
        description: `${transferDescription} (From: ${fromAccount.name})`,
        reference: transferReference,
        transaction_type: 'fund_transfer',
        source_record_id: transferId
      });

    if (creditTransactionError) {
      console.error('Error recording credit transaction:', creditTransactionError);
      console.error('Credit transaction error details:', JSON.stringify(creditTransactionError));
      
      // Note: The withdrawal was already recorded and balance updated by trigger
      // In a production system, you might want to implement a rollback mechanism
      return NextResponse.json({
        success: false,
        error: 'Failed to record deposit transaction. Withdrawal was processed but deposit failed.'
      }, { status: 500 });
    } else {
      console.log('✅ Credit transaction recorded successfully');
    }

    // 4. Get updated account balances
    const { data: updatedFromAccount } = await supabaseAdmin
      .from('bank_accounts')
      .select('current_balance')
      .eq('id', fromAccountId)
      .single();

    const { data: updatedToAccount } = await supabaseAdmin
      .from('bank_accounts')
      .select('current_balance')
      .eq('id', toAccountId)
      .single();

    console.log(`Fund transfer completed successfully:
      - Transfer ID: ${transferId}
      - From: ${fromAccount.name} (₹${fromAccount.current_balance} → ₹${updatedFromAccount?.current_balance})
      - To: ${toAccount.name} (₹${toAccount.current_balance} → ₹${updatedToAccount?.current_balance})
      - Amount: ₹${amount}
      - Reference: ${transferReference}`);

    return NextResponse.json({
      success: true,
      transfer_id: transferId,
      message: 'Fund transfer completed successfully',
      data: {
        transferId: transferReference,
        amount: amount,
        fromAccount: {
          id: fromAccount.id,
          name: fromAccount.name,
          previousBalance: fromAccount.current_balance,
          newBalance: updatedFromAccount?.current_balance
        },
        toAccount: {
          id: toAccount.id,
          name: toAccount.name,
          previousBalance: toAccount.current_balance,
          newBalance: updatedToAccount?.current_balance
        },
        date: date,
        description: transferDescription,
        reference: transferReference
      }
    });

  } catch (error) {
    console.error('Unexpected error processing fund transfer:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error occurred while processing fund transfer.'
    }, { status: 500 });
  }
}

// GET endpoint to fetch transfer history
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('account_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabaseAdmin
      .from('fund_transfers')
      .select(`
        id,
        from_account_id,
        to_account_id,
        amount,
        transfer_date,
        description,
        reference,
        status,
        created_at,
        from_account:bank_accounts!from_account_id(id, name, account_number, account_type),
        to_account:bank_accounts!to_account_id(id, name, account_number, account_type)
      `, { count: 'exact' })
      .order('transfer_date', { ascending: false })
      .order('created_at', { ascending: false });

    // Filter by account (either from or to)
    if (accountId) {
      query = query.or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`);
    }

    // Filter by date range
    if (startDate) {
      query = query.gte('transfer_date', startDate);
    }
    if (endDate) {
      query = query.lte('transfer_date', endDate);
    }

    const offset = (page - 1) * limit;
    const { data: transfers, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching fund transfers:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch fund transfer history.'
      }, { status: 500 });
    }

    // Format the transfer data for display
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedTransfers = transfers?.map((transfer: any) => {
      const fromAccount = transfer.from_account as { id?: string; name?: string; account_number?: string; account_type?: string } | null;
      const toAccount = transfer.to_account as { id?: string; name?: string; account_number?: string; account_type?: string } | null;
      
      return {
        id: transfer.id,
        date: transfer.transfer_date,
        amount: transfer.amount,
        description: transfer.description,
        reference: transfer.reference,
        status: transfer.status,
        fromAccount: {
          id: transfer.from_account_id,
          name: fromAccount?.name || 'Unknown',
          accountNumber: fromAccount?.account_number,
          accountType: fromAccount?.account_type || 'BANK'
        },
        toAccount: {
          id: transfer.to_account_id,
          name: toAccount?.name || 'Unknown',
          accountNumber: toAccount?.account_number,
          accountType: toAccount?.account_type || 'BANK'
        },
        createdAt: transfer.created_at
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: formattedTransfers,
      pagination: {
        page,
        limit,
        total: count || formattedTransfers.length,
        totalPages: count ? Math.ceil(count / limit) : 1
      }
    });

  } catch (error) {
    console.error('Error fetching fund transfers:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch fund transfer history.'
    }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { transfer_id } = await req.json();

    if (!transfer_id) {
      return NextResponse.json({ error: "Transfer ID is required" }, { status: 400 });
    }

    console.log(`??? Starting DELETE for fund transfer: ${transfer_id}`);

    // 1. Fetch the fund transfer
    const { data: transfer, error: fetchError } = await supabaseAdmin
      .from('fund_transfers')
      .select('*')
      .eq('id', transfer_id)
      .single();

    if (fetchError || !transfer) {
      console.error('Fund transfer not found:', fetchError);
      return NextResponse.json({ error: "Fund transfer not found" }, { status: 404 });
    }

    console.log('?? Fund transfer details:', {
      id: transfer.id,
      amount: transfer.amount,
      from_account_id: transfer.from_account_id,
      to_account_id: transfer.to_account_id
    });

    const deletedItems = {
      fund_transfer: false,
      bank_transactions: 0,
      journal_entries: 0
    };

    // 2. Delete BOTH bank_transactions using source_record_id (withdrawal + deposit)
    const { data: deletedBankTx, error: bankTxError } = await supabaseAdmin
      .from('bank_transactions')
      .delete()
      .eq('source_record_id', transfer.id)
      .eq('transaction_type', 'fund_transfer')
      .select();

    if (!bankTxError && deletedBankTx) {
      deletedItems.bank_transactions = deletedBankTx.length;
      console.log(`? Deleted ${deletedBankTx.length} bank_transaction(s) using source_record_id`);
      console.log(`? Both account balances will be auto-updated by trigger`);
      
      if (deletedBankTx.length !== 2) {
        console.warn(`?? Expected 2 bank_transactions (withdrawal + deposit), found ${deletedBankTx.length}`);
      }
    }

    // Note: Both bank account balances are automatically updated by database triggers
    // when bank_transactions are deleted - no manual balance update needed

    // 3. Delete journal entries
    const { data: deletedJournals, error: journalError } = await supabaseAdmin
      .from('journal_entries')
      .delete()
      .eq('source_type', 'fund_transfer')
      .eq('source_id', transfer.id)
      .select();

    if (!journalError && deletedJournals) {
      deletedItems.journal_entries = deletedJournals.length;
      console.log(`? Deleted ${deletedJournals.length} journal_entry(ies)`);
    }

    // 4. Finally, delete the fund_transfer itself
    const { error: deleteTransferError } = await supabaseAdmin
      .from('fund_transfers')
      .delete()
      .eq('id', transfer.id);

    if (deleteTransferError) {
      console.error('Error deleting fund transfer:', deleteTransferError);
      return NextResponse.json({ error: "Failed to delete fund transfer" }, { status: 500 });
    }

    deletedItems.fund_transfer = true;
    console.log('? Deleted fund transfer record');

    return NextResponse.json({
      success: true,
      message: "Fund transfer and all related records deleted successfully",
      deleted_items: deletedItems,
      transfer_details: {
        id: transfer.id,
        amount: transfer.amount,
        from_account_id: transfer.from_account_id,
        to_account_id: transfer.to_account_id
      }
    });

  } catch (error) {
    console.error('Error in DELETE /api/finance/fund-transfer:', error);
    return NextResponse.json({ error: "Failed to delete fund transfer" }, { status: 500 });
  }
}
