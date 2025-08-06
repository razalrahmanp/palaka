import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    const { data: accounts, error } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('*')
      .order('account_code')

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      data: accounts 
    })
  } catch (error) {
    console.error('Error fetching chart of accounts:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch chart of accounts' 
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      account_code,
      account_name,
      account_type,
      account_subtype,
      normal_balance,
      parent_account_id,
      description,
      is_active = true
    } = body

    // Validate required fields
    if (!account_code || !account_name || !account_type || !normal_balance) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    // Check if account code already exists
    const { data: existingAccount, error: checkError } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('id')
      .eq('account_code', account_code)
      .single()

    if (existingAccount) {
      return NextResponse.json({
        success: false,
        error: 'Account code already exists'
      }, { status: 400 })
    }

    const { data: newAccount, error } = await supabaseAdmin
      .from('chart_of_accounts')
      .insert({
        account_code,
        account_name,
        account_type,
        account_subtype,
        normal_balance,
        parent_account_id,
        description,
        is_active
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      data: newAccount 
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create account' 
    }, { status: 500 })
  }
}
