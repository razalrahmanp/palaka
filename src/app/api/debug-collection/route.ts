import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Check invoices structure
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, sales_order_id, total')
      .limit(5)

    // Check payments structure
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, invoice_id, amount')
      .limit(5)

    // Check if there are any invoices with both sales_order_id and payments
    const { data: invoicesWithPayments, error: relationError } = await supabase
      .from('invoices')
      .select(`
        id,
        sales_order_id,
        total,
        payments(id, amount)
      `)
      .not('sales_order_id', 'is', null)
      .limit(5)

    return NextResponse.json({
      invoices_sample: invoices || [],
      payments_sample: payments || [],
      invoices_with_payments: invoicesWithPayments || [],
      invoices_count: invoices?.length || 0,
      payments_count: payments?.length || 0,
      invoices_with_payments_count: invoicesWithPayments?.length || 0,
      errors: {
        invoices: invoicesError?.message || null,
        payments: paymentsError?.message || null,
        relation: relationError?.message || null
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Query failed', details: error }, { status: 500 })
  }
}