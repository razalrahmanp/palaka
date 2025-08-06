import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const asOfDate = searchParams.get('asOfDate') || new Date().toISOString().split('T')[0]

    // Get unpaid vendor bills
    const { data: bills, error } = await supabaseAdmin
      .from('vendor_bills')
      .select(`
        id,
        total_amount,
        paid_amount,
        bill_date,
        suppliers (
          id,
          name,
          contact
        )
      `)
      .neq('status', 'paid')
      .lte('bill_date', asOfDate)

    if (error) throw error

    // Group by supplier and calculate aging
    const supplierAging = new Map()
    const asOfDateObj = new Date(asOfDate)

    bills?.forEach(bill => {
      const supplierData = Array.isArray(bill.suppliers) ? bill.suppliers[0] : bill.suppliers
      const supplierName = supplierData?.name || 'Unknown'
      const supplierId = supplierData?.id || 'unknown'
      const billDate = new Date(bill.bill_date)
      const daysDiff = Math.floor((asOfDateObj.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24))
      const outstanding = (bill.total_amount || 0) - (bill.paid_amount || 0)

      if (!supplierAging.has(supplierId)) {
        supplierAging.set(supplierId, {
          supplier_id: supplierId,
          supplier_name: supplierName,
          supplier_contact: supplierData?.contact || '',
          current_amount: 0,
          days_30_amount: 0,
          days_60_amount: 0,
          days_90_amount: 0,
          days_over_90_amount: 0,
          total_outstanding: 0
        })
      }

      const supplierRecord = supplierAging.get(supplierId)
      if (supplierRecord) {
        supplierRecord.total_outstanding += outstanding

        if (daysDiff <= 30) {
          supplierRecord.current_amount += outstanding
        } else if (daysDiff <= 60) {
          supplierRecord.days_30_amount += outstanding
        } else if (daysDiff <= 90) {
          supplierRecord.days_60_amount += outstanding
        } else {
          supplierRecord.days_over_90_amount += outstanding
        }
      }
    })

    const apAging = Array.from(supplierAging.values())

    // Calculate aging totals
    const totals = {
      current: 0,
      days_30: 0,
      days_60: 0,
      days_90: 0,
      days_over_90: 0,
      total_outstanding: 0
    }

    apAging?.forEach(supplier => {
      totals.current += supplier.current_amount || 0
      totals.days_30 += supplier.days_30_amount || 0
      totals.days_60 += supplier.days_60_amount || 0
      totals.days_90 += supplier.days_90_amount || 0
      totals.days_over_90 += supplier.days_over_90_amount || 0
      totals.total_outstanding += supplier.total_outstanding || 0
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
        suppliers: apAging || [],
        totals,
        percentages,
        summary: {
          totalSuppliers: apAging?.length || 0,
          suppliersWithBalance: apAging?.filter(s => (s.total_outstanding || 0) > 0).length || 0,
          averageBalance: apAging?.length ? totals.total_outstanding / apAging.length : 0
        }
      }
    })
  } catch (error) {
    console.error('Error fetching AP aging:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch accounts payable aging'
    }, { status: 500 })
  }
}
