import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params;
    const data = await request.json();
    
    const {
      bill_number,
      bill_date,
      due_date,
      description,
      reference_number,
      tax_amount,
      discount_amount,
      total_amount,
      line_items,
      // GST related fields
      subtotal,
      freight_total,
      additional_charges,
      cgst,
      sgst,
      igst,
      total_gst,
      grand_total,
      gst_rate,
      is_interstate
    } = data;

    // Validate required fields
    if (!bill_number || !bill_date || !due_date || (!total_amount && !grand_total)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Start a transaction-like operation
    console.log('🔄 Updating enhanced vendor bill:', billId);

    // 1. Update the main bill record
    const { error: billError } = await supabase
      .from('vendor_bills')
      .update({
        bill_number,
        bill_date,
        due_date,
        total_amount: grand_total || total_amount,
        description,
        tax_amount: total_gst || tax_amount || 0,
        discount_amount: discount_amount || 0,
        reference_number,
        // GST fields
        subtotal: subtotal || 0,
        freight_total: freight_total || 0,
        additional_charges: additional_charges || 0,
        cgst: cgst || 0,
        sgst: sgst || 0,
        igst: igst || 0,
        total_gst: total_gst || 0,
        gst_rate: gst_rate || 0,
        is_interstate: is_interstate || false,
        updated_at: new Date().toISOString()
      })
      .eq('id', billId)
      .select()
      .single();

    if (billError) {
      console.error('Error updating vendor bill:', billError);
      return NextResponse.json(
        { success: false, error: 'Failed to update vendor bill' },
        { status: 500 }
      );
    }

    // 2. Process line items
    if (line_items && Array.isArray(line_items)) {
      for (const item of line_items) {
        const {
          id,
          product_id,
          product_name,
          description: item_description,
          quantity,
          unit_price,
          actual_cost_per_unit,
          purchase_order_id,
          operation
        } = item;

        if (operation === 'delete' && id) {
          // Delete existing line item
          const { error: deleteError } = await supabase
            .from('vendor_bill_line_items')
            .delete()
            .eq('id', id)
            .eq('vendor_bill_id', billId);

          if (deleteError) {
            console.error('Error deleting line item:', deleteError);
          } else {
            console.log('✅ Deleted line item:', id);
          }

        } else if (operation === 'create') {
          // Create new line item
          const { error: createError } = await supabase
            .from('vendor_bill_line_items')
            .insert({
              vendor_bill_id: billId,
              product_id: product_id || null,
              product_name,
              description: item_description || null,
              quantity,
              unit_price,
              actual_cost_per_unit: actual_cost_per_unit || unit_price, // Use calculated cost or fallback to unit price
              purchase_order_id: purchase_order_id || null,
              created_at: new Date().toISOString()
            });

          if (createError) {
            console.error('Error creating line item:', createError);
          } else {
            console.log('✅ Created new line item for product:', product_name);
          }

        } else if (operation === 'update' && id) {
          // Update existing line item
          const { error: updateError } = await supabase
            .from('vendor_bill_line_items')
            .update({
              product_id: product_id || null,
              product_name,
              description: item_description || null,
              quantity,
              unit_price,
              actual_cost_per_unit: actual_cost_per_unit || unit_price, // Use calculated cost or fallback to unit price
              purchase_order_id: purchase_order_id || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('vendor_bill_id', billId);

          if (updateError) {
            console.error('Error updating line item:', updateError);
          } else {
            console.log('✅ Updated line item:', id);
          }
        }
      }
    }

    // 3. Fetch the updated bill with line items for response
    const { data: completeUpdatedBill, error: fetchError } = await supabase
      .from('vendor_bills')
      .select(`
        *,
        suppliers(
          id,
          name,
          email,
          contact
        ),
        vendor_bill_line_items(*)
      `)
      .eq('id', billId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated bill:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Bill updated but failed to fetch updated data' },
        { status: 500 }
      );
    }

    console.log('✅ Enhanced vendor bill updated successfully:', billId);

    return NextResponse.json({
      success: true,
      data: completeUpdatedBill,
      message: 'Vendor bill updated successfully with line items'
    });

  } catch (error) {
    console.error('Error in enhanced vendor bill update API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}