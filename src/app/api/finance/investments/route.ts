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
      .from('investments')
      .select(`
        id, 
        amount, 
        investment_date, 
        description, 
        payment_method, 
        reference_number, 
        upi_reference, 
        created_at,
        investment_categories(
          id,
          category_name
        )
      `, { count: 'exact' })
      .order('investment_date', { ascending: false })

    // Add search filter if provided
    if (search) {
      query = query.or(`description.ilike.%${search}%,reference_number.ilike.%${search}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1)

    const { data: investments, error, count } = await query

    if (error) {
      console.error('Error fetching investments:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform the data to match the expected format
    const transformedInvestments = investments?.map(investment => ({
      id: investment.id,
      amount: investment.amount,
      date: investment.investment_date,
      description: investment.description,
      payment_method: investment.payment_method,
      reference_number: investment.reference_number,
      upi_reference: investment.upi_reference,
      created_at: investment.created_at,
      category: (investment.investment_categories as { category_name?: string } | null)?.category_name,
      category_id: (investment.investment_categories as { id?: number } | null)?.id
    })) || []

    return NextResponse.json({
      success: true,
      data: transformedInvestments,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    })

  } catch (error) {
    console.error('Unexpected error in investments API:', error)
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
      return NextResponse.json({ error: 'Investment ID is required' }, { status: 400 })
    }

    // Delete the investment
    const { error } = await supabaseAdmin
      .from('investments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting investment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Investment deleted successfully'
    })

  } catch (error) {
    console.error('Unexpected error in investment deletion:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, amount, investment_date, description, payment_method, reference_number, upi_reference, category_id } = body

    if (!id) {
      return NextResponse.json({ error: 'Investment ID is required' }, { status: 400 })
    }

    const newAmount = parseFloat(amount)
    if (isNaN(newAmount) || newAmount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
    }

    console.log('🔄 Starting investment update with related records:', id)

    // 1. Get the current investment to calculate difference
    const { data: currentInvestment, error: fetchError } = await supabaseAdmin
      .from('investments')
      .select('amount, investment_date, bank_account_id, partner_id')
      .eq('id', id)
      .single()

    if (fetchError || !currentInvestment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 })
    }

    const oldAmount = currentInvestment.amount
    const amountDifference = newAmount - oldAmount
    
    console.log('💰 Investment amount change:', { oldAmount, newAmount, difference: amountDifference })

    // 2. Update the investment record
    const updateData: Record<string, unknown> = {
      amount: newAmount,
      investment_date,
      description,
      payment_method,
      reference_number,
      upi_reference,
      updated_at: new Date().toISOString()
    }
    
    // Only include category_id if it's a valid number
    if (category_id && !isNaN(parseInt(category_id))) {
      updateData.category_id = parseInt(category_id)
    }

    const { data: updatedInvestment, error: updateError } = await supabaseAdmin
      .from('investments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating investment:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 3. Update related bank transaction if it exists
    if (currentInvestment.bank_account_id && amountDifference !== 0 && payment_method !== 'cash') {
      console.log('🏦 Updating bank transaction for bank account:', currentInvestment.bank_account_id)
      
      // Find the related bank transaction (investments create deposits)
      const { data: bankTransaction } = await supabaseAdmin
        .from('bank_transactions')
        .select('id, amount')
        .eq('bank_account_id', currentInvestment.bank_account_id)
        .eq('date', currentInvestment.investment_date)
        .eq('type', 'deposit')
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
            date: investment_date,
            description: `Investment: ${description}` 
          })
          .eq('id', bankTransaction.id)

        // Update bank account balance (investments increase balance)
        const { data: bankAccount, error: bankError } = await supabaseAdmin
          .from('bank_accounts')
          .select('current_balance')
          .eq('id', currentInvestment.bank_account_id)
          .single()

        if (!bankError && bankAccount) {
          // Adjust balance by the difference (add additional amount or subtract reduced amount)
          const newBalance = (bankAccount.current_balance || 0) + amountDifference
          await supabaseAdmin
            .from('bank_accounts')
            .update({ current_balance: newBalance })
            .eq('id', currentInvestment.bank_account_id)
          
          console.log('✅ Updated bank balance by', amountDifference)
        }
      }
    }

    // 4. Update partner equity account balance if partner is involved
    if (currentInvestment.partner_id && amountDifference !== 0) {
      console.log('👥 Updating partner equity account')
      
      const partnerAccountCode = `3015-${currentInvestment.partner_id.toString()}`
      const { data: partnerAccount } = await supabaseAdmin
        .from('chart_of_accounts')
        .select('id, current_balance')
        .eq('account_code', partnerAccountCode)
        .single()

      if (partnerAccount) {
        const newPartnerBalance = (partnerAccount.current_balance || 0) + amountDifference
        await supabaseAdmin
          .from('chart_of_accounts')
          .update({ current_balance: newPartnerBalance })
          .eq('id', partnerAccount.id)
        
        console.log('✅ Updated partner equity balance by', amountDifference)
      }
    }

    // 5. Journal entry updates would go here
    // Note: This requires complex reversal and recreation logic
    // For now, this is a known limitation that should be addressed in future updates
    
    console.log('✅ Investment update completed successfully')
    console.log('⚠️ Note: Journal entry updates not implemented - manual reconciliation may be needed')

    return NextResponse.json({
      success: true,
      data: updatedInvestment,
      message: 'Investment and related records updated successfully'
    })

  } catch (error) {
    console.error('Unexpected error in investment update:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}