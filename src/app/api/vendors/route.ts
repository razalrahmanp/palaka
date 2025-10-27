import { supabase } from '@/lib/supabasePool'
import { NextRequest, NextResponse } from 'next/server'
import { createCachedResponse, getCachedData, setCachedData } from '@/lib/cache'
import { PerformanceMonitor } from '@/lib/performance'

export async function GET(request: NextRequest) {
  return PerformanceMonitor.measureAsync('vendors-list', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const includeOutstanding = searchParams.get('include_outstanding') === 'true'
      const refresh = searchParams.get('refresh') === 'true'
      const timestamp = searchParams.get('_t')
      const bypassCache = refresh || !!timestamp
      
      console.log('🏪 Fetching vendors...', {
        refresh,
        timestamp,
        bypassCache,
        includeOutstanding
      });
      
      // Create cache key
      const cacheKey = `vendors-list-${includeOutstanding ? 'with-outstanding' : 'basic'}`
      
      // Check cache first (only if not bypassing)
      if (!bypassCache) {
        const cachedData = getCachedData(cacheKey)
        if (cachedData) {
          console.log('📦 Cache hit for vendors list')
          return createCachedResponse(cachedData, { cacheKey })
        }
      } else {
        console.log('🔄 Bypassing cache for fresh vendor data from database')
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

    // Cache the result (only if not bypassing cache)
    const responseData = {
      success: true,
      vendors: result || [],
      total: result?.length || 0
    }
    
    if (!bypassCache) {
      setCachedData(cacheKey, responseData, 300) // Cache for 5 minutes
      return createCachedResponse(responseData, { cacheKey, ttl: 300 })
    } else {
      // Return fresh data with cache-busting headers
      const response = NextResponse.json(responseData)
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      return response
    }

  } catch (error) {
    console.error('Error in vendors API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  })
}
