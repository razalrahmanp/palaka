import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeOutstanding = searchParams.get('include_outstanding') === 'true'

    // Get vendors/suppliers list
    const { data: vendors, error } = await supabase
      .from('suppliers')
      .select('id, name, contact, email, address, created_at')
      .order('name')

    if (error) {
      console.error('Error fetching vendors:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let result = vendors

    // If outstanding amounts are requested, fetch them
    if (includeOutstanding && vendors) {
      const vendorIds = vendors.map(v => v.id)
      
      // Get outstanding amounts from vendor bills
      const { data: outstandingData } = await supabase
        .from('vendor_bills')
        .select('supplier_id, amount, paid_amount')
        .in('supplier_id', vendorIds)
        .neq('status', 'PAID')

      // Calculate outstanding per vendor
      const outstandingMap: { [key: string]: number } = {}
      outstandingData?.forEach(bill => {
        const outstanding = (bill.amount || 0) - (bill.paid_amount || 0)
        if (outstanding > 0) {
          outstandingMap[bill.supplier_id] = (outstandingMap[bill.supplier_id] || 0) + outstanding
        }
      })

      // Add outstanding amounts to vendor data
      result = vendors.map(vendor => ({
        ...vendor,
        outstanding_amount: outstandingMap[vendor.id] || 0
      }))
    }

    return NextResponse.json({
      success: true,
      vendors: result || [],
      total: result?.length || 0
    })

  } catch (error) {
    console.error('Error in vendors API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
