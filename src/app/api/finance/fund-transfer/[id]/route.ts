import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const transfer_id = params.id;

    if (!transfer_id) {
      return NextResponse.json({ error: "Transfer ID is required" }, { status: 400 });
    }

    console.log(`🗑️ Starting DELETE for fund transfer: ${transfer_id}`);

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

    console.log('📋 Fund transfer details:', {
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

    // 2. Delete ALL bank_transactions for this transfer using source_record_id
    // This will delete BOTH the withdrawal and deposit transactions
    const { data: deletedBankTx, error: bankTxError } = await supabaseAdmin
      .from('bank_transactions')
      .delete()
      .eq('source_record_id', transfer.id)
      .eq('transaction_type', 'fund_transfer')
      .select();

    if (!bankTxError && deletedBankTx) {
      deletedItems.bank_transactions = deletedBankTx.length;
      console.log(`✅ Deleted ${deletedBankTx.length} bank_transaction(s) using source_record_id (withdrawal + deposit)`);
    }

    // 3. Restore FROM account balance (add back the transferred amount)
    if (transfer.from_account_id) {
      const { data: fromAccount } = await supabaseAdmin
        .from('bank_accounts')
        .select('current_balance, account_name')
        .eq('id', transfer.from_account_id)
        .single();

      if (fromAccount) {
        const newBalance = (fromAccount.current_balance || 0) + transfer.amount;
        await supabaseAdmin
          .from('bank_accounts')
          .update({ current_balance: newBalance })
          .eq('id', transfer.from_account_id);

        console.log(`✅ Restored FROM account (${fromAccount.account_name}): added back ${transfer.amount}`);
      }
    }

    // 4. Restore TO account balance (subtract the transferred amount)
    if (transfer.to_account_id) {
      const { data: toAccount } = await supabaseAdmin
        .from('bank_accounts')
        .select('current_balance, account_name')
        .eq('id', transfer.to_account_id)
        .single();

      if (toAccount) {
        const newBalance = (toAccount.current_balance || 0) - transfer.amount;
        await supabaseAdmin
          .from('bank_accounts')
          .update({ current_balance: newBalance })
          .eq('id', transfer.to_account_id);

        console.log(`✅ Restored TO account (${toAccount.account_name}): subtracted ${transfer.amount}`);
      }
    }

    // 5. Delete journal entries
    const { data: deletedJournals, error: journalError } = await supabaseAdmin
      .from('journal_entries')
      .delete()
      .eq('source_type', 'fund_transfer')
      .eq('source_id', transfer.id)
      .select();

    if (!journalError && deletedJournals) {
      deletedItems.journal_entries = deletedJournals.length;
      console.log(`✅ Deleted ${deletedJournals.length} journal_entry(ies)`);
    }

    // 6. Finally, delete the fund transfer itself
    const { error: deleteTransferError } = await supabaseAdmin
      .from('fund_transfers')
      .delete()
      .eq('id', transfer.id);

    if (deleteTransferError) {
      console.error('Error deleting fund transfer:', deleteTransferError);
      return NextResponse.json({ error: "Failed to delete fund transfer" }, { status: 500 });
    }

    deletedItems.fund_transfer = true;
    console.log('✅ Deleted fund transfer record');

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
    console.error('Error in DELETE /api/finance/fund-transfer/[id]:', error);
    return NextResponse.json({ error: "Failed to delete fund transfer" }, { status: 500 });
  }
}
