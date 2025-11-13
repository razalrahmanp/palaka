import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const withdrawal_id = params.id;

    if (!withdrawal_id) {
      return NextResponse.json({ error: "Withdrawal ID is required" }, { status: 400 });
    }

    console.log(`🗑️ Starting DELETE for withdrawal: ${withdrawal_id}`);

    // 1. Fetch the withdrawal
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawal_id)
      .single();

    if (fetchError || !withdrawal) {
      console.error('Withdrawal not found:', fetchError);
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    console.log('📋 Withdrawal details:', {
      id: withdrawal.id,
      amount: withdrawal.amount,
      partner_id: withdrawal.partner_id,
      bank_account_id: withdrawal.bank_account_id
    });

    const deletedItems = {
      withdrawal: false,
      bank_transactions: 0,
      journal_entries: 0
    };

    // 2. Delete bank_transactions using source_record_id
    const { data: deletedBankTx, error: bankTxError } = await supabase
      .from('bank_transactions')
      .delete()
      .eq('source_record_id', withdrawal.id)
      .eq('transaction_type', 'withdrawal')
      .select();

    if (!bankTxError && deletedBankTx) {
      deletedItems.bank_transactions = deletedBankTx.length;
      console.log(`✅ Deleted ${deletedBankTx.length} bank_transaction(s) using source_record_id`);
      console.log(`✅ Bank balance will be auto-updated by trigger`);
    }

    // Note: Bank account balance is automatically updated by database trigger
    // when bank_transactions are deleted - no manual balance update needed

    // 4. Delete journal entries
    const { data: deletedJournals, error: journalError } = await supabase
      .from('journal_entries')
      .delete()
      .eq('source_type', 'withdrawal')
      .eq('source_id', withdrawal.id)
      .select();

    if (!journalError && deletedJournals) {
      deletedItems.journal_entries = deletedJournals.length;
      console.log(`✅ Deleted ${deletedJournals.length} journal_entry(ies)`);
    }

    // 5. Update partner equity account balance (add back)
    if (withdrawal.partner_id) {
      const { data: partner } = await supabase
        .from('partners')
        .select('*')
        .eq('id', withdrawal.partner_id)
        .single();

      if (partner) {
        const partnerAccountCode = `3015-${withdrawal.partner_id.toString()}`;
        const { data: partnerAccount } = await supabase
          .from('chart_of_accounts')
          .select('id, current_balance')
          .eq('account_code', partnerAccountCode)
          .single();

        if (partnerAccount) {
          const currentBalance = parseFloat(partnerAccount.current_balance) || 0;
          const newBalance = currentBalance + withdrawal.amount;
          
          await supabase
            .from('chart_of_accounts')
            .update({
              current_balance: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq('id', partnerAccount.id);

          console.log(`✅ Increased partner equity account balance by ${withdrawal.amount}`);
        }

        // Update partner's total investment (add back)
        const currentTotal = parseFloat(partner.initial_investment) || 0;
        const newTotal = currentTotal + withdrawal.amount;
        
        await supabase
          .from('partners')
          .update({
            initial_investment: newTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', withdrawal.partner_id);

        console.log(`✅ Updated partner total investment: ${currentTotal} → ${newTotal}`);
      }
    }

    // 6. Finally, delete the withdrawal itself
    const { error: deleteWithdrawalError } = await supabase
      .from('withdrawals')
      .delete()
      .eq('id', withdrawal.id);

    if (deleteWithdrawalError) {
      console.error('Error deleting withdrawal:', deleteWithdrawalError);
      return NextResponse.json({ error: "Failed to delete withdrawal" }, { status: 500 });
    }

    deletedItems.withdrawal = true;
    console.log('✅ Deleted withdrawal record');

    return NextResponse.json({
      success: true,
      message: "Withdrawal and all related records deleted successfully",
      deleted_items: deletedItems,
      withdrawal_details: {
        id: withdrawal.id,
        amount: withdrawal.amount,
        partner_id: withdrawal.partner_id
      }
    });

  } catch (error) {
    console.error('Error in DELETE /api/equity/withdrawals/[id]:', error);
    return NextResponse.json({ error: "Failed to delete withdrawal" }, { status: 500 });
  }
}
