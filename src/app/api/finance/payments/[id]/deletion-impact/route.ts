import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params;
    console.log('🔍 Analyzing deletion impact for payment:', paymentId);

    // Fetch the payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        id,
        invoice_id,
        amount,
        payment_date,
        date,
        method,
        reference,
        description,
        bank_account_id,
        created_at,
        invoices!invoice_id(
          id,
          customer_name,
          total,
          sales_order_id
        )
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Find related journal entries
    const { data: journalEntries, error: journalError } = await supabase
      .from('journal_entries')
      .select(`
        id,
        journal_number,
        description,
        entry_date,
        source_document_type,
        source_document_id,
        status,
        total_debit,
        total_credit
      `)
      .eq('source_document_type', 'PAYMENT')
      .eq('source_document_id', paymentId);

    if (journalError) {
      console.error('Error fetching journal entries:', journalError);
    }

    // Find related bank transactions with bank account details
    const { data: bankTransactions, error: bankError } = await supabase
      .from('bank_transactions')
      .select(`
        id,
        bank_account_id,
        amount,
        date,
        reference,
        description,
        type,
        bank_accounts!inner (
          id,
          name,
          current_balance
        )
      `)
      .ilike('description', `%${payment.id.slice(0, 8)}%`);

    if (bankError) {
      console.error('Error fetching bank transactions:', bankError);
    }

    const deletionConfirmation = {
      payment,
      relatedEntries: {
        journalEntries: journalEntries || [],
        bankTransactions: bankTransactions || []
      }
    };

    console.log('📊 Deletion impact analysis:', {
      paymentId,
      journalEntriesCount: journalEntries?.length || 0,
      bankTransactionsCount: bankTransactions?.length || 0
    });

    return NextResponse.json(deletionConfirmation);

  } catch (error) {
    console.error('❌ Error analyzing payment deletion impact:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze deletion impact' 
    }, { status: 500 });
  }
}
