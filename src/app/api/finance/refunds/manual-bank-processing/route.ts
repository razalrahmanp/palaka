import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

// POST - Manually process refund bank transaction and update balance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      refund_id,
      action, // 'process_refund' or 'reverse_refund'
      processed_by,
      notes
    } = body;

    if (!refund_id || !action || !processed_by) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: refund_id, action, processed_by' },
        { status: 400 }
      );
    }

    const client = supabase;

    // Get refund details
    const { data: refund, error: refundError } = await client
      .from('invoice_refunds')
      .select(`
        *,
        invoices:invoice_id (
          id,
          customer_name,
          total
        ),
        bank_accounts:bank_account_id (
          id,
          name,
          account_number,
          current_balance
        )
      `)
      .eq('id', refund_id)
      .single();

    if (refundError || !refund) {
      return NextResponse.json(
        { success: false, error: 'Refund not found' },
        { status: 404 }
      );
    }

    // Validate action
    if (action === 'process_refund') {
      if (refund.status !== 'approved') {
        return NextResponse.json(
          { success: false, error: 'Refund must be approved before processing' },
          { status: 400 }
        );
      }

      // Check bank balance for bank transfer/cheque refunds
      if (refund.refund_method === 'bank_transfer' || refund.refund_method === 'cheque') {
        if (!refund.bank_account_id) {
          return NextResponse.json(
            { success: false, error: 'Bank account is required for this refund method' },
            { status: 400 }
          );
        }

        const bankAccount = Array.isArray(refund.bank_accounts) ? refund.bank_accounts[0] : refund.bank_accounts;
        if (!bankAccount) {
          return NextResponse.json(
            { success: false, error: 'Bank account not found' },
            { status: 404 }
          );
        }

        if (bankAccount.current_balance < refund.refund_amount) {
          return NextResponse.json(
            { 
              success: false, 
              error: `Insufficient bank balance. Available: ₹${bankAccount.current_balance}, Required: ₹${refund.refund_amount}` 
            },
            { status: 400 }
          );
        }
      }
    } else if (action === 'reverse_refund') {
      if (refund.status !== 'processed') {
        return NextResponse.json(
          { success: false, error: 'Only processed refunds can be reversed' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be process_refund or reverse_refund' },
        { status: 400 }
      );
    }

    let bankTransaction = null;
    let updatedBankAccount = null;

    // Handle bank balance and transaction for bank transfer/cheque refunds
    if (refund.refund_method === 'bank_transfer' || refund.refund_method === 'cheque') {
      const bankAccount = Array.isArray(refund.bank_accounts) ? refund.bank_accounts[0] : refund.bank_accounts;
      
      if (action === 'process_refund') {
        // Reduce bank balance
        const newBalance = parseFloat(bankAccount.current_balance) - parseFloat(refund.refund_amount);
        
        const { data: updatedAccount, error: balanceError } = await client
          .from('bank_accounts')
          .update({
            current_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', refund.bank_account_id)
          .select()
          .single();

        if (balanceError) {
          return NextResponse.json(
            { success: false, error: 'Failed to update bank balance' },
            { status: 500 }
          );
        }
        updatedBankAccount = updatedAccount;

        // Create bank transaction
        const { data: transaction, error: transactionError } = await client
          .from('bank_transactions')
          .insert({
            bank_account_id: refund.bank_account_id,
            transaction_type: 'refund_outgoing',
            amount: -parseFloat(refund.refund_amount),
            description: `Refund for Invoice ${refund.invoices?.id} - ${refund.invoices?.customer_name}`,
            reference_number: refund.reference_number || `REF-${refund.id}`,
            transaction_date: new Date().toISOString(),
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (transactionError) {
          console.error('Error creating bank transaction:', transactionError);
          // Continue anyway - balance is already updated
        } else {
          bankTransaction = transaction;
        }

      } else if (action === 'reverse_refund') {
        // Restore bank balance
        const newBalance = parseFloat(bankAccount.current_balance) + parseFloat(refund.refund_amount);
        
        const { data: updatedAccount, error: balanceError } = await client
          .from('bank_accounts')
          .update({
            current_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', refund.bank_account_id)
          .select()
          .single();

        if (balanceError) {
          return NextResponse.json(
            { success: false, error: 'Failed to restore bank balance' },
            { status: 500 }
          );
        }
        updatedBankAccount = updatedAccount;

        // Create reversal transaction
        const { data: transaction, error: transactionError } = await client
          .from('bank_transactions')
          .insert({
            bank_account_id: refund.bank_account_id,
            transaction_type: 'refund_reversal',
            amount: parseFloat(refund.refund_amount),
            description: `Refund Reversal for Invoice ${refund.invoices?.id} - ${refund.invoices?.customer_name}`,
            reference_number: `REV-${refund.reference_number || refund.id}`,
            transaction_date: new Date().toISOString(),
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (transactionError) {
          console.error('Error creating reversal transaction:', transactionError);
        } else {
          bankTransaction = transaction;
        }
      }
    }

    // Update refund status
    const newStatus = action === 'process_refund' ? 'processed' : 'cancelled';
    const updateData: {
      status: string;
      updated_at: string;
      processed_by?: string;
      processed_at?: string;
      notes?: string;
    } = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    if (action === 'process_refund') {
      updateData.processed_by = processed_by;
      updateData.processed_at = new Date().toISOString();
    }

    if (notes) {
      updateData.notes = notes;
    }

    const { data: updatedRefund, error: updateError } = await client
      .from('invoice_refunds')
      .update(updateData)
      .eq('id', refund_id)
      .select(`
        *,
        invoices:invoice_id (
          id,
          customer_name,
          total
        ),
        processed_by_user:processed_by (
          id,
          name,
          email
        )
      `)
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to update refund status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Refund ${action === 'process_refund' ? 'processed' : 'reversed'} successfully`,
      data: {
        refund: updatedRefund,
        bank_transaction: bankTransaction,
        bank_account: updatedBankAccount,
        balance_change: action === 'process_refund' ? -refund.refund_amount : refund.refund_amount
      }
    });

  } catch (error) {
    console.error('Manual refund processing API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Manually adjust bank account balance with transaction record
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bank_account_id,
      adjustment_amount,
      adjustment_reason,
      adjusted_by,
      reference_number
    } = body;

    if (!bank_account_id || adjustment_amount === undefined || !adjustment_reason || !adjusted_by) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: bank_account_id, adjustment_amount, adjustment_reason, adjusted_by' },
        { status: 400 }
      );
    }

    const client = supabase;

    // Get current bank account
    const { data: bankAccount, error: bankError } = await client
      .from('bank_accounts')
      .select('*')
      .eq('id', bank_account_id)
      .single();

    if (bankError || !bankAccount) {
      return NextResponse.json(
        { success: false, error: 'Bank account not found' },
        { status: 404 }
      );
    }

    const oldBalance = parseFloat(bankAccount.current_balance);
    const adjustmentAmount = parseFloat(adjustment_amount);
    const newBalance = oldBalance + adjustmentAmount;

    // Update bank balance
    const { data: updatedAccount, error: updateError } = await client
      .from('bank_accounts')
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', bank_account_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to update bank balance' },
        { status: 500 }
      );
    }

    // Create adjustment transaction
    const { data: transaction, error: transactionError } = await client
      .from('bank_transactions')
      .insert({
        bank_account_id,
        transaction_type: 'adjustment',
        amount: adjustmentAmount,
        description: `Manual balance adjustment: ${adjustment_reason}`,
        reference_number: reference_number || `ADJ-${Date.now()}`,
        transaction_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating adjustment transaction:', transactionError);
      return NextResponse.json(
        { success: false, error: 'Balance updated but failed to create transaction record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bank balance adjusted successfully',
      data: {
        bank_account: updatedAccount,
        transaction: transaction,
        adjustment: {
          old_balance: oldBalance,
          new_balance: newBalance,
          adjustment_amount: adjustmentAmount,
          reason: adjustment_reason,
          adjusted_by
        }
      }
    });

  } catch (error) {
    console.error('Manual bank adjustment API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}