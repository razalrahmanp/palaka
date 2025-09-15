import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase admin client for accounting operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch all withdrawals with partner and category details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')
    const categoryId = searchParams.get('category_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('withdrawals')
      .select(`
        *,
        partners (
          id,
          name,
          partner_type
        ),
        withdrawal_categories (
          id,
          category_name,
          description,
          chart_account_code
        ),
        withdrawal_subcategories (
          id,
          subcategory_name,
          description
        )
      `)
      .order('withdrawal_date', { ascending: false })

    // Apply filters
    if (partnerId) {
      query = query.eq('partner_id', partnerId)
    }
    
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }
    
    if (startDate) {
      query = query.gte('withdrawal_date', startDate)
    }
    
    if (endDate) {
      query = query.lte('withdrawal_date', endDate)
    }

    const { data: withdrawals, error } = await query

    if (error) {
      console.error('Error fetching withdrawals:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: withdrawals || []
    })
    
  } catch (error) {
    console.error('Error fetching withdrawals:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch withdrawals' 
      },
      { status: 500 }
    )
  }
}

// POST - Create a new withdrawal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      partner_id,
      category_id,
      subcategory_id,
      amount,
      withdrawal_date,
      description,
      payment_method,
      reference_number,
      notes,
      created_by
    } = body

    if (!partner_id || !category_id || !amount || !description) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Partner, category, amount, and description are required' 
        },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Withdrawal amount must be greater than 0' 
        },
        { status: 400 }
      )
    }

    // Verify partner exists and is active
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, is_active')
      .eq('id', partner_id)
      .eq('is_active', true)
      .single()

    if (partnerError || !partner) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Partner not found or inactive' 
        },
        { status: 404 }
      )
    }

    // Verify category exists and is active
    const { data: category, error: categoryError } = await supabase
      .from('withdrawal_categories')
      .select('id, category_name, is_active')
      .eq('id', category_id)
      .eq('is_active', true)
      .single()

    if (categoryError || !category) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Withdrawal category not found or inactive' 
        },
        { status: 404 }
      )
    }

    // Verify subcategory if provided
    if (subcategory_id) {
      const { data: subcategory, error: subcategoryError } = await supabase
        .from('withdrawal_subcategories')
        .select('id, subcategory_name, is_active')
        .eq('id', subcategory_id)
        .eq('category_id', category_id)
        .eq('is_active', true)
        .single()

      if (subcategoryError || !subcategory) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Withdrawal subcategory not found or does not belong to selected category' 
          },
          { status: 404 }
        )
      }
    }

    // 1. Validate and get a valid user ID
    let validUserId = created_by;
    
    // Check if created_by is a valid UUID format (36 characters with dashes)
    const isValidUuid = created_by && 
                       typeof created_by === 'string' && 
                       /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{3}-[0-9a-f]{12}$/i.test(created_by);
    
    // If valid UUID provided, verify it exists in users table
    if (isValidUuid) {
      const { data: userExists } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', created_by)
        .eq('is_deleted', false)
        .single();
        
      if (!userExists) {
        console.log('⚠️ Provided user ID not found in database, will use fallback user', { provided: created_by });
        validUserId = null; // Will be set to fallback user below
      } else {
        console.log('✅ Valid user ID provided and verified:', validUserId);
      }
    } else if (created_by) {
      // If created_by is provided but not a valid UUID
      console.log('⚠️ Invalid UUID format provided, will use fallback user', { provided: created_by });
      validUserId = null;
    } else {
      // If no created_by provided (frontend should send this)
      console.log('ℹ️ No created_by provided from frontend, will use fallback user');
      validUserId = null;
    }

    // For journal entries, we need a valid user (NOT NULL constraint)
    // If validUserId is null, find the first available user
    if (!validUserId) {
      console.log('🔍 Finding fallback user for journal entries (required field)...');
      
      const { data: fallbackUsers, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, name')
        .eq('is_deleted', false)
        .limit(1);
      
      if (!userError && fallbackUsers && fallbackUsers.length > 0) {
        validUserId = fallbackUsers[0].id;
        console.log('✅ Using fallback user for journal entries:', { id: validUserId, email: fallbackUsers[0].email });
      } else {
        // If no users found, return error - cannot create journal entries without a valid user
        return NextResponse.json({ 
          error: 'No valid users found in the system. Cannot create accounting entries. Please contact administrator.' 
        }, { status: 500 });
      }
    }

    // ACCOUNTING INTEGRATION: Check partner's equity balance before allowing withdrawal
    const partnerAccountCode = `3015-${partner_id}`;
    
    // Get partner's current equity balance
    const { data: partnerEquityAccount, error: equityError } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('id, account_code, account_name, current_balance')
      .eq('account_code', partnerAccountCode)
      .single();

    if (equityError || !partnerEquityAccount) {
      return NextResponse.json({
        success: false,
        error: `Partner equity account (${partnerAccountCode}) not found. Partner may not have made any investments yet.`
      }, { status: 404 });
    }

    // Validate sufficient balance for withdrawal
    const withdrawalAmount = parseFloat(amount);
    const currentBalance = parseFloat(partnerEquityAccount.current_balance) || 0;
    
    if (currentBalance < withdrawalAmount) {
      return NextResponse.json({
        success: false,
        error: `Insufficient equity balance. Partner has ₹${currentBalance.toLocaleString()} but withdrawal amount is ₹${withdrawalAmount.toLocaleString()}`
      }, { status: 400 });
    }

    // Insert new withdrawal
    const { data: newWithdrawal, error } = await supabase
      .from('withdrawals')
      .insert({
        partner_id,
        category_id,
        subcategory_id: subcategory_id || null,
        amount: parseFloat(amount),
        withdrawal_date: withdrawal_date || new Date().toISOString().split('T')[0],
        description,
        payment_method: payment_method || 'cash',
        reference_number: reference_number || null,
        notes: notes || null,
        created_by: validUserId
      })
      .select(`
        *,
        partners (
          id,
          name,
          partner_type
        ),
        withdrawal_categories (
          id,
          category_name,
          description,
          chart_account_code
        ),
        withdrawal_subcategories (
          id,
          subcategory_name,
          description
        )
      `)
      .single()

    if (error) {
      console.error('Error creating withdrawal:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 500 }
      )
    }
    
    // ACCOUNTING INTEGRATION: Create journal entries for withdrawal following partner creation pattern
    const transactionId = `WD-${newWithdrawal[0].id}`;
    
    // Get cash account (1010)
    const { data: cashAccount } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('id, account_code, account_name')
      .eq('account_code', '1010')
      .single();

    if (!cashAccount) {
      // Rollback withdrawal if cash account not found
      await supabase.from('withdrawals').delete().eq('id', newWithdrawal[0].id);
      return NextResponse.json({
        success: false,
        error: 'Cash account (1010) not found. Cannot process withdrawal.'
      }, { status: 500 });
    }

    // Get partner name for journal descriptions
    const { data: partnerInfo } = await supabase
      .from('partners')
      .select('name')
      .eq('id', partner_id)
      .single();

    const partnerName = partnerInfo?.name || 'Partner';

    // Create journal entry header first (following partner creation pattern)
    const { data: journalHeader, error: headerError } = await supabaseAdmin
      .from('journal_entries')
      .insert({
        entry_date: new Date().toISOString().split('T')[0],
        description: `Capital withdrawal by ${partnerName} - ${description}`,
        reference_number: transactionId,
        entry_type: 'STANDARD',
        status: 'POSTED',
        total_debit: withdrawalAmount,
        total_credit: withdrawalAmount,
        created_by: validUserId
      })
      .select('id')
      .single();

    if (headerError || !journalHeader) {
      console.error('Error creating journal entry header:', headerError);
      // Rollback withdrawal
      await supabase.from('withdrawals').delete().eq('id', newWithdrawal[0].id);
      return NextResponse.json({
        success: false,
        error: 'Failed to create journal entry header. Withdrawal cancelled.'
      }, { status: 500 });
    }

    // Create journal entry lines (following partner creation pattern)
    const journalLines = [
      {
        journal_entry_id: journalHeader.id,
        account_id: partnerEquityAccount.id,
        description: `Withdrawal by ${partnerName} - ${description || 'Capital withdrawal'}`,
        debit_amount: withdrawalAmount,
        credit_amount: 0
      },
      {
        journal_entry_id: journalHeader.id,
        account_id: cashAccount.id,
        description: `Cash outflow - Withdrawal by ${partnerName}`,
        debit_amount: 0,
        credit_amount: withdrawalAmount
      }
    ];

    const { error: linesError } = await supabaseAdmin
      .from('journal_entry_lines')
      .insert(journalLines);

    if (linesError) {
      console.error('Error creating journal entry lines:', linesError);
      // Rollback withdrawal and journal header
      await supabase.from('withdrawals').delete().eq('id', newWithdrawal[0].id);
      await supabaseAdmin.from('journal_entries').delete().eq('id', journalHeader.id);
      return NextResponse.json({
        success: false,
        error: 'Failed to create journal entry lines. Withdrawal cancelled.'
      }, { status: 500 });
    }

    // Update account balances (following partner creation pattern - direct table updates)
    const newPartnerBalance = currentBalance - withdrawalAmount;
    
    // Update partner equity account balance
    const { error: balanceError } = await supabaseAdmin
      .from('chart_of_accounts')
      .update({ 
        current_balance: newPartnerBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', partnerEquityAccount.id);

    if (balanceError) {
      console.error('Error updating partner equity balance:', balanceError);
      // Note: Continue without failing as journal entries are already created
    }

    // Update cash account balance (decrease cash)
    if (cashAccount) {
      const { data: currentCashData } = await supabaseAdmin
        .from('chart_of_accounts')
        .select('current_balance')
        .eq('id', cashAccount.id)
        .single();
      
      const currentCashBalance = parseFloat(currentCashData?.current_balance) || 0;
      const newCashBalance = currentCashBalance - withdrawalAmount;
      
      await supabaseAdmin
        .from('chart_of_accounts')
        .update({ 
          current_balance: newCashBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', cashAccount.id);
    }
    
    return NextResponse.json({
      success: true,
      data: newWithdrawal[0],
      accounting: {
        partner_account: partnerAccountCode,
        previous_balance: currentBalance,
        withdrawal_amount: withdrawalAmount,
        new_balance: newPartnerBalance
      },
      message: `Withdrawal of ₹${withdrawalAmount.toLocaleString()} recorded successfully. Partner equity balance updated.`
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating withdrawal:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create withdrawal' 
      },
      { status: 500 }
    )
  }
}

// PUT - Update an existing withdrawal
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id,
      partner_id,
      category_id,
      subcategory_id,
      amount,
      withdrawal_date,
      description,
      payment_method,
      reference_number,
      notes
    } = body

    if (!id || !partner_id || !category_id || !amount || !description) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID, partner, category, amount, and description are required' 
        },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Withdrawal amount must be greater than 0' 
        },
        { status: 400 }
      )
    }

    // Update withdrawal
    const { data: updatedWithdrawal, error } = await supabase
      .from('withdrawals')
      .update({
        partner_id,
        category_id,
        subcategory_id: subcategory_id || null,
        amount: parseFloat(amount),
        withdrawal_date,
        description,
        payment_method: payment_method || 'cash',
        reference_number: reference_number || null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        partners (
          id,
          name,
          partner_type
        ),
        withdrawal_categories (
          id,
          category_name,
          description,
          chart_account_code
        ),
        withdrawal_subcategories (
          id,
          subcategory_name,
          description
        )
      `)
      .single()

    if (error) {
      console.error('Error updating withdrawal:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: updatedWithdrawal,
      message: 'Withdrawal updated successfully'
    })
    
  } catch (error) {
    console.error('Error updating withdrawal:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update withdrawal' 
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete a withdrawal
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Withdrawal ID is required' 
        },
        { status: 400 }
      )
    }

    // Delete withdrawal
    const { data: deletedWithdrawal, error } = await supabase
      .from('withdrawals')
      .delete()
      .eq('id', id)
      .select('id, amount, description')
      .single()

    if (error) {
      console.error('Error deleting withdrawal:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: deletedWithdrawal,
      message: 'Withdrawal deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting withdrawal:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete withdrawal' 
      },
      { status: 500 }
    )
  }
}