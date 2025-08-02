// app/api/admin/demo-vendor-payments/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    console.log('Adding demo vendor payment data...')

    // Get existing vendors
    const { data: vendors, error: vendorsError } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('is_deleted', false)
      .limit(3)

    if (vendorsError) throw vendorsError

    if (!vendors || vendors.length === 0) {
      return NextResponse.json({ error: 'No vendors found to add demo data' }, { status: 400 })
    }

    // Get a sample user for created_by
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    const userId = users?.[0]?.id

    // Add vendor bills for existing business scenario
    const billsToAdd = []
    for (const vendor of vendors) {
      // Add some historical bills (already paid, partially paid, pending)
      billsToAdd.push(
        {
          supplier_id: vendor.id,
          bill_number: `INV-${Date.now()}-001`,
          bill_date: '2025-01-15',
          due_date: '2025-02-14',
          total_amount: 25000,
          paid_amount: 25000,
          status: 'paid',
          description: 'Raw materials purchase - January batch',
          created_by: userId
        },
        {
          supplier_id: vendor.id,
          bill_number: `INV-${Date.now()}-002`,
          bill_date: '2025-01-20',
          due_date: '2025-02-19',
          total_amount: 35000,
          paid_amount: 20000,
          status: 'partial',
          description: 'Furniture components and hardware',
          created_by: userId
        },
        {
          supplier_id: vendor.id,
          bill_number: `INV-${Date.now()}-003`,
          bill_date: '2025-01-25',
          due_date: '2025-02-24',
          total_amount: 18000,
          paid_amount: 0,
          status: 'pending',
          description: 'Monthly maintenance supplies',
          created_by: userId
        }
      )
    }

    const { data: insertedBills, error: billsError } = await supabase
      .from('vendor_bills')
      .insert(billsToAdd)
      .select()

    if (billsError) throw billsError

    // Add payment history records
    const paymentsToAdd = []
    for (const bill of insertedBills || []) {
      if (bill.paid_amount > 0) {
        paymentsToAdd.push({
          supplier_id: bill.supplier_id,
          vendor_bill_id: bill.id,
          amount: bill.paid_amount,
          payment_date: '2025-01-30',
          payment_method: 'bank_transfer',
          reference_number: `TXN-${Date.now()}`,
          notes: `Payment for ${bill.bill_number}`,
          status: 'completed',
          created_by: userId
        })
      }
    }

    if (paymentsToAdd.length > 0) {
      const { error: paymentsError } = await supabase
        .from('vendor_payment_history')
        .insert(paymentsToAdd)

      if (paymentsError) throw paymentsError
    }

    // Add payment terms for vendors
    const paymentTermsToAdd = vendors.map(vendor => ({
      supplier_id: vendor.id,
      payment_terms_days: 30,
      early_payment_discount_percentage: 2.0,
      early_payment_days: 10,
      late_payment_penalty_percentage: 1.5,
      credit_limit: 100000,
      created_by: userId
    }))

    const { error: termsError } = await supabase
      .from('vendor_payment_terms')
      .insert(paymentTermsToAdd)

    if (termsError) console.log('Payment terms may already exist:', termsError.message)

    return NextResponse.json({ 
      success: true, 
      message: `Demo payment data added for ${vendors.length} vendors`,
      data: {
        bills_added: billsToAdd.length,
        payments_added: paymentsToAdd.length,
        vendors_processed: vendors.length
      }
    })
  } catch (error) {
    console.error('Error adding demo vendor payment data:', error)
    return NextResponse.json({ 
      error: 'Failed to add demo payment data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
