import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const asOfDate = searchParams.get('asOfDate') || new Date().toISOString().split('T')[0]

    // Get unpaid invoices with customer details
    const { data: invoices, error } = await supabaseAdmin
      .from('invoices')
      .select(`
        id,
        total,
        paid_amount,
        created_at,
        customer_name,
        customers (
          id,
          name,
          email
        )
      `)
      .neq('status', 'paid')
      .lte('created_at', asOfDate)

    if (error) throw error

    // Group by customer and calculate aging
    const customerAging = new Map()
    const asOfDateObj = new Date(asOfDate)

    invoices?.forEach(invoice => {
      const customerData = Array.isArray(invoice.customers) ? invoice.customers[0] : invoice.customers
      const customerName = invoice.customer_name || customerData?.name || 'Unknown'
      const customerId = customerData?.id || 'unknown'
      const invoiceDate = new Date(invoice.created_at)
      const daysDiff = Math.floor((asOfDateObj.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
      const outstanding = (invoice.total || 0) - (invoice.paid_amount || 0)

      if (!customerAging.has(customerId)) {
        customerAging.set(customerId, {
          customer_id: customerId,
          customer_name: customerName,
          customer_email: customerData?.email || '',
          current_amount: 0,
          days_30_amount: 0,
          days_60_amount: 0,
          days_90_amount: 0,
          days_over_90_amount: 0,
          total_outstanding: 0
        })
      }

      const customerRecord = customerAging.get(customerId)
      if (customerRecord) {
        customerRecord.total_outstanding += outstanding

        if (daysDiff <= 30) {
          customerRecord.current_amount += outstanding
        } else if (daysDiff <= 60) {
          customerRecord.days_30_amount += outstanding
        } else if (daysDiff <= 90) {
          customerRecord.days_60_amount += outstanding
        } else {
          customerRecord.days_over_90_amount += outstanding
        }
      }
    })

    const arAging = Array.from(customerAging.values())

    // Calculate aging totals
    const totals = {
      current: 0,
      days_30: 0,
      days_60: 0,
      days_90: 0,
      days_over_90: 0,
      total_outstanding: 0
    }

    arAging?.forEach(customer => {
      totals.current += customer.current_amount || 0
      totals.days_30 += customer.days_30_amount || 0
      totals.days_60 += customer.days_60_amount || 0
      totals.days_90 += customer.days_90_amount || 0
      totals.days_over_90 += customer.days_over_90_amount || 0
      totals.total_outstanding += customer.total_outstanding || 0
    })

    // Calculate percentages
    const percentages = {
      current: totals.total_outstanding > 0 ? (totals.current / totals.total_outstanding) * 100 : 0,
      days_30: totals.total_outstanding > 0 ? (totals.days_30 / totals.total_outstanding) * 100 : 0,
      days_60: totals.total_outstanding > 0 ? (totals.days_60 / totals.total_outstanding) * 100 : 0,
      days_90: totals.total_outstanding > 0 ? (totals.days_90 / totals.total_outstanding) * 100 : 0,
      days_over_90: totals.total_outstanding > 0 ? (totals.days_over_90 / totals.total_outstanding) * 100 : 0
    }

    return NextResponse.json({
      success: true,
      data: {
        asOfDate,
        customers: arAging || [],
        totals,
        percentages,
        summary: {
          totalCustomers: arAging?.length || 0,
          customersWithBalance: arAging?.filter(c => (c.total_outstanding || 0) > 0).length || 0,
          averageBalance: arAging?.length ? totals.total_outstanding / arAging.length : 0
        }
      }
    })
  } catch (error) {
    console.error('Error fetching AR aging:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch accounts receivable aging'
    }, { status: 500 })
  }
}
