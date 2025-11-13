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
    const payment_id = params.id;

    if (!payment_id) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
    }

    console.log(`🗑️ Starting DELETE for liability payment: ${payment_id}`);

    // 1. Fetch the liability payment
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('liability_payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (fetchError || !payment) {
      console.error('Liability payment not found:', fetchError);
      return NextResponse.json({ error: "Liability payment not found" }, { status: 404 });
    }

    console.log('📋 Liability payment details:', {
      id: payment.id,
      amount: payment.amount,
      liability_id: payment.liability_id,
      bank_account_id: payment.bank_account_id
    });

    const deletedItems = {
      liability_payment: false,
      bank_transactions: 0,
      journal_entries: 0
    };

    // 2. Delete bank_transactions using source_record_id
    const { data: deletedBankTx, error: bankTxError } = await supabaseAdmin
      .from('bank_transactions')
      .delete()
      .eq('source_record_id', payment.id)
      .eq('transaction_type', 'liability_payment')
      .select();

    if (!bankTxError && deletedBankTx) {
      deletedItems.bank_transactions = deletedBankTx.length;
      console.log(`✅ Deleted ${deletedBankTx.length} bank_transaction(s) using source_record_id`);
    }

    // 3. Restore bank account balance
    if (payment.bank_account_id) {
      const { data: bankAccount } = await supabaseAdmin
        .from('bank_accounts')
        .select('current_balance')
        .eq('id', payment.bank_account_id)
        .single();

      if (bankAccount) {
        const newBalance = (bankAccount.current_balance || 0) + payment.amount;
        await supabaseAdmin
          .from('bank_accounts')
          .update({ current_balance: newBalance })
          .eq('id', payment.bank_account_id);

        console.log(`✅ Restored bank balance: added back ${payment.amount}`);
      }
    }

    // 4. Delete journal entries
    const { data: deletedJournals, error: journalError } = await supabaseAdmin
      .from('journal_entries')
      .delete()
      .eq('source_type', 'liability_payment')
      .eq('source_id', payment.id)
      .select();

    if (!journalError && deletedJournals) {
      deletedItems.journal_entries = deletedJournals.length;
      console.log(`✅ Deleted ${deletedJournals.length} journal_entry(ies)`);
    }

    // 5. Update liability balance (reduce paid amount, increase outstanding)
    if (payment.liability_id) {
      const { data: liability } = await supabaseAdmin
        .from('liabilities')
        .select('*')
        .eq('id', payment.liability_id)
        .single();

      if (liability) {
        const newPaidAmount = Math.max(0, (liability.paid_amount || 0) - payment.amount);
        const newOutstandingAmount = (liability.outstanding_amount || 0) + payment.amount;
        
        await supabaseAdmin
          .from('liabilities')
          .update({
            paid_amount: newPaidAmount,
            outstanding_amount: newOutstandingAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.liability_id);

        console.log(`✅ Updated liability: paid ${liability.paid_amount} → ${newPaidAmount}, outstanding ${liability.outstanding_amount} → ${newOutstandingAmount}`);
      }
    }

    // 6. Finally, delete the liability payment itself
    const { error: deletePaymentError } = await supabaseAdmin
      .from('liability_payments')
      .delete()
      .eq('id', payment.id);

    if (deletePaymentError) {
      console.error('Error deleting liability payment:', deletePaymentError);
      return NextResponse.json({ error: "Failed to delete liability payment" }, { status: 500 });
    }

    deletedItems.liability_payment = true;
    console.log('✅ Deleted liability payment record');

    return NextResponse.json({
      success: true,
      message: "Liability payment and all related records deleted successfully",
      deleted_items: deletedItems,
      payment_details: {
        id: payment.id,
        amount: payment.amount,
        liability_id: payment.liability_id
      }
    });

  } catch (error) {
    console.error('Error in DELETE /api/finance/liability-payments/[id]:', error);
    return NextResponse.json({ error: "Failed to delete liability payment" }, { status: 500 });
  }
}
