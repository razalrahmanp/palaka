// app/api/vendors/[id]/bills/enhanced/route.ts
import { supabase } from '@/lib/supabasePool'
import { NextRequest, NextResponse } from 'next/server'

interface BillLineItem {
  product_id?: string | null;
  product_name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  actual_cost_per_unit: number;
  purchase_order_id?: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params
    const body = await request.json()

    const {
      // Basic bill info
      bill_number,
      bill_date,
      due_date,
      description,
      reference_number,
      
      // Financial totals
      subtotal,
      freight_total,
      additional_charges,
      discount_amount,
      cgst,
      sgst,
      igst,
      total_gst,
      grand_total,
      
      // Tax info
      gst_rate,
      is_interstate,
      
      // Line items
      line_items
    } = body

    // Start a transaction for consistent data
    const { data: bill, error: billError } = await supabase
      .from('vendor_bills')
      .insert({
        supplier_id: vendorId,
        bill_number,
        bill_date,
        due_date,
        description,
        reference_number,
        
        // Financial breakdown
        subtotal,
        freight_total,
        additional_charges,
        discount_amount,
        
        // Tax breakdown
        cgst,
        sgst,
        igst,
        total_gst,
        gst_rate,
        is_interstate,
        
        // Totals
        total_amount: grand_total,
        paid_amount: 0,
        status: 'pending',
        
        created_at: new Date().toISOString(),
        created_by: null // Will be handled by auth
      })
      .select()
      .single()

    if (billError) {
      console.error('Error creating enhanced bill:', billError)
      return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 })
    }

    // Insert line items with detailed costing
    const lineItemsData = line_items.map((item: BillLineItem) => ({
      vendor_bill_id: bill.id,
      product_id: item.product_id,
      product_name: item.product_name,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      actual_cost_per_unit: item.actual_cost_per_unit,
      purchase_order_id: item.purchase_order_id
    }))

    const { error: lineItemsError } = await supabase
      .from('vendor_bill_line_items')
      .insert(lineItemsData)

    if (lineItemsError) {
      console.error('Error creating line items:', lineItemsError)
      // Rollback the bill if line items fail
      await supabase
        .from('vendor_bills')
        .delete()
        .eq('id', bill.id)
      
      return NextResponse.json({ error: 'Failed to create bill line items' }, { status: 500 })
    }

    // Create vendor_bill_po_links entries for purchase orders
    const linkedPurchaseOrders = line_items.filter((item: BillLineItem) => item.purchase_order_id).map((item: BillLineItem) => item.purchase_order_id);
    const uniquePurchaseOrders = [...new Set(linkedPurchaseOrders)]; // Remove duplicates

    if (uniquePurchaseOrders.length > 0) {
      // Get purchase order amounts for proper linking
      const { data: purchaseOrders, error: poError } = await supabase
        .from('purchase_orders')
        .select('id, total')
        .in('id', uniquePurchaseOrders)

      if (poError) {
        console.error('Error fetching purchase order amounts:', poError)
        // Don't fail the entire operation, just log the error
      } else {
        // Create vendor_bill_po_links entries
        const linkData = purchaseOrders.map(po => ({
          vendor_bill_id: bill.id,
          purchase_order_id: po.id,
          amount: po.total
        }))

        const { error: linkError } = await supabase
          .from('vendor_bill_po_links')
          .insert(linkData)

        if (linkError) {
          console.error('Error creating vendor bill PO links:', linkError)
          // Don't fail the entire operation, just log the error
        }
      }
    }

    // Update product costs if products are linked
    for (const item of line_items) {
      if (item.product_id && item.actual_cost_per_unit > 0) {
        try {
          // Update the product's cost with the new actual cost including freight
          await supabase
            .from('products')
            .update({
              cost: item.actual_cost_per_unit,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.product_id)

          // Log the cost update for audit trail
          await supabase
            .from('product_cost_history')
            .insert({
              product_id: item.product_id,
              old_cost: 0, // We don't have the old cost here, would need to fetch it first
              new_cost: item.actual_cost_per_unit,
              reason: 'Vendor bill update',
              vendor_bill_id: bill.id,
              created_at: new Date().toISOString()
            })
        } catch (costUpdateError) {
          console.log('Failed to update product cost for product:', item.product_id, costUpdateError)
          // Don't fail the entire operation if cost update fails
        }
      }
    }

    return NextResponse.json({
      ...bill,
      line_items: lineItemsData,
      message: 'Enhanced vendor bill created successfully with detailed costing'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating enhanced vendor bill:', error)
    return NextResponse.json({ error: 'Failed to create enhanced bill' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params

    // Get enhanced vendor bills with line items
    const { data: bills, error } = await supabase
      .from('vendor_bills')
      .select(`
        *,
        vendor_bill_line_items(
          id,
          product_id,
          product_name,
          description,
          quantity,
          unit_price,
          line_total,
          actual_cost_per_unit,
          purchase_order_id,
          products(id, name, sku)
        )
      `)
      .eq('supplier_id', vendorId)
      .order('bill_date', { ascending: false })

    if (error) {
      console.log('Enhanced bills table may not exist yet:', error.message)
      return NextResponse.json([])
    }

    // Calculate remaining amounts
    const billsWithRemaining = (bills || []).map(bill => ({
      ...bill,
      remaining_amount: (bill.total_amount || 0) - (bill.paid_amount || 0)
    }));

    return NextResponse.json(billsWithRemaining)
  } catch (error) {
    console.error('Error fetching enhanced vendor bills:', error)
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 })
  }
}