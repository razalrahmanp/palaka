import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { data: account, error } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) throw error

    if (!account) {
      return NextResponse.json({
        success: false,
        error: 'Account not found'
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      data: account 
    })
  } catch (error) {
    console.error('Error fetching account:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch account' 
    }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const {
      account_name,
      account_type,
      account_subtype,
      normal_balance,
      parent_account_id,
      description,
      is_active
    } = body

    const { data: updatedAccount, error } = await supabaseAdmin
      .from('chart_of_accounts')
      .update({
        account_name,
        account_type,
        account_subtype,
        normal_balance,
        parent_account_id,
        description,
        is_active
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      data: updatedAccount 
    })
  } catch (error) {
    console.error('Error updating account:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update account' 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    // Check if account has transactions
    const { data: transactions, error: transError } = await supabaseAdmin
      .from('general_ledger')
      .select('id')
      .eq('account_id', params.id)
      .limit(1)

    if (transError) throw transError

    if (transactions && transactions.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete account with existing transactions'
      }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('chart_of_accounts')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete account' 
    }, { status: 500 })
  }
}
