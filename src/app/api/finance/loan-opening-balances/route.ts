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

    // Validate loan type
    const validLoanTypes = ['bank_loan', 'equipment_loan', 'vehicle_loan', 'business_loan', 'term_loan'];
    if (loan_type && !validLoanTypes.includes(loan_type)) {
      return NextResponse.json(
        { error: `Invalid loan_type. Must be one of: ${validLoanTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate and format dates
    const formatDate = (dateString: string) => {
      if (!dateString || dateString.trim() === '') return null;
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      } catch {
        return null;
      }
    };

    // Insert loan opening balance
    const { data: loanBalance, error: insertError } = await supabase
      .from('loan_opening_balances')
      .insert({
        loan_account_code,
        loan_name,
        bank_name,
        loan_type: loan_type || 'business_loan', // Default loan type
        loan_number,
        original_loan_amount: parseFloat(original_loan_amount),
        opening_balance: parseFloat(opening_balance),
        current_balance: parseFloat(opening_balance), // Initially same as opening balance
        interest_rate: interest_rate ? parseFloat(interest_rate) : null,
        loan_tenure_months: loan_tenure_months ? parseInt(loan_tenure_months) : null,
        emi_amount: emi_amount ? parseFloat(emi_amount) : null,
        loan_start_date: formatDate(loan_start_date),
        loan_end_date: formatDate(loan_end_date),
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
    console.log('📋 Fetching loan opening balances for liability payments...');

    // Get all loans with their details for liability payment dropdown
    const { data: loanBalances, error } = await supabase
      .from('loan_opening_balances')
      .select(`
        id,
        loan_name,
        bank_name,
        loan_account_code,
        loan_type,
        original_loan_amount,
        current_balance,
        interest_rate,
        emi_amount,
        loan_start_date,
        loan_end_date,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching loan opening balances:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`🏦 Found ${loanBalances?.length || 0} loan opening balances`);

    return NextResponse.json({ 
      success: true,
      loanBalances: loanBalances || []
    });

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

  try {
    // Step 1: Get account IDs for the journal entry lines
    const cashAccountCode = '1110'; // Cash account
    
    // Get cash account ID
    const { data: cashAccount, error: cashAccountError } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('account_code', cashAccountCode)
      .single();

    if (cashAccountError || !cashAccount) {
      console.error('❌ Cash account not found:', cashAccountCode);
      throw new Error(`Cash account ${cashAccountCode} not found`);
    }

    // Get loan account ID
    const { data: loanAccount, error: loanAccountError } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('account_code', loan_account_code)
      .single();

    if (loanAccountError || !loanAccount) {
      console.error('❌ Loan account not found:', loan_account_code);
      throw new Error(`Loan account ${loan_account_code} not found`);
    }

    // Step 2: Get a valid user ID for created_by
    const { data: systemUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();

    let createdByUserId = null;
    if (systemUser && !userError) {
      createdByUserId = systemUser.id;
    }

    // Step 3: Create journal entry header
    const today = new Date().toISOString().split('T')[0];
    const journalDescription = `${loan_name} - Loan Opening Balance${description ? ' - ' + description : ''}`;
    const reference = `LOB-${loanBalanceId}`;

    const journalEntryData = {
      journal_number: `JE-${Date.now()}`, // Temporary number, should be generated properly
      entry_date: today,
      description: journalDescription,
      reference_number: reference,
      entry_type: 'STANDARD' as const,
      status: 'DRAFT' as const,
      total_debit: opening_balance,
      total_credit: opening_balance,
      source_document_type: 'loan_opening_balance',
      source_document_id: loanBalanceId,
      ...(createdByUserId && { created_by: createdByUserId })
    };

    const { data: journalEntry, error: journalError } = await supabase
      .from('journal_entries')
      .insert(journalEntryData)
      .select()
      .single();

    if (journalError) {
      console.error('❌ Error creating journal entry header:', journalError);
      throw new Error(`Failed to create journal entry: ${journalError.message}`);
    }

    // Step 3: Create journal entry lines
    const journalLines = [
      {
        journal_entry_id: journalEntry.id,
        line_number: 1,
        account_id: cashAccount.id,
        description: `${loan_name} - Cash Received`,
        debit_amount: opening_balance,
        credit_amount: 0
      },
      {
        journal_entry_id: journalEntry.id,
        line_number: 2,
        account_id: loanAccount.id,
        description: `${loan_name} - Loan Liability`,
        debit_amount: 0,
        credit_amount: opening_balance
      }
    ];

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(journalLines);

    if (linesError) {
      console.error('❌ Error creating journal entry lines:', linesError);
      throw new Error(`Failed to create journal entry lines: ${linesError.message}`);
    }

    console.log('✅ Opening balance journal entries created for loan:', loanBalanceId);
    return journalEntry.id;

  } catch (error) {
    console.error('❌ Error in journal entry creation:', error);
    throw error;
  }
}