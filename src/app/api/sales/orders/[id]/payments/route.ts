// src/app/api/sales/orders/[id]/payments/route.ts
// Updated to handle payment creation with database trigger compatibility
import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import { createPaymentJournalEntry } from "@/lib/journalHelper";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure params is awaited properly
    const { id: orderId } = await params;
    
    // Log the orderId for debugging
    console.log('Fetching payments for orderId:', orderId);
    
    // Get all invoices for this sales order
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('id')
      .eq('sales_order_id', orderId);
      
    if (invoiceError) {
      console.error('Error fetching invoices:', invoiceError);
      return NextResponse.json({
        payments: [],
        summary: { total_paid: 0, payment_count: 0 }
      });
    }
    
    if (!invoices || invoices.length === 0) {
      return NextResponse.json({
        payments: [],
        summary: { total_paid: 0, payment_count: 0 }
      });
    }
    
    const invoiceIds = invoices.map(inv => inv.id);
    
    // Get payments for these invoices using actual database columns only
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        id, 
        invoice_id, 
        amount, 
        payment_date, 
        method,
        reference
      `)
      .in('invoice_id', invoiceIds)
      .order('payment_date', { ascending: false });
      
    if (error) {
      console.error('Supabase error fetching payments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Calculate summary data
    const totalPaid = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    return NextResponse.json({
      payments: payments || [],
      summary: {
        total_paid: totalPaid,
        payment_count: payments?.length || 0
      }
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure params is awaited properly
    const { id: orderId } = await params;
    const body = await request.json();

    console.log('Payment creation request body:', body);
    console.log('Order ID:', orderId);

    const {
      amount,
      method,
      payment_date,
      bank_account_id,
      upi_account_id,
      reference
    } = body;

    // Validate required fields
    if (!amount || !method) {
      console.log('Validation failed: Missing amount or method', { amount, method });
      return NextResponse.json(
        { error: 'Amount and payment method are required' },
        { status: 400 }
      );
    }

    // Validate account selection for applicable payment methods (except cash - which auto-updates)
    if (['bank_transfer', 'cheque', 'upi'].includes(method)) {
      const accountId = method === 'upi' ? upi_account_id : bank_account_id;
      if (!accountId || accountId.trim() === '') {
        console.log('Validation failed: Missing account for method', { method, bank_account_id, upi_account_id });
        return NextResponse.json(
          { error: `Account selection is required for ${method} payments` },
          { status: 400 }
        );
      }
    }

    // Get the sales order details using correct column names
    const { data: orderData, error: orderError } = await supabase
      .from('sales_orders')
      .select('customer_id, final_price')
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      console.error('Sales order not found:', orderError);
      return NextResponse.json(
        { error: 'Sales order not found' },
        { status: 404 }
      );
    }

    // Check if invoice exists for this order, create if not
    let { data: invoice } = await supabase
      .from('invoices')
      .select('id, paid_amount, total')
      .eq('sales_order_id', orderId)
      .single();

    // If no invoice exists, create one automatically
    if (!invoice) {
      // Get customer name for invoice
      const { data: customerData } = await supabase
        .from('customers')
        .select('name')
        .eq('id', orderData.customer_id)
        .single();
      
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          sales_order_id: orderId,
          customer_id: orderData.customer_id,
          customer_name: customerData?.name || 'Unknown Customer',
          total: orderData.final_price || 0,
          paid_amount: parseFloat(amount),
          status: parseFloat(amount) >= (orderData.final_price || 0) ? 'paid' : 'unpaid'
        })
        .select('id, paid_amount, total')
        .single();

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
        return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
      } else {
        invoice = newInvoice;
      }
    } else {
      // Update existing invoice
      const newPaidAmount = (invoice.paid_amount || 0) + parseFloat(amount);
      const invoiceStatus = newPaidAmount >= invoice.total ? 'paid' : 'unpaid';
      
      await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          status: invoiceStatus
        })
        .eq('id', invoice.id);
    }

    // Insert the payment using the actual database structure
    const paymentData: {
      invoice_id: string;
      amount: number;
      method: string;
      date?: string;
      reference?: string;
      description?: string;
      bank_account_id?: string;
    } = {
      invoice_id: invoice.id,
      amount: parseFloat(amount),
      method: method
    };

    // Use the date field (date type) - simpler approach
    paymentData.date = payment_date || new Date().toISOString().split('T')[0];

    // Add reference if provided
    if (reference && reference.trim() !== '') {
      paymentData.reference = reference.trim();
    }

    // Add description if provided
    if (body.description && body.description.trim() !== '') {
      paymentData.description = body.description.trim();
    }

    // Add bank_account_id if applicable
    if (method === 'bank_transfer' || method === 'cheque') {
      if (bank_account_id && bank_account_id.trim() !== '') {
        paymentData.bank_account_id = bank_account_id;
      }
    } else if (method === 'upi') {
      if (upi_account_id && upi_account_id.trim() !== '') {
        paymentData.bank_account_id = upi_account_id;
      }
    } else if (method === 'cash') {
      // For cash payments, use the selected cash account
      const cash_account_id = body.cash_account_id;
      if (cash_account_id && cash_account_id.trim() !== '') {
        paymentData.bank_account_id = cash_account_id;
      }
    }
    // Note: cash method doesn't store account_id as it updates cash balance directly

    console.log('Final payment data to insert:', paymentData);

    // Try using raw SQL to bypass any potential triggers
    let { data: payment, error } = await supabase.rpc('insert_payment', {
      p_invoice_id: paymentData.invoice_id,
      p_amount: paymentData.amount,
      p_method: paymentData.method,
      p_date: paymentData.date,
      p_reference: paymentData.reference || null,
      p_description: paymentData.description || null,
      p_bank_account_id: paymentData.bank_account_id || null
    });

    // If the function doesn't exist, fall back to direct insert
    if (error && error.message.includes('function')) {
      console.log('Custom function not found, trying simplified approach...');
      
      // Simple approach: Insert payment and manually update invoice
      const result = await supabase
        .from('payments')
        .insert({
          invoice_id: paymentData.invoice_id,
          amount: paymentData.amount,
          method: paymentData.method,
          date: paymentData.date,
          ...(paymentData.reference && { reference: paymentData.reference }),
          ...(paymentData.description && { description: paymentData.description }),
          ...(paymentData.bank_account_id && { bank_account_id: paymentData.bank_account_id })
        })
        .select('id, invoice_id, amount, date, method, reference, description, bank_account_id')
        .single();

      if (result.error) {
        console.error('Simplified insert failed:', result.error);
        console.error('Error details:', {
          code: result.error.code,
          message: result.error.message,
          details: result.error.details,
          hint: result.error.hint
        });
        
        return NextResponse.json({ 
          error: `Payment creation failed due to database trigger issue: ${result.error.message}. Please contact administrator to fix the 'paid_amount' column ambiguity in stored procedures.` 
        }, { status: 500 });
      } else {
        payment = result.data;
        error = null;
      }
    } else if (error) {
      console.error('Error creating payment via function:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Handle bank account transactions for applicable payment methods
    let targetAccountId = null;

    if (method === 'bank_transfer' || method === 'cheque') {
      targetAccountId = bank_account_id;
    } else if (method === 'upi') {
      targetAccountId = upi_account_id;
    } else if (method === 'cash') {
      targetAccountId = body.cash_account_id;
    }

    if (targetAccountId) {
      try {
        // Verify account exists
        const { data: account, error: accountError } = await supabase
          .from('bank_accounts')
          .select('id, name, current_balance, account_type, linked_bank_account_id')
          .eq('id', targetAccountId)
          .single();

        if (accountError || !account) {
          console.error('Account not found:', accountError);
          // Don't fail the payment, just log the error
        } else {
          // Fetch customer name for better transaction description
          const { data: customerData } = await supabase
            .from('customers')
            .select('name')
            .eq('id', orderData.customer_id)
            .single();
          
          const customerName = customerData?.name || 'Customer';
          
          // Create bank transaction (deposit - money coming in)
          const transactionDescription = `Payment received for Sales Order #${orderId} via ${method} - ${customerName}`;
          const transactionReference = reference || `Order-${orderId}`;

          const { error: transactionError } = await supabase
            .from('bank_transactions')
            .insert({
              bank_account_id: targetAccountId,
              type: 'deposit',
              amount: parseFloat(amount),
              description: transactionDescription,
              date: payment_date || new Date().toISOString().split('T')[0],
              reference: transactionReference
            });

          if (transactionError) {
            console.error('Error creating bank transaction:', transactionError);
            // Don't fail the payment, just log the error
          } else {
            // Update account balance
            const newBalance = (account.current_balance || 0) + parseFloat(amount);
            await supabase
              .from('bank_accounts')
              .update({ current_balance: newBalance })
              .eq('id', targetAccountId);

            console.log(`Updated account ${account.name} balance: ${account.current_balance} -> ${newBalance}`);

            // For UPI accounts, also update linked bank account if exists
            if (method === 'upi' && account.linked_bank_account_id) {
              try {
                const { data: linkedBankAccount, error: linkedBankError } = await supabase
                  .from('bank_accounts')
                  .select('id, name, current_balance')
                  .eq('id', account.linked_bank_account_id)
                  .single();

                if (!linkedBankError && linkedBankAccount) {
                  // Create transaction for linked bank account
                  await supabase
                    .from('bank_transactions')
                    .insert({
                      bank_account_id: account.linked_bank_account_id,
                      type: 'deposit',
                      amount: parseFloat(amount),
                      description: `UPI Transfer from ${account.name} for Order #${orderId} - ${customerName}`,
                      date: payment_date || new Date().toISOString().split('T')[0],
                      reference: `UPI-${transactionReference}`
                    });

                  // Update linked bank account balance
                  const linkedNewBalance = (linkedBankAccount.current_balance || 0) + parseFloat(amount);
                  await supabase
                    .from('bank_accounts')
                    .update({ current_balance: linkedNewBalance })
                    .eq('id', account.linked_bank_account_id);

                  console.log(`Updated linked bank ${linkedBankAccount.name} balance: ${linkedBankAccount.current_balance} -> ${linkedNewBalance}`);
                }
              } catch (linkedBankError) {
                console.error('Error processing linked bank account:', linkedBankError);
              }
            }
          }
        }
      } catch (bankError) {
        console.error('Error processing bank transaction:', bankError);
        // Don't fail the payment, just log the error
      }
    }

    // Handle cash transactions for cash payments
    if (method === 'cash') {
      try {
        console.log('💰 Processing cash payment - creating cash transaction and updating balance...');
        
        // 1. Get the default cash account (use first CASH account found)
        const { data: cashAccounts, error: cashAccountError } = await supabase
          .from('bank_accounts')
          .select('id, name')
          .eq('account_type', 'CASH')
          .order('created_at', { ascending: true })
          .limit(1);

        if (cashAccountError || !cashAccounts || cashAccounts.length === 0) {
          console.error('❌ Failed to find default cash account:', cashAccountError);
          throw new Error('Default cash account not found');
        }

        const cashAccount = cashAccounts[0];
        console.log('✅ Found default cash account:', cashAccount.id, cashAccount.name);

        // 2. Create cash transaction record (CREDIT for incoming payment)
        const { data: cashTransaction, error: cashTransactionError } = await supabase
          .from('cash_transactions')
          .insert({
            transaction_date: payment_date || new Date().toISOString().split('T')[0],
            amount: parseFloat(amount), // Positive for incoming payment
            transaction_type: 'CREDIT',
            description: `Cash payment received for Order ${orderId}`,
            reference_number: reference || undefined,
            source_type: 'sales_payment',
            source_id: payment.id,
            cash_account_id: cashAccount.id
          })
          .select()
          .single();

        if (cashTransactionError) {
          console.error('❌ Failed to create cash transaction:', cashTransactionError);
        } else {
          console.log('✅ Created cash transaction:', cashTransaction.id);

          // 3. Update cash balance
          const { data: currentBalance } = await supabase
            .from('cash_balances')
            .select('current_balance')
            .eq('cash_account_id', cashAccount.id)
            .single();

          const newBalance = (currentBalance?.current_balance || 0) + parseFloat(amount);

          const { error: balanceUpdateError } = await supabase
            .from('cash_balances')
            .upsert({
              cash_account_id: cashAccount.id,
              current_balance: newBalance,
              last_transaction_id: cashTransaction.id,
              last_updated: new Date().toISOString()
            }, {
              onConflict: 'cash_account_id'
            });

          if (balanceUpdateError) {
            console.error('❌ Failed to update cash balance:', balanceUpdateError);
          } else {
            console.log(`✅ Updated cash balance: ${currentBalance?.current_balance || 0} + ${amount} = ${newBalance}`);
          }
        }
      } catch (cashError) {
        console.error('❌ Error processing cash transaction:', cashError);
        // Don't fail the payment, just log the error
      }
    }

    // **NEW: Create journal entry for successful payment**
    if (payment && payment.id) {
      console.log('💰 Payment created successfully, creating journal entry...');
      
      const journalResult = await createPaymentJournalEntry({
        paymentId: payment.id,
        amount: parseFloat(amount),
        date: paymentData.date || new Date().toISOString().split('T')[0],
        reference: paymentData.reference,
        description: `Sales Order #${orderId} payment via ${method}`,
        paymentMethod: method,
        bankAccountId: paymentData.bank_account_id
      });
      
      if (journalResult.success) {
        console.log('✅ Journal entry created:', journalResult.journalEntryId);
        console.log(`📊 Dr. ${journalResult.paymentAccount} ${amount}, Cr. ${journalResult.arAccount} ${amount}`);
      } else {
        console.error('❌ Failed to create journal entry:', journalResult.error);
        // Don't fail the payment, just log the error
      }
    }

    return NextResponse.json(payment);

  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
