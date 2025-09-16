import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      loan_account_code,
      loan_name,
      bank_name,
      loan_type,
      loan_number,
      original_loan_amount,
      opening_balance,
      interest_rate,
      loan_tenure_months,
      emi_amount,
      loan_start_date,
      loan_end_date,
      description,
      created_by
    } = body;

    console.log('🏦 Creating loan opening balance:', {
      loan_name,
      bank_name,
      loan_account_code,
      opening_balance
    });

    // Validate required fields
    if (!loan_account_code || !loan_name || !original_loan_amount || !opening_balance) {
      return NextResponse.json(
        { error: 'Missing required fields: loan_account_code, loan_name, original_loan_amount, opening_balance' },
        { status: 400 }
      );
    }

    // Validate account code
    if (!['2210', '2510', '2530'].includes(loan_account_code)) {
      return NextResponse.json(
        { error: 'Invalid loan_account_code. Must be 2210, 2510, or 2530' },
        { status: 400 }
      );
    }

    // Insert loan opening balance
    const { data: loanBalance, error: insertError } = await supabase
      .from('loan_opening_balances')
      .insert({
        loan_account_code,
        loan_name,
        bank_name,
        loan_type,
        loan_number,
        original_loan_amount: parseFloat(original_loan_amount),
        opening_balance: parseFloat(opening_balance),
        current_balance: parseFloat(opening_balance), // Initially same as opening balance
        interest_rate: interest_rate ? parseFloat(interest_rate) : null,
        loan_tenure_months: loan_tenure_months ? parseInt(loan_tenure_months) : null,
        emi_amount: emi_amount ? parseFloat(emi_amount) : null,
        loan_start_date,
        loan_end_date,
        description,
        created_by
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating loan opening balance:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log('✅ Loan opening balance created:', loanBalance.id);

    // Create opening balance journal entry
    await createLoanOpeningBalanceJournalEntry({
      loanBalanceId: loanBalance.id,
      loan_account_code,
      opening_balance: parseFloat(opening_balance),
      loan_name,
      description
    });

    return NextResponse.json({ 
      success: true, 
      loanBalance,
      message: 'Loan opening balance recorded successfully'
    });

  } catch (error) {
    console.error('❌ Error in loan opening balance API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log('📋 Fetching loan opening balances...');

    const { data: loanBalances, error } = await supabase
      .from('loan_opening_balances')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching loan opening balances:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`🏦 Found ${loanBalances?.length || 0} loan opening balances`);

    return NextResponse.json({ loanBalances });

  } catch (error) {
    console.error('❌ Error in loan opening balances GET API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    console.log('🔄 Updating loan opening balance:', id);

    if (!id) {
      return NextResponse.json(
        { error: 'Loan balance ID is required for update' },
        { status: 400 }
      );
    }

    // Update the loan balance
    const { data: updatedLoan, error: updateError } = await supabase
      .from('loan_opening_balances')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating loan opening balance:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log('✅ Loan opening balance updated:', id);

    return NextResponse.json({ 
      success: true, 
      loanBalance: updatedLoan,
      message: 'Loan opening balance updated successfully'
    });

  } catch (error) {
    console.error('❌ Error in loan opening balance PUT API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Helper function to create journal entries for loan opening balances
async function createLoanOpeningBalanceJournalEntry({
  loanBalanceId,
  loan_account_code,
  opening_balance,
  loan_name,
  description
}: {
  loanBalanceId: string;
  loan_account_code: string;
  opening_balance: number;
  loan_name: string;
  description?: string;
}) {
  console.log('📝 Creating opening balance journal entry for loan:', loanBalanceId);

  // Determine the corresponding asset/cash account (usually cash received when loan was taken)
  const cashAccountCode = '1110'; // Cash account - assuming cash was received when loan was taken

  const journalEntries = [
    {
      account_code: cashAccountCode,
      description: `${loan_name} - Loan Opening Balance (Cash Received)${description ? ' - ' + description : ''}`,
      debit_amount: opening_balance,
      credit_amount: 0,
      reference: `LOB-${loanBalanceId}`,
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: 'loan_opening_balance',
      related_id: loanBalanceId
    },
    {
      account_code: loan_account_code,
      description: `${loan_name} - Loan Opening Balance (Liability)${description ? ' - ' + description : ''}`,
      debit_amount: 0,
      credit_amount: opening_balance,
      reference: `LOB-${loanBalanceId}`,
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: 'loan_opening_balance',
      related_id: loanBalanceId
    }
  ];

  // Insert journal entries
  const { error: journalError } = await supabase
    .from('journal_entries')
    .insert(journalEntries);

  if (journalError) {
    console.error('❌ Error creating opening balance journal entries:', journalError);
    throw new Error(`Failed to create opening balance journal entries: ${journalError.message}`);
  }

  console.log('✅ Opening balance journal entries created for loan:', loanBalanceId);
}