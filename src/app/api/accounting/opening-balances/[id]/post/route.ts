import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get user ID (implement based on your auth system)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update opening balance status to POSTED
    const { data, error } = await supabase
      .from('opening_balances')
      .update({ 
        status: 'POSTED',
        posted_by: user.id,
        posted_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        debit_account:debit_account_id(account_code, account_name),
        credit_account:credit_account_id(account_code, account_name)
      `)
      .single()

    if (error) {
      console.error('Error posting opening balance:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // The database trigger will automatically create the journal entry
    return NextResponse.json({ 
      data,
      message: 'Opening balance posted successfully. Journal entry created automatically.'
    })
  } catch (error) {
    console.error('Error in post opening balance API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
