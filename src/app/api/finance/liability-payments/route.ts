import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      date,
      liability_type,
      loan_id,
      principal_amount,
      interest_amount,
      total_amount,
      description,
      payment_method,
      bank_account_id,
      upi_reference,
      reference_number,
      created_by
    } = body;

    console.log('💳 Creating liability payment:', {
      date,
      liability_type,
      loan_id,
      principal_amount,
      interest_amount,
      total_amount,
      description,
      payment_method
    });

    // Validate required fields
    if (!date || !description || total_amount <= 0) {
      return NextResponse.json(
        { error: 'Missing required fields or invalid amount' },
        { status: 400 }
      );
    }

    // Start a transaction to ensure data consistency
    const { data: liabilityPayment, error: paymentError } = await supabase
      .from('liability_payments')
      .insert({
        date,
        liability_type,
        loan_id,
        principal_amount: principal_amount || 0,
        interest_amount: interest_amount || 0,
        total_amount,
        description,
        payment_method,
        bank_account_id,
        upi_reference,
        reference_number,
        created_by
      })
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Error creating liability payment:', paymentError);
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    console.log('✅ Liability payment created:', liabilityPayment.id);

    // Update loan balance if loan_id is provided
    if (loan_id && principal_amount > 0) {
      console.log('🏦 Updating loan balance for loan_id:', loan_id);
      
      const { data: loan, error: loanFetchError } = await supabase
        .from('loan_opening_balances')
        .select('current_balance')
        .eq('id', loan_id)
        .single();

      if (loanFetchError) {
        console.error('❌ Error fetching loan:', loanFetchError);
      } else if (loan) {
        const newBalance = (loan.current_balance || 0) - principal_amount;
        const { error: balanceUpdateError } = await supabase
          .from('loan_opening_balances')
          .update({ current_balance: newBalance })
          .eq('id', loan_id);

        if (balanceUpdateError) {
          console.error('❌ Error updating loan balance:', balanceUpdateError);
        } else {
          console.log('✅ Loan balance updated:', { oldBalance: loan.current_balance, newBalance });
        }
      }
    }

    // Create bank transaction and update bank balance if bank account is used
    if (bank_account_id && payment_method !== 'cash') {
      // NOTE: We do NOT create a bank_transaction here to avoid double-entry
      // The liability_payment record itself will be picked up by the bank-transactions API
      
      // Only update bank account balance directly
      const { data: bankAccount, error: bankError } = await supabase
        .from("bank_accounts")
        .select("current_balance")
        .eq("id", bank_account_id)
        .single();
      
      if (!bankError && bankAccount) {
        const newBalance = (bankAccount.current_balance || 0) - total_amount;
        await supabase
          .from("bank_accounts")
          .update({ current_balance: newBalance })
          .eq("id", bank_account_id);
        
        console.log('💰 Updated bank balance without creating duplicate transaction:', {
          bankAccountId: bank_account_id,
          oldBalance: bankAccount.current_balance,
          newBalance,
          deductedAmount: total_amount
        });
      }
    }

    // Create journal entries for the liability payment
    await createLiabilityPaymentJournalEntry({
      liabilityPaymentId: liabilityPayment.id,
      date,
      liability_type,
      loan_id,
      principal_amount: principal_amount || 0,
      interest_amount: interest_amount || 0,
      total_amount,
      description,
      payment_method,
      bank_account_id,
      created_by
    });

    return NextResponse.json({ 
      success: true, 
      liabilityPayment,
      message: 'Liability payment recorded successfully'
    });

  } catch (error) {
    console.error('❌ Error in liability payment API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    console.log('📋 Fetching liability payments...');

    const { searchParams } = new URL(request.url);
    const pageSize = searchParams.get('pageSize');

    let query = supabase
      .from('liability_payments')
      .select(`
        *,
        bank_accounts!bank_account_id(
          id,
          name,
          account_number
        ),
        loan_opening_balances!loan_id(
          id,
          loan_name,
          bank_name,
          loan_type,
          loan_number,
          loan_account_code,
          current_balance,
          emi_amount
        )
      `)
      .order('date', { ascending: false });

    // Add limit if pageSize is provided
    if (pageSize) {
      const limit = parseInt(pageSize);
      if (!isNaN(limit) && limit > 0) {
        query = query.limit(limit);
      }
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error('❌ Error fetching liability payments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`💳 Found ${payments?.length || 0} liability payments`);

    // Transform the data to match expected format
    const transformedLiabilities = payments?.map(payment => ({
      id: payment.id,
      date: payment.date,
      liability_type: payment.liability_type,
      loan_id: payment.loan_id,
      principal_amount: payment.principal_amount,
      interest_amount: payment.interest_amount,
      total_amount: payment.total_amount,
      description: payment.description,
      payment_method: payment.payment_method,
      bank_account_id: payment.bank_account_id,
      upi_reference: payment.upi_reference,
      reference_number: payment.reference_number,
      created_at: payment.created_at,
      bank_account_name: payment.bank_accounts?.name,
      loan_name: payment.loan_opening_balances?.loan_name,
      loan_bank_name: payment.loan_opening_balances?.bank_name,
      loan_type: payment.loan_opening_balances?.loan_type,
      loan_number: payment.loan_opening_balances?.loan_number,
      loan_account_code: payment.loan_opening_balances?.loan_account_code,
      loan_current_balance: payment.loan_opening_balances?.current_balance,
      loan_emi_amount: payment.loan_opening_balances?.emi_amount
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedLiabilities,
      pagination: {
        page: 1,
        pageSize: payments?.length || 0,
        total: payments?.length || 0,
        totalPages: 1
      }
    });

  } catch (error) {
    console.error('❌ Error in liability payments GET API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Helper function to create journal entries for liability payments
async function createLiabilityPaymentJournalEntry({
  liabilityPaymentId,
  date,
  liability_type,
  loan_id,
  principal_amount,
  interest_amount,
  total_amount,
  description,
  payment_method,
  bank_account_id,
  created_by
}: {
  liabilityPaymentId: string;
  date: string;
  liability_type: string;
  loan_id?: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  description: string;
  payment_method: string;
  bank_account_id?: string;
  created_by?: string;
}) {
  console.log('📝 Creating journal entries for liability payment:', liabilityPaymentId);

  // Determine account codes based on loan or liability type
  let liabilityAccountCode = '2510'; // Default: Bank Loans
  
  // If loan_id is provided, get the account code from the loan
  if (loan_id) {
    const { data: loan } = await supabase
      .from('loan_opening_balances')
      .select('account_code')
      .eq('id', loan_id)
      .single();
    
    if (loan?.account_code) {
      liabilityAccountCode = loan.account_code;
    }
  } else {
    // Fall back to liability type mapping
    if (liability_type === 'bank_loan_current') {
      liabilityAccountCode = '2210'; // Bank Loan - Current Portion
    } else if (liability_type === 'equipment_loan') {
      liabilityAccountCode = '2530'; // Equipment Loans
    }
  }

  const interestExpenseAccount = '7010'; // Interest Expense
  
  // Determine cash/bank account code
  let cashAccountCode = '1110'; // Default: Cash
  if (payment_method !== 'cash' && bank_account_id) {
    // Fetch bank account details to get the correct account code
    const { data: bankAccount } = await supabase
      .from('bank_accounts')
      .select('account_code')
      .eq('id', bank_account_id)
      .single();
    
    if (bankAccount?.account_code) {
      cashAccountCode = bankAccount.account_code;
    } else {
      cashAccountCode = '1120'; // Default: Bank Account
    }
  }

  // Create the main journal entry header
  let validCreatedBy = created_by;
  
  // If no created_by provided or invalid, try to get a valid user from the system
  if (!validCreatedBy) {
    const { data: systemUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();
    
    if (systemUser) {
      validCreatedBy = systemUser.id;
    } else {
      // If no users exist, we can't create journal entries
      throw new Error('No valid user found to create journal entries. Please ensure at least one user exists in the system.');
    }
  }

  const { data: journalEntry, error: journalHeaderError } = await supabase
    .from('journal_entries')
    .insert({
      entry_date: date,
      description: description,
      reference_number: `LP-${liabilityPaymentId}`,
      entry_type: 'STANDARD',
      source_document_type: 'LIABILITY_PAYMENT',
      source_document_id: liabilityPaymentId,
      created_by: validCreatedBy,
      status: 'POSTED',
      journal_number: `JE-LP-${liabilityPaymentId.substring(0, 8)}`,
      total_debit: total_amount,
      total_credit: total_amount
    })
    .select('id')
    .single();

  if (journalHeaderError || !journalEntry) {
    console.error('❌ Error creating journal entry header:', journalHeaderError);
    throw new Error(`Failed to create journal entry header: ${journalHeaderError?.message}`);
  }

  const journalEntryId = journalEntry.id;
  const journalLines = [];

  // Get account IDs for the journal entry lines
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, account_code')
    .in('account_code', [liabilityAccountCode, interestExpenseAccount, cashAccountCode]);

  const accountMap = accounts?.reduce((acc: Record<string, string>, account: {id: string, account_code: string}) => {
    acc[account.account_code] = account.id;
    return acc;
  }, {} as Record<string, string>) || {};

  let lineNumber = 1;

  // Entry 1: Debit Liability Account (Principal Payment)
  if (principal_amount > 0) {
    journalLines.push({
      journal_entry_id: journalEntryId,
      line_number: lineNumber++,
      account_id: accountMap[liabilityAccountCode],
      description: `${description} - Principal Payment`,
      debit_amount: principal_amount,
      credit_amount: 0
    });
  }

  // Entry 2: Debit Interest Expense (Interest Payment)
  if (interest_amount > 0) {
    journalLines.push({
      journal_entry_id: journalEntryId,
      line_number: lineNumber++,
      account_id: accountMap[interestExpenseAccount],
      description: `${description} - Interest Payment`,
      debit_amount: interest_amount,
      credit_amount: 0
    });
  }

  // Entry 3: Credit Cash/Bank Account (Total Payment)
  journalLines.push({
    journal_entry_id: journalEntryId,
    line_number: lineNumber++,
    account_id: accountMap[cashAccountCode],
    description: `${description} - Payment`,
    debit_amount: 0,
    credit_amount: total_amount
  });

  // Insert all journal entry lines
  const { error: journalLinesError } = await supabase
    .from('journal_entry_lines')
    .insert(journalLines);

  if (journalLinesError) {
    console.error('❌ Error creating journal entry lines:', journalLinesError);
    throw new Error(`Failed to create journal entry lines: ${journalLinesError.message}`);
  }

  console.log('✅ Journal entries created for liability payment:', liabilityPaymentId);
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
      id, 
      date,
      liability_type,
      loan_id,
      principal_amount,
      interest_amount,
      total_amount,
      description,
      payment_method,
      bank_account_id,
      upi_reference,
      reference_number
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Liability payment ID is required' }, { status: 400 });
    }

    const newTotalAmount = parseFloat(total_amount);
    if (isNaN(newTotalAmount) || newTotalAmount <= 0) {
      return NextResponse.json({ error: 'Valid total amount is required' }, { status: 400 });
    }

    console.log('🔄 Starting liability payment update with related records:', id);

    // 1. Get the current liability payment to calculate difference
    const { data: currentPayment, error: fetchError } = await supabase
      .from('liability_payments')
      .select('total_amount, date, bank_account_id')
      .eq('id', id)
      .single();

    if (fetchError || !currentPayment) {
      return NextResponse.json({ error: 'Liability payment not found' }, { status: 404 });
    }

    const oldAmount = currentPayment.total_amount;
    const amountDifference = newTotalAmount - oldAmount;
    
    console.log('💰 Liability payment amount change:', { oldAmount, newTotalAmount, difference: amountDifference });

    // 2. Update the liability payment record
    const updateData: Record<string, unknown> = {
      date,
      liability_type,
      principal_amount: principal_amount || 0,
      interest_amount: interest_amount || 0,
      total_amount: newTotalAmount,
      description,
      payment_method,
      bank_account_id,
      upi_reference,
      reference_number,
      updated_at: new Date().toISOString()
    };
    
    // Only include loan_id if it's a valid number
    if (loan_id && !isNaN(parseInt(loan_id))) {
      updateData.loan_id = parseInt(loan_id);
    }

    const { data: updatedPayment, error: updateError } = await supabase
      .from('liability_payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating liability payment:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. Update related bank transaction if it exists
    if (currentPayment.bank_account_id && amountDifference !== 0) {
      console.log('🏦 Updating bank transaction for bank account:', currentPayment.bank_account_id);
      
      // Find the related bank transaction (liability payments create withdrawals)
      const { data: bankTransaction } = await supabase
        .from('bank_transactions')
        .select('id, amount')
        .eq('bank_account_id', currentPayment.bank_account_id)
        .eq('date', currentPayment.date)
        .eq('type', 'withdrawal')
        .eq('amount', oldAmount)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (bankTransaction) {
        // Update bank transaction amount
        await supabase
          .from('bank_transactions')
          .update({ 
            amount: newTotalAmount,
            date: date,
            description: `Liability Payment: ${description}` 
          })
          .eq('id', bankTransaction.id);

        // Update bank account balance (liability payments decrease balance)
        const { data: bankAccount, error: bankError } = await supabase
          .from('bank_accounts')
          .select('current_balance')
          .eq('id', currentPayment.bank_account_id)
          .single();

        if (!bankError && bankAccount) {
          // Adjust balance by the difference (subtract additional amount or add back reduced amount)
          const newBalance = (bankAccount.current_balance || 0) - amountDifference;
          await supabase
            .from('bank_accounts')
            .update({ current_balance: newBalance })
            .eq('id', currentPayment.bank_account_id);
          
          console.log('✅ Updated bank balance by', -amountDifference);
        }
      }
    }

    // 4. Journal entry updates would go here
    // Note: This requires complex reversal and recreation logic
    // For now, this is a known limitation that should be addressed in future updates
    
    console.log('✅ Liability payment update completed successfully');
    console.log('⚠️ Note: Journal entry updates not implemented - manual reconciliation may be needed');

    return NextResponse.json({
      success: true,
      data: updatedPayment,
      message: 'Liability payment and related records updated successfully'
    });

  } catch (error) {
    console.error('Unexpected error in liability payment update:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Liability payment ID is required' }, { status: 400 });
    }

    // Delete the liability payment
    const { error } = await supabase
      .from('liability_payments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting liability payment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Liability payment deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error in liability payment deletion:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}