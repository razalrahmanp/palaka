import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

// PUT - Update an existing refund
export async function PUT(
  request: NextRequest,
  { params }: { params: { invoiceId: string; refundId: string } }
) {
  try {
    const { invoiceId, refundId } = await params;
    const body = await request.json();
    
    const {
      refund_amount,
      refund_type,
      reason,
      refund_method,
      bank_account_id,
      reference_number,
      notes,
      processed_at
    } = body;

    console.log('📝 Updating refund:', { refundId, invoiceId, body });

    // Get existing refund
    const { data: existingRefund, error: fetchError } = await supabase
      .from('invoice_refunds')
      .select('*')
      .eq('id', refundId)
      .eq('invoice_id', invoiceId)
      .single();

    if (fetchError || !existingRefund) {
      return NextResponse.json({
        success: false,
        error: 'Refund not found'
      }, { status: 404 });
    }

    // Update refund
    const { data: updatedRefund, error: updateError } = await supabase
      .from('invoice_refunds')
      .update({
        refund_amount,
        refund_type,
        reason,
        refund_method,
        bank_account_id: bank_account_id || null,
        reference_number: reference_number || null,
        notes: notes || null,
        processed_at: processed_at || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', refundId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating refund:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update refund'
      }, { status: 500 });
    }

    // If amount changed, update invoice total_refunded
    if (existingRefund.refund_amount !== refund_amount) {
      const amountDifference = refund_amount - existingRefund.refund_amount;
      
      const { error: invoiceUpdateError } = await supabase.rpc(
        'update_invoice_total_refunded',
        {
          p_invoice_id: invoiceId,
          p_amount_change: amountDifference
        }
      );

      if (invoiceUpdateError) {
        console.error('Error updating invoice total_refunded:', invoiceUpdateError);
      }
    }

    // If bank account changed, handle bank balance updates
    if (existingRefund.bank_account_id !== bank_account_id) {
      // Reverse old bank transaction if exists
      if (existingRefund.bank_account_id) {
        await supabase.rpc('adjust_bank_balance', {
          p_account_id: existingRefund.bank_account_id,
          p_amount: existingRefund.refund_amount // Add back the refunded amount
        });
      }

      // Create new bank transaction if new bank account
      if (bank_account_id) {
        await supabase.rpc('adjust_bank_balance', {
          p_account_id: bank_account_id,
          p_amount: -refund_amount // Deduct the refund amount
        });
      }
    } else if (existingRefund.refund_amount !== refund_amount && bank_account_id) {
      // Same bank account but amount changed
      const amountDifference = refund_amount - existingRefund.refund_amount;
      await supabase.rpc('adjust_bank_balance', {
        p_account_id: bank_account_id,
        p_amount: -amountDifference
      });
    }

    // Update associated expense if exists
    const { error: expenseUpdateError } = await supabase
      .from('expenses')
      .update({
        amount: refund_amount,
        payment_method: refund_method,
        date: processed_at ? processed_at.split('T')[0] : new Date().toISOString().split('T')[0],
        description: `Refund for Invoice ${invoiceId.slice(0, 8)} - ${reason}`,
        updated_at: new Date().toISOString()
      })
      .eq('entity_reference_id', refundId)
      .eq('entity_type', 'customer')
      .eq('category', 'Customer Refunds');

    if (expenseUpdateError) {
      console.error('Error updating associated expense:', expenseUpdateError);
      // Don't fail the operation, but log the error
    } else {
      console.log('Associated expense updated successfully');
    }

    return NextResponse.json({
      success: true,
      message: 'Refund updated successfully',
      data: updatedRefund
    });

  } catch (error) {
    console.error('Update refund API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// DELETE - Delete a refund
export async function DELETE(
  request: NextRequest,
  { params }: { params: { invoiceId: string; refundId: string } }
) {
  try {
    const { invoiceId, refundId } = await params;

    console.log('🗑️ Deleting refund:', { refundId, invoiceId });

    // Get existing refund
    const { data: existingRefund, error: fetchError } = await supabase
      .from('invoice_refunds')
      .select('*')
      .eq('id', refundId)
      .eq('invoice_id', invoiceId)
      .single();

    if (fetchError || !existingRefund) {
      return NextResponse.json({
        success: false,
        error: 'Refund not found'
      }, { status: 404 });
    }

    // Delete refund
    const { error: deleteError } = await supabase
      .from('invoice_refunds')
      .delete()
      .eq('id', refundId);

    if (deleteError) {
      console.error('Error deleting refund:', deleteError);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete refund'
      }, { status: 500 });
    }

    // Update invoice total_refunded
    const { error: invoiceUpdateError } = await supabase.rpc(
      'update_invoice_total_refunded',
      {
        p_invoice_id: invoiceId,
        p_amount_change: -existingRefund.refund_amount // Subtract the refunded amount
      }
    );

    if (invoiceUpdateError) {
      console.error('Error updating invoice total_refunded:', invoiceUpdateError);
    }

    // If refund had a bank account, reverse the transaction
    if (existingRefund.bank_account_id) {
      await supabase.rpc('adjust_bank_balance', {
        p_account_id: existingRefund.bank_account_id,
        p_amount: existingRefund.refund_amount // Add back the refunded amount
      });
    }

    // Delete associated expense if exists
    const { error: expenseDeleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('entity_reference_id', refundId)
      .eq('entity_type', 'customer')
      .eq('category', 'Customer Refunds');

    if (expenseDeleteError) {
      console.error('Error deleting associated expense:', expenseDeleteError);
      // Don't fail the operation, but log the error
    } else {
      console.log('Associated expense deleted successfully');
    }

    return NextResponse.json({
      success: true,
      message: 'Refund deleted successfully'
    });

  } catch (error) {
    console.error('Delete refund API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
