import { NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabasePool';

export async function DELETE(req: Request) {
  try {
    const { transfer_id } = await req.json();

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

    // 2. Delete BOTH bank_transactions using source_record_id (withdrawal + deposit)
    const { data: deletedBankTx, error: bankTxError } = await supabaseAdmin
      .from('bank_transactions')
      .delete()
      .eq('source_record_id', transfer.id)
      .eq('transaction_type', 'fund_transfer')
      .select();

    if (!bankTxError && deletedBankTx) {
      deletedItems.bank_transactions = deletedBankTx.length;
      console.log(`✅ Deleted ${deletedBankTx.length} bank_transaction(s) using source_record_id`);
      console.log(`✅ Both account balances will be auto-updated by trigger`);
      
      if (deletedBankTx.length !== 2) {
        console.warn(`⚠️ Expected 2 bank_transactions (withdrawal + deposit), found ${deletedBankTx.length}`);
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
      console.log(`✅ Deleted ${deletedJournals.length} journal_entry(ies)`);
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
    console.error('Error in DELETE /api/finance/fund-transfer:', error);
    return NextResponse.json({ error: "Failed to delete fund transfer" }, { status: 500 });
  }
}
