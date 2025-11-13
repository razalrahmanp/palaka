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
    const investment_id = params.id;

    if (!investment_id) {
      return NextResponse.json({ error: "Investment ID is required" }, { status: 400 });
    }

    console.log(`🗑️ Starting DELETE for investment: ${investment_id}`);

    // 1. Fetch the investment
    const { data: investment, error: fetchError } = await supabase
      .from('investments')
      .select('*')
      .eq('id', investment_id)
      .single();

    if (fetchError || !investment) {
      console.error('Investment not found:', fetchError);
      return NextResponse.json({ error: "Investment not found" }, { status: 404 });
    }

    console.log('📋 Investment details:', {
      id: investment.id,
      amount: investment.amount,
      partner_id: investment.partner_id,
      bank_account_id: investment.bank_account_id
    });

    const deletedItems = {
      investment: false,
      bank_transactions: 0,
      journal_entries: 0
    };

    // 2. Delete bank_transactions using source_record_id
    const { data: deletedBankTx, error: bankTxError } = await supabase
      .from('bank_transactions')
      .delete()
      .eq('source_record_id', investment.id)
      .eq('transaction_type', 'investment')
      .select();

    if (!bankTxError && deletedBankTx) {
      deletedItems.bank_transactions = deletedBankTx.length;
      console.log(`✅ Deleted ${deletedBankTx.length} bank_transaction(s) using source_record_id`);
    }

    // 3. Restore bank account balance
    if (investment.bank_account_id) {
      const { data: bankAccount } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('id', investment.bank_account_id)
        .single();

      if (bankAccount) {
        const newBalance = (bankAccount.current_balance || 0) - investment.amount;
        await supabase
          .from('bank_accounts')
          .update({ current_balance: newBalance })
          .eq('id', investment.bank_account_id);

        console.log(`✅ Restored bank balance: reduced by ${investment.amount}`);
      }
    }

    // 4. Delete journal entries
    const { data: deletedJournals, error: journalError } = await supabase
      .from('journal_entries')
      .delete()
      .eq('source_type', 'investment')
      .eq('source_id', investment.id)
      .select();

    if (!journalError && deletedJournals) {
      deletedItems.journal_entries = deletedJournals.length;
      console.log(`✅ Deleted ${deletedJournals.length} journal_entry(ies)`);
    }

    // 5. Update partner equity account balance (reduce)
    if (investment.partner_id) {
      const { data: partner } = await supabase
        .from('partners')
        .select('*')
        .eq('id', investment.partner_id)
        .single();

      if (partner) {
        const partnerAccountCode = `3015-${investment.partner_id.toString()}`;
        const { data: partnerAccount } = await supabase
          .from('chart_of_accounts')
          .select('id, current_balance')
          .eq('account_code', partnerAccountCode)
          .single();

        if (partnerAccount) {
          const currentBalance = parseFloat(partnerAccount.current_balance) || 0;
          const newBalance = currentBalance - investment.amount;
          
          await supabase
            .from('chart_of_accounts')
            .update({
              current_balance: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq('id', partnerAccount.id);

          console.log(`✅ Reduced partner equity account balance by ${investment.amount}`);
        }

        // Update partner's total investment
        const currentTotal = parseFloat(partner.initial_investment) || 0;
        const newTotal = Math.max(0, currentTotal - investment.amount);
        
        await supabase
          .from('partners')
          .update({
            initial_investment: newTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', investment.partner_id);

        console.log(`✅ Updated partner total investment: ${currentTotal} → ${newTotal}`);
      }
    }

    // 6. Finally, delete the investment itself
    const { error: deleteInvestmentError } = await supabase
      .from('investments')
      .delete()
      .eq('id', investment.id);

    if (deleteInvestmentError) {
      console.error('Error deleting investment:', deleteInvestmentError);
      return NextResponse.json({ error: "Failed to delete investment" }, { status: 500 });
    }

    deletedItems.investment = true;
    console.log('✅ Deleted investment record');

    return NextResponse.json({
      success: true,
      message: "Investment and all related records deleted successfully",
      deleted_items: deletedItems,
      investment_details: {
        id: investment.id,
        amount: investment.amount,
        partner_id: investment.partner_id
      }
    });

  } catch (error) {
    console.error('Error in DELETE /api/equity/investments/[id]:', error);
    return NextResponse.json({ error: "Failed to delete investment" }, { status: 500 });
  }
}
