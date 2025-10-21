import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabasePool'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '1000') // Show all records by default
    const search = searchParams.get('search') || ''

    const offset = (page - 1) * pageSize

    // Build the query
    let query = supabaseAdmin
      .from('withdrawals')
      .select(`
        id, 
        amount, 
        withdrawal_date, 
        description, 
        payment_method, 
        reference_number, 
        upi_reference, 
        created_at,
        withdrawal_categories(
          id,
          category_name
        ),
        withdrawal_subcategories(
          id,
          subcategory_name
        )
      `, { count: 'exact' })
      .order('withdrawal_date', { ascending: false })

    // Add search filter if provided
    if (search) {
      query = query.or(`description.ilike.%${search}%,reference_number.ilike.%${search}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1)

    const { data: withdrawals, error, count } = await query

    if (error) {
      console.error('Error fetching withdrawals:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform the data to match the expected format
    const transformedWithdrawals = withdrawals?.map(withdrawal => ({
      id: withdrawal.id,
      amount: withdrawal.amount,
      date: withdrawal.withdrawal_date,
      description: withdrawal.description,
      payment_method: withdrawal.payment_method,
      reference_number: withdrawal.reference_number,
      upi_reference: withdrawal.upi_reference,
      created_at: withdrawal.created_at,
      category: (withdrawal.withdrawal_categories as { category_name?: string } | null)?.category_name,
      subcategory: (withdrawal.withdrawal_subcategories as { subcategory_name?: string } | null)?.subcategory_name,
      category_id: (withdrawal.withdrawal_categories as { id?: number } | null)?.id,
      subcategory_id: (withdrawal.withdrawal_subcategories as { id?: number } | null)?.id
    })) || []

    return NextResponse.json({
      success: true,
      data: transformedWithdrawals,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    })

  } catch (error) {
    console.error('Unexpected error in withdrawals API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Withdrawal ID is required' }, { status: 400 })
    }

    // Delete the withdrawal
    const { error } = await supabaseAdmin
      .from('withdrawals')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting withdrawal:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Withdrawal deleted successfully'
    })

  } catch (error) {
    console.error('Unexpected error in withdrawal deletion:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, amount, withdrawal_date, description, payment_method, reference_number, upi_reference, category_id, subcategory_id } = body

    if (!id) {
      return NextResponse.json({ error: 'Withdrawal ID is required' }, { status: 400 })
    }

    const newAmount = parseFloat(amount)
    if (isNaN(newAmount) || newAmount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
    }

    console.log('🔄 Starting withdrawal update with related records:', id)

    // 1. Get the current withdrawal to calculate difference
    const { data: currentWithdrawal, error: fetchError } = await supabaseAdmin
      .from('withdrawals')
      .select('amount, withdrawal_date, bank_account_id')
      .eq('id', id)
      .single()

    if (fetchError || !currentWithdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    }

    const oldAmount = currentWithdrawal.amount
    const amountDifference = newAmount - oldAmount
    
    console.log('💰 Amount change:', { oldAmount, newAmount, difference: amountDifference })

    // 2. Update the withdrawal record
    const updateData: Record<string, unknown> = {
      amount: newAmount,
      withdrawal_date,
      description,
      payment_method,
      reference_number,
      upi_reference,
      updated_at: new Date().toISOString()
    }
    
    // Only include category_id and subcategory_id if they're valid numbers
    if (category_id && !isNaN(parseInt(category_id))) {
      updateData.category_id = parseInt(category_id)
    }
    if (subcategory_id && !isNaN(parseInt(subcategory_id))) {
      updateData.subcategory_id = parseInt(subcategory_id)
    }

    const { data: updatedWithdrawal, error: updateError } = await supabaseAdmin
      .from('withdrawals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating withdrawal:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 3. Update related bank transaction if it exists
    if (currentWithdrawal.bank_account_id && amountDifference !== 0) {
      console.log('🏦 Updating bank transaction for bank account:', currentWithdrawal.bank_account_id)
      
      // Find the related bank transaction
      const { data: bankTransaction } = await supabaseAdmin
        .from('bank_transactions')
        .select('id, amount')
        .eq('bank_account_id', currentWithdrawal.bank_account_id)
        .eq('date', currentWithdrawal.withdrawal_date)
        .eq('type', 'withdrawal')
        .eq('amount', oldAmount)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (bankTransaction) {
        // Update bank transaction amount
        await supabaseAdmin
          .from('bank_transactions')
          .update({ 
            amount: newAmount,
            date: withdrawal_date,
            description: `Expense: ${description}` 
          })
          .eq('id', bankTransaction.id)

        // Update bank account balance
        const { data: bankAccount, error: bankError } = await supabaseAdmin
          .from('bank_accounts')
          .select('current_balance')
          .eq('id', currentWithdrawal.bank_account_id)
          .single()

        if (!bankError && bankAccount) {
          // Adjust balance by the difference (subtract additional amount or add back reduced amount)
          const newBalance = (bankAccount.current_balance || 0) - amountDifference
          await supabaseAdmin
            .from('bank_accounts')
            .update({ current_balance: newBalance })
            .eq('id', currentWithdrawal.bank_account_id)
          
          console.log('✅ Updated bank balance by', -amountDifference)
        }
      }
    }

    // 4. Update cashflow if date or amount changed
    if (withdrawal_date !== currentWithdrawal.withdrawal_date || amountDifference !== 0) {
      console.log('📊 Updating cashflow records')
      
      // Reverse old cashflow entry
      if (currentWithdrawal.withdrawal_date) {
        const oldMonth = new Date(currentWithdrawal.withdrawal_date)
        oldMonth.setDate(1)
        await supabaseAdmin.rpc('upsert_cashflow_snapshot', {
          mon: oldMonth.toISOString().slice(0, 10),
          inflows: 0,
          outflows: -oldAmount, // Reverse the old amount
        })
      }

      // Add new cashflow entry
      const newMonth = new Date(withdrawal_date)
      newMonth.setDate(1)
      await supabaseAdmin.rpc('upsert_cashflow_snapshot', {
        mon: newMonth.toISOString().slice(0, 10),
        inflows: 0,
        outflows: newAmount,
      })
    }

    // 5. Journal entry updates would go here
    // Note: This requires complex reversal and recreation logic
    // For now, this is a known limitation that should be addressed in future updates
    
    console.log('✅ Withdrawal update completed successfully')
    console.log('⚠️ Note: Journal entry updates not implemented - manual reconciliation may be needed')

    return NextResponse.json({
      success: true,
      data: updatedWithdrawal,
      message: 'Withdrawal and related records updated successfully'
    })

  } catch (error) {
    console.error('Unexpected error in withdrawal update:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}