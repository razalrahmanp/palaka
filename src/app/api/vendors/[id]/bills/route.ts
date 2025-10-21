// app/api/vendors/[id]/bills/route.ts
import { supabase } from '@/lib/supabasePool'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params

    // Get vendor bills with line items
    const { data: bills, error } = await supabase
      .from('vendor_bills')
      .select(`
        id,
        bill_number,
        bill_date,
        due_date,
        total_amount,
        paid_amount,
        status,
        description,
        tax_amount,
        discount_amount,
        reference_number,
        subtotal,
        freight_total,
        additional_charges,
        cgst,
        sgst,
        igst,
        total_gst,
        gst_rate,
        is_interstate,
        purchase_orders(id, total),
        vendor_bill_po_links(
          purchase_order_id,
          amount,
          purchase_orders(id, total, quantity, product:products(id, name))
        ),
        vendor_bill_line_items(
          id,
          product_id,
          product_name,
          description,
          quantity,
          unit_price,
          actual_cost_per_unit,
          purchase_order_id
        ),
        created_at
      `)
      .eq('supplier_id', vendorId)
      .order('bill_date', { ascending: false })

    if (error) {
      // If vendor_bills table doesn't exist, return empty array
      console.log('vendor_bills table may not exist yet:', error.message)
      return NextResponse.json([])
    }

    // Add calculated remaining_amount to each bill
    const billsWithRemaining = (bills || []).map(bill => ({
      ...bill,
      remaining_amount: (bill.total_amount || 0) - (bill.paid_amount || 0)
    }));

    return NextResponse.json(billsWithRemaining)
  } catch (error) {
    console.error('Error fetching vendor bills:', error)
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params
    const body = await request.json()

    const {
      bill_number,
      bill_date,
      due_date,
      total_amount,
      description,
      tax_amount = 0,
      discount_amount = 0,
      purchase_order_ids,
      created_by
    } = body

    // Insert vendor bill
    const { data: bill, error } = await supabase
      .from('vendor_bills')
      .insert({
        supplier_id: vendorId,
        bill_number,
        bill_date,
        due_date,
        total_amount,
        description,
        tax_amount,
        discount_amount,
        purchase_order_id: null, // We'll use the junction table for multiple POs
        created_by,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    // If purchase orders are selected, create the links
    if (purchase_order_ids && purchase_order_ids.length > 0) {
      // Get the purchase order amounts for proper linking
      const { data: purchaseOrders, error: poError } = await supabase
        .from('purchase_orders')
        .select('id, total')
        .in('id', purchase_order_ids)

      if (poError) throw poError

      // Create vendor_bill_po_links entries
      const linkData = purchaseOrders.map(po => ({
        vendor_bill_id: bill.id,
        purchase_order_id: po.id,
        amount: po.total
      }))

      const { error: linkError } = await supabase
        .from('vendor_bill_po_links')
        .insert(linkData)

      if (linkError) throw linkError
    }

    return NextResponse.json(bill, { status: 201 })
  } catch (error) {
    console.error('Error creating vendor bill:', error)
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params
    const body = await request.json()
    const { bill_id, ...updateData } = body

    // Update vendor bill
    const { data: bill, error } = await supabase
      .from('vendor_bills')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', bill_id)
      .eq('supplier_id', vendorId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(bill)
  } catch (error) {
    console.error('Error updating vendor bill:', error)
    return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params
    const body = await request.json()
    const { bill_id } = body

    if (!bill_id) {
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 })
    }

    // Check if bill exists and belongs to this vendor
    const { data: existingBill, error: fetchError } = await supabase
      .from('vendor_bills')
      .select('id, bill_number, paid_amount, status')
      .eq('id', bill_id)
      .eq('supplier_id', vendorId)
      .single()

    if (fetchError || !existingBill) {
      return NextResponse.json({ error: 'Bill not found or does not belong to this vendor' }, { status: 404 })
    }

    // Delete associated line items first
    const { error: lineItemsDeleteError } = await supabase
      .from('vendor_bill_line_items')
      .delete()
      .eq('vendor_bill_id', bill_id)

    if (lineItemsDeleteError) {
      console.error('Error deleting vendor bill line items:', lineItemsDeleteError)
      return NextResponse.json({ error: 'Failed to delete associated line items' }, { status: 500 })
    }

    // Delete associated PO links
    const { error: poLinksDeleteError } = await supabase
      .from('vendor_bill_po_links')
      .delete()
      .eq('vendor_bill_id', bill_id)

    if (poLinksDeleteError) {
      console.error('Error deleting vendor bill PO links:', poLinksDeleteError)
      return NextResponse.json({ error: 'Failed to delete associated purchase order links' }, { status: 500 })
    }

    // Delete associated payment history if any
    if (existingBill.paid_amount > 0) {
      const { error: paymentDeleteError } = await supabase
        .from('vendor_payment_history')
        .delete()
        .eq('vendor_bill_id', bill_id)

      if (paymentDeleteError) {
        console.error('Error deleting payment history:', paymentDeleteError)
        return NextResponse.json({ error: 'Failed to delete associated payment records' }, { status: 500 })
      }
    }

    // Delete the vendor bill
    const { error: deleteError } = await supabase
      .from('vendor_bills')
      .delete()
      .eq('id', bill_id)
      .eq('supplier_id', vendorId)

    if (deleteError) {
      console.error('Error deleting vendor bill:', deleteError)
      return NextResponse.json({ error: 'Failed to delete vendor bill' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Vendor bill ${existingBill.bill_number} deleted successfully`
    })
  } catch (error) {
    console.error('Error deleting vendor bill:', error)
    return NextResponse.json({ error: 'Failed to delete bill' }, { status: 500 })
  }
}
