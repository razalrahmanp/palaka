import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch all withdrawals
export async function GET() {
  try {
    const { data: withdrawals, error } = await supabase
      .from('withdrawals')
      .select(`
        *,
        partners!inner(
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching withdrawals:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      withdrawals: withdrawals || [],
      data: withdrawals || []
    });
  } catch (error) {
    console.error('Error in withdrawals GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new withdrawal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      partner_id, 
      amount, 
      withdrawal_date = new Date().toISOString().split('T')[0],
      description = '', 
      payment_method = 'cash',
      bank_account_id = null,
      reference_number = '',
      upi_reference = '',
      notes = '',
      created_by
    } = body;

    // Validation
    if (!partner_id) {
      return NextResponse.json({ error: 'Partner ID is required' }, { status: 400 });
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Amount is required and must be a positive number' }, { status: 400 });
    }

    const withdrawalAmount = parseFloat(amount);

    // Validate partner exists
    const { data: partner } = await supabase
      .from('partners')
      .select('id, name, initial_investment')
      .eq('id', partner_id)
      .single();

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Check if partner has sufficient equity balance
    const currentInvestment = parseFloat(partner.initial_investment) || 0;
    if (currentInvestment < withdrawalAmount) {
      return NextResponse.json({ 
        error: `Insufficient equity balance. Available: ₹${currentInvestment}, Requested: ₹${withdrawalAmount}` 
      }, { status: 400 });
    }

    // 1. Validate and get a valid user ID following partner creation pattern
    let validUserId = created_by;
    
    // Check if created_by is a valid UUID format (36 characters with dashes)
    const isValidUuid = created_by && 
                       typeof created_by === 'string' && 
                       /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(created_by);
    
    // If valid UUID provided, verify it exists in users table
    if (isValidUuid) {
      const { data: userExists } = await supabase
        .from('users')
        .select('id')
        .eq('id', created_by)
        .eq('is_deleted', false)
        .single();
        
      if (!userExists) {
        console.log('⚠️ Provided user ID not found in database, will use fallback user', { provided: created_by });
        validUserId = null;
      } else {
        console.log('✅ Valid user ID provided and verified:', validUserId);
      }
    } else if (created_by) {
      console.log('⚠️ Invalid UUID format provided, will use fallback user', { provided: created_by });
      validUserId = null;
    } else {
      console.log('ℹ️ No created_by provided from frontend, will use fallback user');
      validUserId = null;
    }

    // For journal entries, we need a valid user (NOT NULL constraint)
    if (!validUserId) {
      console.log('🔍 Finding fallback user for journal entries (required field)...');
      
      const { data: fallbackUsers, error: userError } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('is_deleted', false)
        .limit(1);
      
      if (!userError && fallbackUsers && fallbackUsers.length > 0) {
        validUserId = fallbackUsers[0].id;
        console.log('✅ Using fallback user for journal entries:', { id: validUserId, email: fallbackUsers[0].email });
      } else {
        return NextResponse.json({ 
          error: 'No valid users found in the system. Cannot create accounting entries. Please contact administrator.' 
        }, { status: 500 });
      }
    }

    // Create withdrawal record
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawals')
      .insert({
        partner_id: partner_id,
        amount: withdrawalAmount,
        withdrawal_date: withdrawal_date,
        description: description?.trim() || '',
        payment_method: payment_method || 'cash',
        bank_account_id: bank_account_id,
        reference_number: reference_number?.trim() || '',
        upi_reference: upi_reference?.trim() || '',
        notes: notes?.trim() || '',
        created_by: validUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (withdrawalError) {
      console.error('Error creating withdrawal:', withdrawalError);
      return NextResponse.json({ error: withdrawalError.message }, { status: 500 });
    }

    // Create accounting entries following the exact partner creation pattern
    // For withdrawal: Debit Partner Equity (decrease), Credit Cash (decrease)
    try {
      // 1. Get partner equity account (should exist from previous investments)
      const partnerAccountCode = `3015-${partner_id.toString()}`;
      const { data: existingAccount } = await supabase
        .from('chart_of_accounts')
        .select('id, current_balance')
        .eq('account_code', partnerAccountCode)
        .single();

      let partnerAccountId;
      
      if (!existingAccount) {
        return NextResponse.json({ 
          error: 'Partner equity account not found. Partner must make an investment first.' 
        }, { status: 400 });
      } else {
        partnerAccountId = existingAccount.id;
        
        // Update existing account balance (subtract withdrawal amount)
        const currentBalance = parseFloat(existingAccount.current_balance) || 0;
        const newBalance = currentBalance - withdrawalAmount;
        await supabase
          .from('chart_of_accounts')
          .update({
            current_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', partnerAccountId);
      }

      // 2. Get Cash account (1010) for the credit side
      const { data: cashAccount } = await supabase
        .from('chart_of_accounts')
        .select('id, current_balance')
        .eq('account_code', '1010')
        .single();

      // 3. Create journal entry for withdrawal (opposite of investment)
      if (partnerAccountId && cashAccount?.id) {
        const journalNumber = `JE-WDL-${Date.now()}`;
        
        const { data: journalEntry, error: journalError } = await supabase
          .from('journal_entries')
          .insert({
            journal_number: journalNumber,
            entry_date: withdrawal_date,
            description: `Withdrawal by partner ${partner.name}`,
            entry_type: 'STANDARD',
            status: 'POSTED',
            total_debit: withdrawalAmount,
            total_credit: withdrawalAmount,
            source_document_type: 'PARTNER_WITHDRAWAL',
            reference_number: `WDL-${withdrawal.id}`,
            created_by: validUserId,
            created_at: new Date().toISOString(),
            posted_at: new Date().toISOString(),
            notes: `Partner ${partner.name} withdrawal of ₹${withdrawalAmount}`
          })
          .select('id')
          .single();

        if (journalError) {
          console.error('Error creating journal entry:', journalError);
        } else if (journalEntry?.id) {
          // 4. Create journal entry lines (Debit Partner Equity, Credit Cash) - opposite of investment
          const journalLines = [
            {
              journal_entry_id: journalEntry.id,
              line_number: 1,
              account_id: partnerAccountId,
              description: `Withdrawal by ${partner.name}`,
              debit_amount: withdrawalAmount,
              credit_amount: 0,
              reference: `Partner Withdrawal - ${partner.name}`
            },
            {
              journal_entry_id: journalEntry.id,
              line_number: 2,
              account_id: cashAccount.id,
              description: `Cash paid to ${partner.name}`,
              debit_amount: 0,
              credit_amount: withdrawalAmount,
              reference: `Partner Equity - ${partner.name}`
            }
          ];

          const { error: linesError } = await supabase
            .from('journal_entry_lines')
            .insert(journalLines);

          if (linesError) {
            console.error('Error creating journal entry lines:', linesError);
          }

          // 5. Update Cash account balance (decrease cash)
          const currentCashBalance = parseFloat(cashAccount.current_balance) || 0;
          const newCashBalance = currentCashBalance - withdrawalAmount;
          
          await supabase
            .from('chart_of_accounts')
            .update({
              current_balance: newCashBalance,
              updated_at: new Date().toISOString()
            })
            .eq('id', cashAccount.id);

          // 6. Update withdrawal record with journal entry reference
          await supabase
            .from('withdrawals')
            .update({
              journal_entry_id: journalEntry.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', withdrawal.id);

          // 7. Update partner's total investment amount in partners table (decrease)
          try {
            const newTotal = currentInvestment - withdrawalAmount;
            
            await supabase
              .from('partners')
              .update({
                initial_investment: newTotal,
                updated_at: new Date().toISOString()
              })
              .eq('id', partner_id);

            console.log(`✅ Updated partner ${partner.name} total investment: ₹${currentInvestment} → ₹${newTotal}`);
          } catch (partnerUpdateError) {
            console.error('Error updating partner investment total:', partnerUpdateError);
            // Don't fail the withdrawal creation
          }
        }
      }
    } catch (accountingError) {
      console.error('Error creating accounting entries:', accountingError);
      // Don't fail withdrawal creation if accounting fails - log it for manual correction
      console.log(`⚠️ Withdrawal ${withdrawal.id} created but accounting entries may be incomplete`);
    }

    return NextResponse.json({
      success: true,
      withdrawal,
      message: 'Withdrawal created successfully with accounting entries'
    });
  } catch (error) {
    console.error('Error in withdrawals POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}