import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseAdmin'

interface SupplierPayment {
  supplier_id: string
  amount: number
  payment_date: string
  payment_method: string
  reference_number?: string
  description?: string
}

export async function POST(req: NextRequest) {
  try {
    const payment: SupplierPayment = await req.json()

    console.log('📝 Processing supplier payment:', payment)

    // 1. Record the payment in supplier_payments table
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('supplier_payments')
      .insert({
        supplier_id: payment.supplier_id,
        amount: payment.amount,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        reference_number: payment.reference_number,
        description: payment.description,
        status: 'COMPLETED'
      })
      .select()
      .single()

    if (paymentError) {
      console.error('❌ Payment record error:', paymentError)
      throw new Error(`Failed to record payment: ${paymentError.message}`)
    }

    // 2. Create journal entry for the payment
    const journalEntry = {
      journal_number: `PAY-${payment.supplier_id.substring(0, 8)}-${Date.now()}`,
      entry_date: payment.payment_date,
      reference_number: payment.reference_number || `PAY-${paymentRecord.id}`,
      description: payment.description || `Payment to supplier`,
      entry_type: 'PAYMENT',
      status: 'POSTED'
    }

    const { data: journalData, error: journalError } = await supabase
      .from('journal_entries')
      .insert(journalEntry)
      .select()
      .single()

    if (journalError) {
      console.error('❌ Journal entry error:', journalError)
      throw new Error(`Failed to create journal entry: ${journalError.message}`)
    }

    // 3. Get or create accounts
    let { data: payableAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('account_code', '2100')
      .single()

    let { data: cashAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('account_code', '1100')
      .single()

    // Create accounts if they don't exist
    if (!payableAccount) {
      const { data: newAccount } = await supabase
        .from('chart_of_accounts')
        .insert({
          account_code: '2100',
          account_name: 'Accounts Payable',
          account_type: 'LIABILITY',
          account_subtype: 'CURRENT_LIABILITY',
          normal_balance: 'CREDIT',
          description: 'Money owed to suppliers'
        })
        .select()
        .single()
      payableAccount = newAccount
    }

    if (!cashAccount) {
      const { data: newAccount } = await supabase
        .from('chart_of_accounts')
        .insert({
          account_code: '1100',
          account_name: 'Cash',
          account_type: 'ASSET',
          account_subtype: 'CURRENT_ASSET',
          normal_balance: 'DEBIT',
          description: 'Cash and cash equivalents'
        })
        .select()
        .single()
      cashAccount = newAccount
    }

    // 4. Create journal entry lines (only if both accounts exist)
    if (payableAccount && cashAccount) {
      const lines = [
        {
          journal_entry_id: journalData.id,
          line_number: 1,
          account_id: payableAccount.id,
          description: `Payment to supplier - ${payment.description}`,
          debit_amount: payment.amount,
          credit_amount: 0
        },
        {
          journal_entry_id: journalData.id,
          line_number: 2,
          account_id: cashAccount.id,
          description: `Cash payment - ${payment.description}`,
          debit_amount: 0,
          credit_amount: payment.amount
        }
      ]

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines)

      if (linesError) {
        console.error('❌ Lines error:', linesError)
        throw new Error(`Failed to create journal lines: ${linesError.message}`)
      }

      // 5. Update journal entry totals
      await supabase
        .from('journal_entries')
        .update({
          total_debit: payment.amount,
          total_credit: payment.amount,
          posted_at: new Date().toISOString()
        })
        .eq('id', journalData.id)
    }

    // 6. Update account balances
    if (payableAccount) {
      const { data: currentBalance } = await supabase
        .from('chart_of_accounts')
        .select('current_balance')
        .eq('id', payableAccount.id)
        .single()

      await supabase
        .from('chart_of_accounts')
        .update({
          current_balance: (currentBalance?.current_balance || 0) - payment.amount
        })
        .eq('id', payableAccount.id)
    }

    if (cashAccount) {
      const { data: currentBalance } = await supabase
        .from('chart_of_accounts')
        .select('current_balance')
        .eq('id', cashAccount.id)
        .single()

      await supabase
        .from('chart_of_accounts')
        .update({
          current_balance: (currentBalance?.current_balance || 0) - payment.amount
        })
        .eq('id', cashAccount.id)
    }

    console.log('✅ Supplier payment processed successfully')

    return NextResponse.json({
      success: true,
      data: {
        payment_id: paymentRecord.id,
        journal_entry_id: journalData.id,
        amount: payment.amount
      }
    })

  } catch (error) {
    console.error('❌ Error processing supplier payment:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const supplierId = searchParams.get('supplier_id')

    let query = supabase
      .from('supplier_payments')
      .select(`
        *,
        suppliers (
          name
        )
      `)
      .order('payment_date', { ascending: false })

    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Error fetching supplier payments:', error)
      throw new Error(`Failed to fetch payments: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('❌ Error in supplier payments GET:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
