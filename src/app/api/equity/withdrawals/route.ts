import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Disable Next.js caching for real-time data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      created_by,
      category_id = null,
      subcategory_id = null,
      withdrawal_type = 'capital_withdrawal' // New field with default value
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

    // Allow negative equity balances - calculate current investment for accounting
    const currentInvestment = parseFloat(partner.initial_investment) || 0;

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
        category_id: category_id,
        subcategory_id: subcategory_id,
        amount: withdrawalAmount,
        withdrawal_date: withdrawal_date,
        description: description?.trim() || '',
        payment_method: payment_method || 'cash',
        bank_account_id: bank_account_id,
        reference_number: reference_number?.trim() || '',
        upi_reference: upi_reference?.trim() || '',
        notes: notes?.trim() || '',
        withdrawal_type: withdrawal_type, // Add withdrawal type to record
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
      // 1. Get or create partner equity account (create if doesn't exist, like investments API)
      const partnerAccountCode = `3015-${partner_id.toString()}`;
      const { data: existingAccount } = await supabase
        .from('chart_of_accounts')
        .select('id, current_balance')
        .eq('account_code', partnerAccountCode)
        .single();

      let partnerAccountId;
      
      if (!existingAccount) {
        // Create new equity account for this partner (same as investment creation)
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
            current_balance: -withdrawalAmount, // Start with negative balance for withdrawal
            opening_balance: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (accountError) {
          console.error('Error creating partner equity account:', accountError);
          return NextResponse.json({ 
            error: 'Failed to create partner equity account. Please try again.' 
          }, { status: 500 });
        } else {
          partnerAccountId = newAccount?.id;
        }
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

      console.log('💰 Cash account lookup result:', { cashAccount, found: !!cashAccount });

      // 2.5. Create bank transaction for ALL account types (balance updated separately based on transactions)
      if (bank_account_id && bank_account_id.trim() !== '') {
        // Get bank account details
        const { data: bankAccount, error: bankError } = await supabase
          .from("bank_accounts")
          .select("account_type, name")
          .eq("id", bank_account_id)
          .single();
        
        if (!bankError && bankAccount) {
          // Determine account label for description
          const accountLabel = bankAccount.account_type === 'CASH' ? 'Cash Account' :
                             bankAccount.account_type === 'UPI' ? 'UPI Account' :
                             'Bank Account';
          
          // Create bank transaction (withdrawal)
          const { error: bankTransactionError } = await supabase
            .from("bank_transactions")
            .insert([{
              bank_account_id,
              date: withdrawal_date,
              type: "withdrawal",
              amount: withdrawalAmount,
              description: `Withdrawal to ${partner.name}: ${description} [${accountLabel}]`,
              transaction_type: 'withdrawal',
              source_record_id: withdrawal.id
            }]);

          if (bankTransactionError) {
            console.error('❌ Error creating bank transaction:', bankTransactionError);
          } else {
            console.log(`✅ Bank transaction created successfully for ${bankAccount.account_type} account: ${bankAccount.name}`);
          }
        } else if (bankError) {
          console.error('❌ Error fetching bank account:', bankError);
        }
      }

      // 3. Create journal entry for withdrawal (opposite of investment)
      if (partnerAccountId && cashAccount?.id) {
        console.log('📝 Creating journal entry with:', { partnerAccountId, cashAccountId: cashAccount.id });
        
        const journalNumber = `JE-WDL-${Date.now()}`;
        
        // Create appropriate description based on withdrawal type
        const withdrawalTypeDesc = withdrawal_type === 'capital_withdrawal' ? 'Capital withdrawal' :
                                 withdrawal_type === 'interest_payment' ? 'Interest payment' :
                                 withdrawal_type === 'profit_distribution' ? 'Profit distribution' : 'Withdrawal';
        
        const { data: journalEntry, error: journalError } = await supabase
          .from('journal_entries')
          .insert({
            journal_number: journalNumber,
            entry_date: withdrawal_date,
            description: `${withdrawalTypeDesc} by partner ${partner.name}`,
            entry_type: 'STANDARD',
            status: 'POSTED',
            total_debit: withdrawalAmount,
            total_credit: withdrawalAmount,
            source_document_type: 'PARTNER_WITHDRAWAL',
            reference_number: `WDL-${withdrawal.id}`,
            created_by: validUserId,
            created_at: new Date().toISOString(),
            posted_at: new Date().toISOString(),
            notes: `Partner ${partner.name} ${withdrawalTypeDesc.toLowerCase()} of ₹${withdrawalAmount}`
          })
          .select('id')
          .single();

        if (journalError) {
          console.error('❌ Error creating journal entry:', journalError);
        } else if (journalEntry?.id) {
          console.log('✅ Journal entry created successfully:', { id: journalEntry.id, journalNumber });
          
          // 4. Create journal entry lines (Debit Partner Equity, Credit Cash) - opposite of investment
          const journalLines = [
            {
              journal_entry_id: journalEntry.id,
              line_number: 1,
              account_id: partnerAccountId,
              description: `${withdrawalTypeDesc} by ${partner.name}`,
              debit_amount: withdrawalAmount,
              credit_amount: 0,
              reference: `Partner ${withdrawalTypeDesc} - ${partner.name}`
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

          console.log('📊 Creating journal entry lines:', journalLines);

          const { error: linesError } = await supabase
            .from('journal_entry_lines')
            .insert(journalLines);

          if (linesError) {
            console.error('❌ Error creating journal entry lines:', linesError);
          } else {
            console.log('✅ Journal entry lines created successfully');
          }

          // 5. Update Cash account balance (decrease cash)
          const currentCashBalance = parseFloat(cashAccount.current_balance) || 0;
          const newCashBalance = currentCashBalance - withdrawalAmount;
          
          console.log('💰 Updating cash account balance:', { 
            current: currentCashBalance, 
            withdrawal: withdrawalAmount, 
            new: newCashBalance 
          });
          
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

          console.log('✅ Withdrawal accounting completed successfully');
        } else {
          console.error('❌ Journal entry creation returned no data');
        }
      } else {
        console.error('❌ Cannot create journal entry - missing accounts:', { 
          partnerAccountId, 
          cashAccountId: cashAccount?.id,
          partnerAccountExists: !!partnerAccountId,
          cashAccountExists: !!cashAccount?.id
        });
      }

      // 7. Update partner's total investment amount in partners table (only for capital withdrawals)
      try {
        // Only reduce investment for capital withdrawals, not for interest payments or profit distributions
        if (withdrawal_type === 'capital_withdrawal') {
          const newTotal = currentInvestment - withdrawalAmount;
          
          await supabase
            .from('partners')
            .update({
              initial_investment: newTotal,
              updated_at: new Date().toISOString()
            })
            .eq('id', partner_id);

          console.log(`✅ Updated partner ${partner.name} total investment: ₹${currentInvestment} → ₹${newTotal} (Capital Withdrawal)`);
        } else {
          console.log(`ℹ️ Partner ${partner.name} investment unchanged: ₹${currentInvestment} (${withdrawal_type} - no investment reduction)`);
        }
      } catch (partnerUpdateError) {
        console.error('Error updating partner investment total:', partnerUpdateError);
        // Don't fail the withdrawal creation
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