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
      // Create bank transaction
      await supabase
        .from("bank_transactions")
        .insert([{
          bank_account_id,
          date,
          type: "withdrawal",
          amount: total_amount,
          description: `Liability Payment: ${description}`,
        }]);

      // Update bank account balance
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

export async function GET() {
  try {
    console.log('📋 Fetching liability payments...');

    const { data: payments, error } = await supabase
      .from('liability_payments')
      .select(`
        *,
        bank_accounts!bank_account_id(
          id,
          name,
          account_number
        )
      `)
      .order('date', { ascending: false });

    if (error) {
      console.error('❌ Error fetching liability payments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`💳 Found ${payments?.length || 0} liability payments`);

    return NextResponse.json({ payments });

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