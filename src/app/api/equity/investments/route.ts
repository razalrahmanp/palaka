import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch all investments
export async function GET() {
  try {
    const { data: investments, error } = await supabase
      .from('investments')
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
      console.error('Error fetching investments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      investments: investments || [],
      data: investments || []
    });
  } catch (error) {
    console.error('Error in investments GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new investment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      partner_id, 
      amount, 
      investment_date = new Date().toISOString().split('T')[0],
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

    const investmentAmount = parseFloat(amount);

    // Validate partner exists
    const { data: partner } = await supabase
      .from('partners')
      .select('id, name')
      .eq('id', partner_id)
      .single();

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
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

    // Create investment record
    const { data: investment, error: investmentError } = await supabase
      .from('investments')
      .insert({
        partner_id: partner_id,
        amount: investmentAmount,
        investment_date: investment_date,
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

    if (investmentError) {
      console.error('Error creating investment:', investmentError);
      return NextResponse.json({ error: investmentError.message }, { status: 500 });
    }

    // Create accounting entries following the exact partner creation pattern
    try {
      // 1. Create or get individual partner equity account in chart of accounts
      const partnerAccountCode = `3015-${partner_id.toString()}`;
      const { data: existingAccount } = await supabase
        .from('chart_of_accounts')
        .select('id, current_balance')
        .eq('account_code', partnerAccountCode)
        .single();

      let partnerAccountId;
      
      if (!existingAccount) {
        // Create new equity account for this partner (same as partner creation)
        const { data: newAccount, error: accountError } = await supabase
          .from('chart_of_accounts')
          .insert({
            account_code: partnerAccountCode,
            account_name: `${partner.name} - Partner Equity`,
            account_type: 'EQUITY',
            account_subtype: 'CAPITAL',
            description: `Equity account for partner ${partner.name}`,
            is_active: true,
            normal_balance: 'CREDIT',
            current_balance: investmentAmount,
            opening_balance: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (accountError) {
          console.error('Error creating partner equity account:', accountError);
          // Continue without failing the investment creation
        } else {
          partnerAccountId = newAccount?.id;
        }
      } else {
        partnerAccountId = existingAccount.id;
        
        // Update existing account balance (add to current balance)
        const currentBalance = parseFloat(existingAccount.current_balance) || 0;
        const newBalance = currentBalance + investmentAmount;
        await supabase
          .from('chart_of_accounts')
          .update({
            current_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', partnerAccountId);
      }

      // 2. Get Cash account (1010) for the debit side
      const { data: cashAccount } = await supabase
        .from('chart_of_accounts')
        .select('id, current_balance')
        .eq('account_code', '1010')
        .single();

      // 3. Create journal entry for investment (same pattern as partner creation)
      if (partnerAccountId && cashAccount?.id) {
        const journalNumber = `JE-INV-${Date.now()}`;
        
        const { data: journalEntry, error: journalError } = await supabase
          .from('journal_entries')
          .insert({
            journal_number: journalNumber,
            entry_date: investment_date,
            description: `Investment by partner ${partner.name}`,
            entry_type: 'STANDARD',
            status: 'POSTED',
            total_debit: investmentAmount,
            total_credit: investmentAmount,
            source_document_type: 'PARTNER_INVESTMENT',
            reference_number: `INV-${investment.id}`,
            created_by: validUserId,
            created_at: new Date().toISOString(),
            posted_at: new Date().toISOString(),
            notes: `Partner ${partner.name} investment of ₹${investmentAmount}`
          })
          .select('id')
          .single();

        if (journalError) {
          console.error('Error creating journal entry:', journalError);
        } else if (journalEntry?.id) {
          // 4. Create journal entry lines (Debit Cash, Credit Partner Equity) - same as partner creation
          const journalLines = [
            {
              journal_entry_id: journalEntry.id,
              line_number: 1,
              account_id: cashAccount.id,
              description: `Cash received from ${partner.name}`,
              debit_amount: investmentAmount,
              credit_amount: 0,
              reference: `Partner Investment - ${partner.name}`
            },
            {
              journal_entry_id: journalEntry.id,
              line_number: 2,
              account_id: partnerAccountId,
              description: `Investment by ${partner.name}`,
              debit_amount: 0,
              credit_amount: investmentAmount,
              reference: `Partner Equity - ${partner.name}`
            }
          ];

          const { error: linesError } = await supabase
            .from('journal_entry_lines')
            .insert(journalLines);

          if (linesError) {
            console.error('Error creating journal entry lines:', linesError);
          }

          // 5. Update Cash account balance (same as partner creation)
          const currentCashBalance = parseFloat(cashAccount.current_balance) || 0;
          const newCashBalance = currentCashBalance + investmentAmount;
          
          await supabase
            .from('chart_of_accounts')
            .update({
              current_balance: newCashBalance,
              updated_at: new Date().toISOString()
            })
            .eq('id', cashAccount.id);

          // 6. Update investment record with journal entry reference
          await supabase
            .from('investments')
            .update({
              journal_entry_id: journalEntry.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', investment.id);

          // 7. Update partner's total investment amount in partners table
          try {
            // Get current partner data
            const { data: currentPartner } = await supabase
              .from('partners')
              .select('initial_investment')
              .eq('id', partner_id)
              .single();

            if (currentPartner) {
              const currentTotal = parseFloat(currentPartner.initial_investment) || 0;
              const newTotal = currentTotal + investmentAmount;
              
              await supabase
                .from('partners')
                .update({
                  initial_investment: newTotal,
                  updated_at: new Date().toISOString()
                })
                .eq('id', partner_id);

              console.log(`✅ Updated partner ${partner.name} total investment: ₹${currentTotal} → ₹${newTotal}`);
            }
          } catch (partnerUpdateError) {
            console.error('Error updating partner investment total:', partnerUpdateError);
            // Don't fail the investment creation
          }
        }
      }
    } catch (accountingError) {
      console.error('Error creating accounting entries:', accountingError);
      // Don't fail investment creation if accounting fails - log it for manual correction
      console.log(`⚠️ Investment ${investment.id} created but accounting entries may be incomplete`);
    }

    return NextResponse.json({
      success: true,
      investment,
      message: 'Investment created successfully with accounting entries'
    });
  } catch (error) {
    console.error('Error in investments POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}