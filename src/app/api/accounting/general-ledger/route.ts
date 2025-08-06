import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const accountId = searchParams.get('accountId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const reference = searchParams.get('reference')

    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('general_ledger')
      .select(`
        *,
        chart_of_accounts (
          account_code,
          account_name,
          account_type,
          normal_balance
        ),
        journal_entries (
          journal_number,
          reference_number,
          description
        )
      `)
      .order('transaction_date', { ascending: false })
      .order('id', { ascending: false })

    // Apply filters
    if (accountId) {
      query = query.eq('account_id', accountId)
    }
    if (startDate) {
      query = query.gte('transaction_date', startDate)
    }
    if (endDate) {
      query = query.lte('transaction_date', endDate)
    }
    if (reference) {
      query = query.ilike('reference', `%${reference}%`)
    }

    const { data: entries, error } = await query
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('general_ledger')
      .select('*', { count: 'exact', head: true })

    if (accountId) countQuery = countQuery.eq('account_id', accountId)
    if (startDate) countQuery = countQuery.gte('transaction_date', startDate)
    if (endDate) countQuery = countQuery.lte('transaction_date', endDate)
    if (reference) countQuery = countQuery.ilike('reference', `%${reference}%`)

    const { count, error: countError } = await countQuery

    if (countError) throw countError

    return NextResponse.json({
      success: true,
      data: {
        entries,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    })
  } catch (error) {
    console.error('Error fetching general ledger:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch general ledger'
    }, { status: 500 })
  }
}
