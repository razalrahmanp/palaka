// Simplified Purchase Returns API Implementation
// File: src/app/api/vendors/[id]/bills/[billId]/returns/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

interface CreateReturnPayload {
  reason: 'defective' | 'wrong_item' | 'damaged' | 'excess_quantity' | 'quality_issue' | 'other';
  reason_description?: string;
  line_items: Array<{
    vendor_bill_line_item_id: string;
    returned_quantity: number;
    return_reason: string;
    condition_at_return: 'unopened' | 'opened_unused' | 'partially_used' | 'damaged' | 'defective';
    is_restockable: boolean;
  }>;
  created_by?: string;
}

// GET - List all returns for a specific vendor bill
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; billId: string }> }
) {
  try {
    const { billId } = await params;

    const { data: returns, error } = await supabase
      .from('purchase_returns_summary')
      .select('*')
      .eq('vendor_bill_id', billId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(returns || []);
  } catch (error) {
    console.error('Error fetching purchase returns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase returns' },
      { status: 500 }
    );
  }
}

// POST - Create a new purchase return
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; billId: string }> }
) {
  try {
    const { id: vendorId, billId } = await params;
    const payload: CreateReturnPayload = await request.json();

    console.log('Received return payload:', JSON.stringify(payload, null, 2));

    // Validate required fields
    if (!payload.reason || !payload.line_items?.length) {
      console.log('Validation failed:', {
        reason: payload.reason,
        line_items_length: payload.line_items?.length
      });
      return NextResponse.json(
        { error: 'Missing required fields: reason, line_items' },
        { status: 400 }
      );
    }

    // Get vendor bill details
    const { data: vendorBill, error: billError } = await supabase
      .from('vendor_bills')
      .select(`
        *,
        suppliers(name),
        vendor_bill_line_items(*)
      `)
      .eq('id', billId)
      .eq('supplier_id', vendorId)
      .single();

    if (billError || !vendorBill) {
      return NextResponse.json(
        { error: 'Vendor bill not found' },
        { status: 404 }
      );
    }

    // Validate line items exist and calculate totals
    let totalReturnAmount = 0;
    const validatedLineItems = [];

    for (const item of payload.line_items) {
      const billLineItem = vendorBill.vendor_bill_line_items.find(
        (bli: { id: string; quantity: number; unit_price: number; total_amount: number; total_returned_quantity?: number }) => bli.id === item.vendor_bill_line_item_id
      );

      if (!billLineItem) {
        return NextResponse.json(
          { error: `Line item ${item.vendor_bill_line_item_id} not found in bill` },
          { status: 400 }
        );
      }

      // Check if return quantity is valid
      const alreadyReturned = billLineItem.total_returned_quantity || 0;
      const availableQuantity = billLineItem.quantity - alreadyReturned;

      if (item.returned_quantity > availableQuantity) {
        return NextResponse.json(
          { error: `Cannot return ${item.returned_quantity} of ${billLineItem.product_name}. Only ${availableQuantity} available.` },
          { status: 400 }
        );
      }

      const lineReturnTotal = item.returned_quantity * billLineItem.unit_price;
      totalReturnAmount += lineReturnTotal;

      validatedLineItems.push({
        ...item,
        product_id: billLineItem.product_id || null, // Handle nullable product_id
        product_name: billLineItem.product_name,
        description: billLineItem.description || '',
        original_quantity: billLineItem.quantity,
        unit_price: billLineItem.unit_price,
        actual_cost_per_unit: billLineItem.actual_cost_per_unit || billLineItem.unit_price,
        line_return_total: lineReturnTotal,
        line_gst_amount: 0 // Calculate based on GST rate if needed
      });
    }

    // Generate return number
    const returnNumber = `RET-${vendorBill.suppliers.name.substring(0, 4).toUpperCase()}-${Date.now()}`;

    // Start transaction
    const { data: purchaseReturn, error: returnError } = await supabase
      .from('purchase_returns')
      .insert({
        return_number: returnNumber,
        return_date: new Date().toISOString().split('T')[0],
        vendor_bill_id: billId,
        supplier_id: vendorId,
        total_return_amount: totalReturnAmount,
        returned_gst_amount: 0, // Calculate if needed
        net_return_amount: totalReturnAmount,
        reason: payload.reason,
        reason_description: payload.reason_description,
        status: 'processed', // Directly set to processed since we're not handling payment reversal
      })
      .select()
      .single();

    if (returnError) throw returnError;

    // Insert line items
    const lineItemsToInsert = validatedLineItems.map(item => ({
      purchase_return_id: purchaseReturn.id,
      vendor_bill_line_item_id: item.vendor_bill_line_item_id,
      product_id: item.product_id,
      product_name: item.product_name,
      description: item.description,
      original_quantity: item.original_quantity,
      returned_quantity: item.returned_quantity,
      unit_price: item.unit_price,
      actual_cost_per_unit: item.actual_cost_per_unit,
      line_return_total: item.line_return_total,
      line_gst_amount: item.line_gst_amount,
      return_reason: item.return_reason,
      condition_at_return: item.condition_at_return,
      is_restockable: item.is_restockable
    }));

    const { error: lineItemsError } = await supabase
      .from('purchase_return_line_items')
      .insert(lineItemsToInsert);

    if (lineItemsError) throw lineItemsError;

    // Update vendor bill line items with returned quantities
    for (const item of validatedLineItems) {
      // Get current line item data
      const { data: billLineItem } = await supabase
        .from('vendor_bill_line_items')
        .select('total_returned_quantity')
        .eq('id', item.vendor_bill_line_item_id)
        .single();

      if (billLineItem) {
        const { error: updateError } = await supabase
          .from('vendor_bill_line_items')
          .update({
            total_returned_quantity: (billLineItem.total_returned_quantity || 0) + item.returned_quantity
          })
          .eq('id', item.vendor_bill_line_item_id);

        if (updateError) {
          console.error('Error updating line item return quantity:', updateError);
        }
      }
    }

    // Return the created return with line items
    const { data: completeReturn, error: fetchError } = await supabase
      .from('purchase_returns')
      .select(`
        *,
        purchase_return_line_items(*),
        vendor_bills(bill_number, total_amount),
        suppliers(name)
      `)
      .eq('id', purchaseReturn.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json(completeReturn, { status: 201 });

  } catch (error) {
    console.error('Error creating purchase return:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase return' },
      { status: 500 }
    );
  }
}

// PUT - Update return status (approve/reject)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; billId: string }> }
) {
  try {
    const { billId } = await params;
    const { return_id, status, approved_by, notes } = await request.json();

    if (!return_id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: return_id, status' },
        { status: 400 }
      );
    }

    const updateData: Record<string, string | Date> = {
      status,
      updated_at: new Date().toISOString(),
      notes
    };

    if (status === 'approved' && approved_by) {
      updateData.approved_by = approved_by;
    }

    const { data: updatedReturn, error } = await supabase
      .from('purchase_returns')
      .update(updateData)
      .eq('id', return_id)
      .eq('vendor_bill_id', billId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(updatedReturn);

  } catch (error) {
    console.error('Error updating purchase return:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase return' },
      { status: 500 }
    );
  }
}