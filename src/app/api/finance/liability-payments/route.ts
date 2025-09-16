import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      date,
      liability_type,
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
      principal_amount,
      interest_amount,
      total_amount,
      description,
      payment_method
    });

    // Validate required fields
    if (!date || !liability_type || !description || total_amount <= 0) {
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
      principal_amount: principal_amount || 0,
      interest_amount: interest_amount || 0,
      total_amount,
      description,
      payment_method,
      bank_account_id
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
  principal_amount,
  interest_amount,
  total_amount,
  description,
  payment_method,
  bank_account_id
}: {
  liabilityPaymentId: string;
  date: string;
  liability_type: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  description: string;
  payment_method: string;
  bank_account_id?: string;
}) {
  console.log('📝 Creating journal entries for liability payment:', liabilityPaymentId);

  // Determine account codes based on liability type
  let liabilityAccountCode = '2510'; // Default: Bank Loans
  if (liability_type === 'bank_loan_current') {
    liabilityAccountCode = '2210'; // Bank Loan - Current Portion
  } else if (liability_type === 'equipment_loan') {
    liabilityAccountCode = '2530'; // Equipment Loans
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

  const journalEntries = [];

  // Entry 1: Debit Liability Account (Principal Payment)
  if (principal_amount > 0) {
    journalEntries.push({
      account_code: liabilityAccountCode,
      description: `${description} - Principal Payment`,
      debit_amount: principal_amount,
      credit_amount: 0,
      reference: `LP-${liabilityPaymentId}`,
      transaction_date: date,
      transaction_type: 'liability_payment',
      related_id: liabilityPaymentId
    });
  }

  // Entry 2: Debit Interest Expense (Interest Payment)
  if (interest_amount > 0) {
    journalEntries.push({
      account_code: interestExpenseAccount,
      description: `${description} - Interest Payment`,
      debit_amount: interest_amount,
      credit_amount: 0,
      reference: `LP-${liabilityPaymentId}`,
      transaction_date: date,
      transaction_type: 'liability_payment',
      related_id: liabilityPaymentId
    });
  }

  // Entry 3: Credit Cash/Bank Account (Total Payment)
  journalEntries.push({
    account_code: cashAccountCode,
    description: `${description} - Payment`,
    debit_amount: 0,
    credit_amount: total_amount,
    reference: `LP-${liabilityPaymentId}`,
    transaction_date: date,
    transaction_type: 'liability_payment',
    related_id: liabilityPaymentId
  });

  // Insert all journal entries
  const { error: journalError } = await supabase
    .from('journal_entries')
    .insert(journalEntries);

  if (journalError) {
    console.error('❌ Error creating journal entries for liability payment:', journalError);
    throw new Error(`Failed to create journal entries: ${journalError.message}`);
  }

  console.log('✅ Journal entries created for liability payment:', liabilityPaymentId);
}