import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch all investors
export async function GET() {
  try {
    const { data: investors, error } = await supabase
      .from('partners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching investors:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      investors: investors || [],
      data: investors || []
    });
  } catch (error) {
    console.error('Error in investors GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new investor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      email, 
      phone, 
      partner_type = 'partner', 
      initial_investment = 0, 
      equity_percentage = 0, 
      is_active = true, 
      notes,
      created_by // User ID from Redux state (current logged-in user)
    } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required and must be a non-empty string' }, { status: 400 });
    }

    // 1. Validate and get a valid user ID 
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
      
      const { data: fallbackUsers, error: userError } = await supabase
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

    // Validate equity percentage
    if (equity_percentage < 0 || equity_percentage > 100) {
      return NextResponse.json({ error: 'Equity percentage must be between 0 and 100' }, { status: 400 });
    }

    // Validate initial investment
    if (initial_investment < 0) {
      return NextResponse.json({ error: 'Initial investment must be a positive number' }, { status: 400 });
    }

    // Check if investor with the same name already exists
    const { data: existingInvestor } = await supabase
      .from('partners')
      .select('id, name')
      .eq('name', name.trim())
      .single();

    if (existingInvestor) {
      return NextResponse.json({ error: 'A partner/investor with this name already exists' }, { status: 409 });
    }

    // Check if email is provided and unique
    if (email?.trim()) {
      const { data: existingEmail } = await supabase
        .from('partners')
        .select('id, email')
        .eq('email', email.trim())
        .single();

      if (existingEmail) {
        return NextResponse.json({ error: 'A partner/investor with this email already exists' }, { status: 409 });
      }
    }

    // Start a transaction by using Supabase RPC call
    const initialInvestmentAmount = parseFloat(initial_investment) || 0;
    
    // Create the investor/partner
    const { data: investor, error } = await supabase
      .from('partners')
      .insert({
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        partner_type: partner_type,
        initial_investment: initialInvestmentAmount,
        equity_percentage: parseFloat(equity_percentage) || 0,
        is_active: Boolean(is_active),
        notes: notes?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating partner/investor:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If there's an initial investment, create accounting entries
    if (initialInvestmentAmount > 0) {
      try {
        // 1. Create or get individual partner equity account in chart of accounts
        const partnerAccountCode = `3015-${investor.id.toString()}`;
        const { data: existingAccount } = await supabase
          .from('chart_of_accounts')
          .select('id')
          .eq('account_code', partnerAccountCode)
          .single();

        let partnerAccountId;
        
        if (!existingAccount) {
          // Create new equity account for this partner
          const { data: newAccount, error: accountError } = await supabase
            .from('chart_of_accounts')
            .insert({
              account_code: partnerAccountCode,
              account_name: `${name.trim()} - Partner Equity`,
              account_type: 'EQUITY',
              account_subtype: 'CAPITAL',
              description: `Equity account for partner ${name.trim()}`,
              is_active: true,
              normal_balance: 'CREDIT',
              current_balance: initialInvestmentAmount,
              opening_balance: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (accountError) {
            console.error('Error creating partner equity account:', accountError);
            // Continue without failing the partner creation
          } else {
            partnerAccountId = newAccount?.id;
          }
        } else {
          partnerAccountId = existingAccount.id;
          
          // Update existing account balance
          await supabase
            .from('chart_of_accounts')
            .update({
              current_balance: initialInvestmentAmount,
              updated_at: new Date().toISOString()
            })
            .eq('id', partnerAccountId);
        }

        // 2. Get Cash account (1010) for the debit side
        const { data: cashAccount } = await supabase
          .from('chart_of_accounts')
          .select('id')
          .eq('account_code', '1010')
          .single();

        // 3. Create journal entry for initial investment
        if (partnerAccountId && cashAccount?.id) {
          const journalNumber = `JE-PI-${Date.now()}`;
          
          const { data: journalEntry, error: journalError } = await supabase
            .from('journal_entries')
            .insert({
              journal_number: journalNumber,
              entry_date: new Date().toISOString().split('T')[0],
              description: `Initial investment by partner ${name.trim()}`,
              entry_type: 'STANDARD',
              status: 'POSTED',
              total_debit: initialInvestmentAmount,
              total_credit: initialInvestmentAmount,
              source_document_type: 'PARTNER_INVESTMENT',
              reference_number: `PARTNER-${investor.id}`,
              created_by: validUserId, // Current logged-in user from Redux (or default for testing)
              created_at: new Date().toISOString(),
              posted_at: new Date().toISOString(),
              notes: `Partner ${name.trim()} initial investment of ₹${initialInvestmentAmount}`
            })
            .select('id')
            .single();

          if (journalError) {
            console.error('Error creating journal entry:', journalError);
          } else if (journalEntry?.id) {
            // 4. Create journal entry lines (Debit Cash, Credit Partner Equity)
            const journalLines = [
              {
                journal_entry_id: journalEntry.id,
                line_number: 1,
                account_id: cashAccount.id,
                description: `Cash received from ${name.trim()}`,
                debit_amount: initialInvestmentAmount,
                credit_amount: 0,
                reference: `Partner Investment - ${name.trim()}`
              },
              {
                journal_entry_id: journalEntry.id,
                line_number: 2,
                account_id: partnerAccountId,
                description: `Equity contribution by ${name.trim()}`,
                debit_amount: 0,
                credit_amount: initialInvestmentAmount,
                reference: `Partner Equity - ${name.trim()}`
              }
            ];

            const { error: linesError } = await supabase
              .from('journal_entry_lines')
              .insert(journalLines);

            if (linesError) {
              console.error('Error creating journal entry lines:', linesError);
            }

            // 5. Update Cash account balance
            const { data: currentCashAccount } = await supabase
              .from('chart_of_accounts')
              .select('current_balance')
              .eq('id', cashAccount.id)
              .single();

            if (currentCashAccount) {
              const newCashBalance = (parseFloat(currentCashAccount.current_balance) || 0) + initialInvestmentAmount;
              await supabase
                .from('chart_of_accounts')
                .update({
                  current_balance: newCashBalance,
                  updated_at: new Date().toISOString()
                })
                .eq('id', cashAccount.id);
            }
          }
        }
      } catch (accountingError) {
        console.error('Error creating accounting entries:', accountingError);
        // Don't fail partner creation if accounting fails - log it for manual correction
        console.log(`⚠️ Partner ${investor.id} created but accounting entries may be incomplete`);
      }
    }

    return NextResponse.json({
      success: true,
      investor,
      message: initialInvestmentAmount > 0 
        ? 'Partner/investor created successfully with accounting entries' 
        : 'Partner/investor created successfully'
    });
  } catch (error) {
    console.error('Error in investors POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update an existing investor
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, email, phone, notes, is_active } = body;

    // Validation
    if (!id) {
      return NextResponse.json({ error: 'Investor ID is required' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required and must be a non-empty string' }, { status: 400 });
    }

    // Check if investor exists
    const { data: existingInvestor } = await supabase
      .from('partners')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingInvestor) {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 });
    }

    // Check if another investor with the same name exists (excluding current investor)
    const { data: duplicateInvestor } = await supabase
      .from('partners')
      .select('id, name')
      .eq('name', name.trim())
      .neq('id', id)
      .single();

    if (duplicateInvestor) {
      return NextResponse.json({ error: 'Another investor with this name already exists' }, { status: 409 });
    }

    // Update the investor
    const { data: investor, error } = await supabase
      .from('partners')
      .update({
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        notes: notes?.trim() || null,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating investor:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      investor,
      message: 'Investor updated successfully'
    });
  } catch (error) {
    console.error('Error in investors PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete an investor (soft delete by setting is_active to false)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Investor ID is required' }, { status: 400 });
    }

    // Check if investor exists
    const { data: existingInvestor } = await supabase
      .from('partners')
      .select('id, name, initial_investment')
      .eq('id', id)
      .single();

    if (!existingInvestor) {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 });
    }

    // Check if investor has any investments or withdrawals by checking investments table
    const { data: investments } = await supabase
      .from('investments')
      .select('id')
      .eq('partner_id', id)
      .limit(1);

    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select('id')
      .eq('partner_id', id)
      .limit(1);

    if (investments && investments.length > 0 || withdrawals && withdrawals.length > 0 || existingInvestor.initial_investment > 0) {
      // Soft delete - set is_active to false
      const { error } = await supabase
        .from('partners')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error soft deleting investor:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Investor deactivated successfully (has transaction history)'
      });
    } else {
      // Hard delete - no transaction history
      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting investor:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Investor deleted successfully'
      });
    }
  } catch (error) {
    console.error('Error in investors DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}