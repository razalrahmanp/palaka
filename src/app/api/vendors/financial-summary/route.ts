// app/api/vendors/financial-summary/route.ts
import { supabase } from '@/lib/supabasePool'
import { NextResponse } from 'next/server'

interface PurchaseOrder {
  total: number
  paid_amount: number
  status: string
}

interface VendorBill {
  total_amount: number
  paid_amount: number
  status: string
  due_date?: string
}

interface Vendor {
  id: string
  name: string
  contact: string
  purchase_orders: PurchaseOrder[]
  vendor_bills?: VendorBill[]
}

export async function GET() {
  try {
    // Get vendor financial summary using existing purchase_orders and new vendor_bills
    const { data: vendorSummary, error } = await supabase
      .from('suppliers')
      .select(`
        id,
        name,
        contact,
        purchase_orders(total, paid_amount, status),
        vendor_bills(total_amount, paid_amount, status)
      `)
      .eq('is_deleted', false)

    if (error) {
      console.log('vendor_bills table may not exist, using purchase_orders only')
      
      // Fallback to purchase_orders only
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('suppliers')
        .select(`
          id,
          name,
          contact,
          purchase_orders(total, paid_amount, status)
        `)
        .eq('is_deleted', false)

      if (fallbackError) throw fallbackError

      const processed = fallbackData?.map((vendor: Vendor) => {
        const orders = vendor.purchase_orders || []
        const totalOrders = orders.length
        const totalValue = orders.reduce((sum: number, order: PurchaseOrder) => sum + (order.total || 0), 0)
        const totalPaid = orders.reduce((sum: number, order: PurchaseOrder) => sum + (order.paid_amount || 0), 0)
        const totalOutstanding = totalValue - totalPaid

        return {
          id: vendor.id,
          name: vendor.name,
          contact: vendor.contact,
          total_orders: totalOrders,
          total_purchase_value: totalValue,
          total_paid: totalPaid,
          total_outstanding: totalOutstanding,
          payment_status: totalOutstanding > 0 ? 'pending' : 'current',
          last_transaction_date: null
        }
      }) || []

      return NextResponse.json(processed)
    }

    // Process data with both purchase orders and vendor bills
    const processed = vendorSummary?.map((vendor: Vendor) => {
      const orders = vendor.purchase_orders || []
      const bills = vendor.vendor_bills || []

      const totalOrders = orders.length
      const orderValue = orders.reduce((sum: number, order: PurchaseOrder) => sum + (order.total || 0), 0)
      const orderPaid = orders.reduce((sum: number, order: PurchaseOrder) => sum + (order.paid_amount || 0), 0)

      const totalBills = bills.length
      const billValue = bills.reduce((sum: number, bill: VendorBill) => sum + (bill.total_amount || 0), 0)
      const billPaid = bills.reduce((sum: number, bill: VendorBill) => sum + (bill.paid_amount || 0), 0)

      const totalValue = orderValue + billValue
      const totalPaid = orderPaid + billPaid
      const totalOutstanding = totalValue - totalPaid

      const overdueBills = bills.filter((bill: VendorBill) => 
        bill.status === 'overdue' || 
        (bill.status === 'pending' && bill.due_date && new Date(bill.due_date) < new Date())
      ).length

      return {
        id: vendor.id,
        name: vendor.name,
        contact: vendor.contact,
        total_orders: totalOrders,
        total_bills: totalBills,
        total_purchase_value: totalValue,
        total_paid: totalPaid,
        total_outstanding: totalOutstanding,
        overdue_bills: overdueBills,
        payment_status: overdueBills > 0 ? 'overdue' : totalOutstanding > 0 ? 'pending' : 'current',
        last_transaction_date: null
      }
    }) || []

    return NextResponse.json(processed)
  } catch (error) {
    console.error('Error fetching vendor financial summary:', error)
    return NextResponse.json({ error: 'Failed to fetch financial summary' }, { status: 500 })
  }
}
