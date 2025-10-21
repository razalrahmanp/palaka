import { supabase } from '@/lib/supabasePool'
import { NextRequest, NextResponse } from 'next/server'
import { createCachedResponse, getCachedData, setCachedData } from '@/lib/cache'
import { PerformanceMonitor } from '@/lib/performance'

export async function GET(request: NextRequest) {
  return PerformanceMonitor.measureAsync('vendors-list', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const includeOutstanding = searchParams.get('include_outstanding') === 'true'
      
      // Create cache key
      const cacheKey = `vendors-list-${includeOutstanding ? 'with-outstanding' : 'basic'}`
      
      // Check cache first
      const cachedData = getCachedData(cacheKey)
      if (cachedData) {
        console.log('📦 Cache hit for vendors list')
        return createCachedResponse(cachedData, { cacheKey })
      }

      // Get vendors/suppliers list
      const { data: vendors, error } = await supabase
        .from('suppliers')
        .select('id, name, contact, email, address, created_at')
        .order('name')
        .limit(100) // Limit for performance

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

    // Cache the result
    const responseData = {
      success: true,
      vendors: result || [],
      total: result?.length || 0
    }
    
    setCachedData(cacheKey, responseData, 300) // Cache for 5 minutes
    
    return createCachedResponse(responseData, { cacheKey, ttl: 300 })

  } catch (error) {
    console.error('Error in vendors API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  })
}
