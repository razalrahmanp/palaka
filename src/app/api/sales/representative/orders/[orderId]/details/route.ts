import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseAdmin'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params

    // Fetch detailed order information
    const { data: order, error: orderError } = await supabase
      .from('sales_orders')
      .select(`
        *,
        customers(
          id,
          name,
          email,
          phone,
          address,
          city,
          state,
          postal_code,
          customer_type
        ),
        sales_order_items(
          id,
          quantity,
          unit_price,
          product_id,
          product_name,
          sku,
          total_price,
          products(
            name,
            price,
            cost,
            category,
            sku,
            supplier_id,
            suppliers(name)
          ),
          custom_products(
            name,
            price,
            cost,
            category,
            supplier_id,
            suppliers(name)
          )
        ),
        sales_representative:users!sales_representative_id(
          id,
          name,
          email
        ),
        created_by_user:users!created_by(
          id,
          name,
          email
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError) {
      console.error('Error fetching order details:', orderError)
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Fetch payments for this order
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        payment_method,
        payment_date,
        status,
        reference_number,
        notes
      `)
      .eq('sales_order_id', orderId)
      .order('payment_date', { ascending: false })

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
    }

    // Calculate payment summary
    const totalPaid = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
    const balanceDue = (order.final_price || 0) - totalPaid
    const paymentStatus = balanceDue <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid'

    // Process order items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processedItems = order.sales_order_items?.map((item: any) => {
      const product = item.products || item.custom_products
      const supplier = product?.suppliers
      
      return {
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price || (item.quantity * item.unit_price),
        product_id: item.product_id,
        product_name: item.product_name || product?.name,
        sku: item.sku || product?.sku,
        category: product?.category,
        cost: product?.cost,
        profit: (item.unit_price - (product?.cost || 0)) * item.quantity,
        profit_margin: product?.cost ? (((item.unit_price - product.cost) / item.unit_price) * 100) : 0,
        supplier: supplier ? {
          id: product.supplier_id,
          name: supplier.name
        } : null
      }
    }) || []

    // Calculate order summary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemsTotal = processedItems.reduce((sum: number, item: any) => sum + item.total_price, 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalProfit = processedItems.reduce((sum: number, item: any) => sum + item.profit, 0)
    const overallProfitMargin = order.final_price ? (totalProfit / order.final_price) * 100 : 0

    return NextResponse.json({
      order: {
        id: order.id,
        quote_id: order.quote_id,
        customer_id: order.customer_id,
        status: order.status,
        created_at: order.created_at,
        updated_at: order.updated_at,
        expected_delivery_date: order.expected_delivery_date,
        address: order.address,
        notes: order.notes,
        
        // Pricing details
        original_price: order.original_price,
        discount_amount: order.discount_amount,
        tax_percentage: order.tax_percentage,
        tax_amount: order.tax_amount,
        freight_charges: order.freight_charges,
        final_price: order.final_price,
        grand_total: order.grand_total,
        
        // EMI and Bajaj Finance details
        emi_enabled: order.emi_enabled,
        emi_plan: order.emi_plan,
        emi_monthly: order.emi_monthly,
        bajaj_finance_amount: order.bajaj_finance_amount,
        bajaj_processing_fee_amount: order.bajaj_processing_fee_amount,
        bajaj_convenience_charges: order.bajaj_convenience_charges,
        bajaj_total_customer_payment: order.bajaj_total_customer_payment,
        bajaj_merchant_receivable: order.bajaj_merchant_receivable,
        
        // Delivery details
        delivery_floor: order.delivery_floor,
        first_floor_awareness: order.first_floor_awareness,
        
        // Relations
        customer: order.customers,
        sales_representative: order.sales_representative,
        created_by: order.created_by_user,
        
        // Calculated fields
        items_count: processedItems.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        total_quantity: processedItems.reduce((sum: number, item: any) => sum + item.quantity, 0)
      },
      items: processedItems,
      payments: payments || [],
      summary: {
        items_total: itemsTotal,
        total_paid: totalPaid,
        balance_due: balanceDue,
        payment_status: paymentStatus,
        total_profit: totalProfit,
        overall_profit_margin: overallProfitMargin,
        payment_count: payments?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in order details API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
