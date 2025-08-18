import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const balanceType = searchParams.get('balance_type')

    // Get account mapping for the specified balance type
    const { data, error } = await supabase
      .from('opening_balance_account_mapping')
      .select('*')
      .eq('balance_type', balanceType || '')
      .single()

    if (error) {
      console.error('Error fetching account mapping:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ mapping: data })
  } catch (error) {
    console.error('Error in account mapping API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
