import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { createPaymentJournalEntry } from "@/lib/journalHelper";

export async function GET() {
  try {
    console.log('💰 Fetching ALL payments for finance management...');

    // Fetch ALL payments with comprehensive data - no pagination since frontend handles it
    const { data: payments, error } = await supabase
      .from("payments")
      .select(`
        id,
        invoice_id,
        amount,
        payment_date,
        date,
        method,
        reference,
        description,
        invoices!invoice_id(
          id,
          sales_order_id,
          customer_name,
          total,
          customers!customer_id(name, phone, email)
        )
      `)
      .order("date", { ascending: false });

    if (error) {
      console.error('❌ Error fetching payments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`💸 Found ${payments?.length || 0} payments`);

    // Also fetch bank transactions to link with payments
    const { data: bankTransactions, error: bankError } = await supabase
      .from("bank_transactions")
      .select(`
        id,
        bank_account_id,
        amount,
        date,
        reference,
        description,
        bank_accounts!bank_account_id(
          id,
          name,
          account_type,
          account_number
        )
      `)
      .eq('type', 'deposit')
      .order("date", { ascending: false });

    if (bankError) {
      console.error('❌ Error fetching bank transactions:', bankError);
    }

    // Enhance payments with customer and invoice data, and link with bank transactions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enhancedPayments = payments?.map((payment: any) => {
      const invoice = payment.invoices;
      const customer = invoice?.customers;
      
      // Try to find matching bank transaction based on amount, date, and method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matchingBankTransaction = bankTransactions?.find((transaction: any) => {
        const amountMatch = Math.abs(Number(transaction.amount) - Number(payment.amount)) < 0.01;
        const dateMatch = transaction.date === payment.date;
        const methodMatch = (
          (payment.method === 'BANK TRANSFER' && Array.isArray(transaction.bank_accounts) ? transaction.bank_accounts[0]?.account_type === 'BANK' : transaction.bank_accounts?.account_type === 'BANK') ||
          (payment.method === 'UPI' && Array.isArray(transaction.bank_accounts) ? transaction.bank_accounts[0]?.account_type === 'UPI' : transaction.bank_accounts?.account_type === 'UPI')
        );
        return amountMatch && dateMatch && methodMatch;
      });
      
      const bankAccount = Array.isArray(matchingBankTransaction?.bank_accounts) 
        ? matchingBankTransaction?.bank_accounts[0] 
        : matchingBankTransaction?.bank_accounts;
      
      return {
        id: payment.id,
        invoice_id: payment.invoice_id,
        amount: Number(payment.amount) || 0,
        payment_date: payment.payment_date,
        date: payment.date,
        method: payment.method || 'Unknown',
        reference: payment.reference || '',
        description: payment.description || '',
        // Bank account information from linked transaction
        bank_account_id: matchingBankTransaction?.bank_account_id || null,
        bank_account_name: bankAccount?.name || '',
        bank_account_type: bankAccount?.account_type || '',
        bank_account_number: bankAccount?.account_number || '',
        // Invoice information
        invoice_total: Number(invoice?.total) || 0,
        sales_order_id: invoice?.sales_order_id || '',
        // Customer information
        customer_name: customer?.name || invoice?.customer_name || 'Unknown Customer',
        customer_phone: customer?.phone || '',
        customer_email: customer?.email || ''
      };
    }) || [];

    console.log(`✅ Enhanced ${enhancedPayments.length} payments with invoice/customer data`);

    return NextResponse.json(enhancedPayments);
  } catch (error) {
    console.error('💥 Payments API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      invoice_id,
      purchase_order_id,
      amount,
      payment_date,
      date,
      method = "cash",
      reference,
      description,
      bank_account_id,
      upi_account_id,
      cash_account_id,
      created_by
    } = body;

    console.log('💰 Creating payment with accounting...', { 
      invoice_id, 
      purchase_order_id, 
      amount, 
      payment_date: payment_date || date,
      method,
      bank_account_id,
      upi_account_id,
      cash_account_id
    });

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount is required and must be greater than 0" },
        { status: 400 }
      );
    }

    const finalPaymentDate = payment_date || date;
    if (!finalPaymentDate) {
      return NextResponse.json(
        { success: false, error: "Payment date is required" },
        { status: 400 }
      );
    }

    // Must have either invoice_id or purchase_order_id
    if (!invoice_id && !purchase_order_id) {
      return NextResponse.json(
        { success: false, error: "Either invoice_id or purchase_order_id is required" },
        { status: 400 }
      );
    }

    // Determine the correct bank account ID for journal entry
    // For UPI payments, use upi_account_id; for cash payments, use cash_account_id; for bank transfers, use bank_account_id
    const journalBankAccountId = method === 'upi' ? upi_account_id : method === 'cash' ? cash_account_id : bank_account_id;

    // Use stored procedure for atomic transaction with accounting
    const { data: paymentId, error } = await supabase.rpc('create_payment_with_accounting', {
      p_invoice_id: invoice_id || null,
      p_purchase_order_id: purchase_order_id || null,
      p_amount: parseFloat(amount),
      p_payment_date: new Date(finalPaymentDate).toISOString(),
      p_method: method || 'cash',
      p_reference: reference || null,
      p_description: description || null,
      p_bank_account_id: bank_account_id || null,
      p_created_by: created_by || null
    });

    if (error) {
      console.log('📋 Stored procedure not available, using manual payment creation...');
      // Fallback to manual method if stored procedure fails
      return await createPaymentManually(body);
    }

    // **NEW: Create journal entry for successful payment (when stored procedure succeeds)**
    if (paymentId) {
      console.log('💰 Payment created via stored procedure, creating journal entry...');
      
      const journalResult = await createPaymentJournalEntry({
        paymentId: paymentId,
        amount: parseFloat(amount),
        date: new Date(finalPaymentDate).toISOString().split('T')[0],
        reference: reference,
        description: description || `Payment via ${method}`,
        paymentMethod: method,
        bankAccountId: journalBankAccountId
      });
      
      if (journalResult.success) {
        console.log('✅ Journal entry created:', journalResult.journalEntryId);
        console.log(`📊 Dr. ${journalResult.paymentAccount} ${amount}, Cr. ${journalResult.arAccount} ${amount}`);
      } else {
        console.error('❌ Failed to create journal entry:', journalResult.error);
        // Don't fail the payment, just log the error
      }
    }

    console.log('✅ Payment created with accounting entries:', paymentId);

    return NextResponse.json({
      success: true,
      data: { id: paymentId },
      accounting_integration: true,
      message: "Payment created successfully with automatic journal entries"
    });
  } catch (error) {
    console.error('❌ Payment creation error:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Fallback method for when stored procedure is not available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createPaymentManually(body: any) {
  const { invoice_id, amount, payment_date, date, method, reference, description, bank_account_id, upi_account_id, cash_account_id } = body;
  
  if (!invoice_id || !amount || !(payment_date || date) || !method) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    // 1. Create payment record
    const { data: payment, error: insertError } = await supabase
      .from("payments")
      .insert([{ 
        invoice_id, 
        amount: parseFloat(amount), 
        date: payment_date || date,
        payment_date: new Date(payment_date || date).toISOString(),
        method,
        reference: reference || null,
        description: description || null
      }])
      .select()
      .single();

    if (insertError || !payment) {
      return NextResponse.json({ error: insertError?.message || "Failed to create payment" }, { status: 500 });
    }

    // 2. Create journal entry for the payment
    console.log('💰 Payment created manually, creating journal entry...');
    
    // Determine the correct bank account ID for journal entry
    const journalBankAccountId = method === 'upi' ? upi_account_id : method === 'cash' ? cash_account_id : bank_account_id;
    
    const journalResult = await createPaymentJournalEntry({
      paymentId: payment.id,
      amount: parseFloat(amount),
      date: payment_date || date,
      reference: reference,
      description: description || `Invoice payment via ${method}`,
      paymentMethod: method,
      bankAccountId: journalBankAccountId
    });
    
    if (journalResult.success) {
      console.log('✅ Journal entry created:', journalResult.journalEntryId);
      console.log(`📊 Dr. ${journalResult.paymentAccount} ${amount}, Cr. ${journalResult.arAccount} ${amount}`);
    } else {
      console.error('❌ Failed to create journal entry:', journalResult.error);
      // Don't fail the payment, just log the error
    }

    // 3. Recalculate total paid amount for that invoice
    const { data: payments, error: fetchError } = await supabase
      .from("payments")
      .select("amount")
      .eq("invoice_id", invoice_id);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount, 0);

    const { error: updateError } = await supabase
      .from("invoices")
      .update({ paid_amount: totalPaid })
      .eq("id", invoice_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`✅ Manual payment created for invoice ${invoice_id} with journal entry`);

    return NextResponse.json({ 
      success: true,
      data: { id: payment.id },
      accounting_integration: true,
      journal_entry: journalResult.success ? journalResult.journalEntryId : null,
      message: journalResult.success 
        ? "Payment recorded with automatic journal entries" 
        : "Payment recorded (journal entry failed - check logs)"
    });
  } catch (error) {
    console.error('Error creating payment manually:', error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { id, invoice_id, amount, date, method } = body;

  if (!id || !invoice_id) {
    return NextResponse.json({ error: "Missing payment ID or invoice ID" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("payments")
    .update({ amount, date, method })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: payments, error: fetchError } = await supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoice_id);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount, 0);

  const { error: invoiceUpdateError } = await supabase
    .from("invoices")
    .update({ paid_amount: totalPaid })
    .eq("id", invoice_id);

  if (invoiceUpdateError) {
    return NextResponse.json({ error: invoiceUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}


export async function DELETE(req: Request) {
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Missing payment ID" }, { status: 400 });
  }

  // First, get the invoice_id of the payment to be deleted
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("invoice_id")
    .eq("id", id)
    .single();

  if (fetchError || !payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const invoiceId = payment.invoice_id;

  const { error: deleteError } = await supabase
    .from("payments")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Recalculate the new paid amount
  const { data: payments, error: recalcError } = await supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId);

  if (recalcError) {
    return NextResponse.json({ error: recalcError.message }, { status: 500 });
  }

  const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount, 0);

  const { error: invoiceUpdateError } = await supabase
    .from("invoices")
    .update({ paid_amount: totalPaid })
    .eq("id", invoiceId);

  if (invoiceUpdateError) {
    return NextResponse.json({ error: invoiceUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

