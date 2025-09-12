// src/app/api/finance/vendor-bills/[id]/payments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface VendorPayment {
  vendor_bill_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'upi';
  bank_account_id?: string;
  reference_number?: string;
  notes?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendorBillId = params.id;
    const paymentData: VendorPayment = await request.json();

    console.log(`💰 Processing payment for vendor bill: ${vendorBillId}`);

    // Get vendor bill details
    const { data: vendorBill, error: billError } = await supabase
      .from('vendor_bills')
      .select(`
        id,
        bill_number,
        supplier_id,
        total_amount,
        paid_amount,
        status,
        suppliers (
          id,
          name,
          company_name
        )
      `)
      .eq('id', vendorBillId)
      .single();

    if (billError || !vendorBill) {
      return NextResponse.json({ error: 'Vendor bill not found' }, { status: 404 });
    }

    // Validate payment amount
    const remainingAmount = vendorBill.total_amount - (vendorBill.paid_amount || 0);
    if (paymentData.amount > remainingAmount) {
      return NextResponse.json({ 
        error: `Payment amount (₹${paymentData.amount}) exceeds remaining balance (₹${remainingAmount})` 
      }, { status: 400 });
    }

    // Get system user for created_by
    const { data: systemUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('vendor_payment_history')
      .insert({
        supplier_id: vendorBill.supplier_id,
        vendor_bill_id: vendorBillId,
        amount: paymentData.amount,
        payment_date: paymentData.payment_date,
        payment_method: paymentData.payment_method,
        bank_account_id: paymentData.bank_account_id,
        reference_number: paymentData.reference_number,
        description: `Payment for vendor bill ${vendorBill.bill_number}`,
        notes: paymentData.notes,
        created_by: systemUser?.id
      })
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Error creating payment record:', paymentError);
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    // Update vendor bill paid amount and status
    const newPaidAmount = (vendorBill.paid_amount || 0) + paymentData.amount;
    const newStatus = newPaidAmount >= vendorBill.total_amount ? 'paid' : 'partially_paid';

    const { error: updateError } = await supabase
      .from('vendor_bills')
      .update({
        paid_amount: newPaidAmount,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', vendorBillId);

    if (updateError) {
      console.error('❌ Error updating vendor bill:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Create payment journal entry
    try {
      await createVendorPaymentJournalEntry({
        payment,
        vendorBill,
        paymentData
      });
    } catch (journalError) {
      console.warn('⚠️ Journal entry creation failed:', journalError);
      // Don't fail the payment if journal entry fails
    }

    // Update bank account balance if bank payment
    if (paymentData.bank_account_id && ['bank_transfer', 'cheque', 'upi'].includes(paymentData.payment_method)) {
      try {
        await supabase.rpc('increment_bank_balance', {
          bank_account_id: paymentData.bank_account_id,
          amount: -paymentData.amount // Decrease bank balance
        });
        console.log(`💳 Updated bank account balance: -₹${paymentData.amount}`);
      } catch (bankError) {
        console.warn('⚠️ Bank balance update failed:', bankError);
      }
    }

    console.log(`✅ Vendor bill payment processed: ₹${paymentData.amount}`);

    return NextResponse.json({
      success: true,
      data: {
        payment,
        vendorBill: {
          ...vendorBill,
          paid_amount: newPaidAmount,
          status: newStatus
        }
      },
      message: 'Payment processed successfully'
    });

  } catch (error) {
    console.error('❌ Error processing vendor bill payment:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Helper function to create journal entry for vendor payment
async function createVendorPaymentJournalEntry({
  payment,
  vendorBill,
  paymentData
}: {
  payment: any;
  vendorBill: any;
  paymentData: VendorPayment;
}) {
  try {
    const journalNumber = `JE-VP-${payment.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

    // Create journal entry
    const { data: journalEntry, error: journalError } = await supabase
      .from('journal_entries')
      .insert({
        journal_number: journalNumber,
        date: paymentData.payment_date,
        description: `Vendor Payment - ${vendorBill.bill_number} - ${vendorBill.suppliers?.name || 'Vendor'}`,
        reference_number: paymentData.reference_number || payment.id,
        source_document_type: 'VENDOR_PAYMENT',
        source_document_id: payment.id,
        total_amount: paymentData.amount,
        created_by: payment.created_by
      })
      .select()
      .single();

    if (journalError) throw journalError;

    // Get chart of accounts
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name')
      .in('account_code', ['2100', '1010', '1020']); // Accounts Payable, Cash, Bank

    const accountsPayable = accounts?.find(acc => acc.account_code === '2100');
    let paymentAccount;

    if (paymentData.payment_method === 'cash') {
      paymentAccount = accounts?.find(acc => acc.account_code === '1010'); // Cash
    } else {
      paymentAccount = accounts?.find(acc => acc.account_code === '1020'); // Bank
    }

    if (!accountsPayable || !paymentAccount) {
      throw new Error('Required accounts not found');
    }

    // Create journal entry lines
    const journalLines = [
      {
        journal_entry_id: journalEntry.id,
        account_id: accountsPayable.id,
        debit_amount: paymentData.amount,
        credit_amount: 0,
        description: `Accounts Payable - ${vendorBill.suppliers?.name || 'Vendor'}`
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: paymentAccount.id,
        debit_amount: 0,
        credit_amount: paymentData.amount,
        description: `${paymentData.payment_method === 'cash' ? 'Cash' : 'Bank'} Payment - ${vendorBill.bill_number}`
      }
    ];

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(journalLines);

    if (linesError) throw linesError;

    // Update chart of accounts balances
    await Promise.all([
      // Decrease Accounts Payable (Debit)
      supabase.rpc('increment_account_balance', {
        account_id: accountsPayable.id,
        amount: -paymentData.amount
      }),
      // Decrease Cash/Bank (Credit)
      supabase.rpc('increment_account_balance', {
        account_id: paymentAccount.id,
        amount: -paymentData.amount
      })
    ]);

    console.log('✅ Created vendor payment journal entry:', journalEntry.journal_number);

  } catch (error) {
    console.error('❌ Error creating vendor payment journal entry:', error);
    throw error;
  }
}
