// app/api/vendors/[id]/bills/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params

    // Get vendor bills
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
        purchase_orders(id, total),
        vendor_bill_po_links(
          purchase_order_id,
          amount,
          purchase_orders(id, total, quantity, product:products(id, name))
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
