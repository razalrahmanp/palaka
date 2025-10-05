// Debug API to analyze HDFC bank account transactions
import { NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    console.log('🔍 Analyzing HDFC bank account transactions...');

    // 1. Find HDFC bank account
    const { data: hdfc, error: hdfcError } = await supabaseAdmin
      .from('bank_accounts')
      .select('*')
      .ilike('name', '%HDFC%')
      .or('account_number.ilike.%50200086008081%,name.ilike.%50200086008081%')
      .single();

    if (hdfcError || !hdfc) {
      console.error('HDFC account not found:', hdfcError);
      return NextResponse.json({ error: 'HDFC account not found' }, { status: 404 });
    }

    console.log('Found HDFC account:', hdfc);

    // 2. Get all bank transactions for this account
    const { data: bankTransactions, error: bankError } = await supabaseAdmin
      .from('bank_transactions')
      .select('*')
      .eq('bank_account_id', hdfc.id)
      .order('date', { ascending: false })
      .limit(50);

    if (bankError) {
      console.error('Error fetching bank transactions:', bankError);
      return NextResponse.json({ error: 'Failed to fetch bank transactions' }, { status: 500 });
    }

    // 3. Get related expenses that might have created these transactions
    const expenseTransactions = bankTransactions?.filter(tx => 
      tx.description?.includes('Expense:')
    ) || [];

    console.log(`Found ${bankTransactions?.length || 0} bank transactions, ${expenseTransactions.length} are expenses`);

    // 4. For expense transactions, try to find the related expense record
    const analysisResults = [];
    
    for (const tx of expenseTransactions.slice(0, 10)) { // Analyze first 10
      // Extract expense description
      const match = tx.description?.match(/Expense: (.+?)(?:\s*\[|\s*\(via|$)/);
      const expenseDesc = match ? match[1].trim() : null;

      if (expenseDesc) {
        // Try to find the related expense
        const { data: relatedExpenses } = await supabaseAdmin
          .from('expenses')
          .select('*')
          .eq('description', expenseDesc)
          .eq('amount', tx.amount)
          .gte('date', tx.date)
          .lte('date', tx.date);

        analysisResults.push({
          bank_transaction: {
            id: tx.id,
            date: tx.date,
            amount: tx.amount,
            description: tx.description,
            type: tx.type
          },
          extracted_expense_desc: expenseDesc,
          related_expenses: relatedExpenses || [],
          should_exist_in_bank: relatedExpenses?.some(exp => exp.payment_method !== 'cash') || false,
          is_cash_expense: relatedExpenses?.some(exp => exp.payment_method === 'cash') || false
        });
      }
    }

    // 5. Summary statistics
    const summary = {
      hdfc_account: {
        id: hdfc.id,
        name: hdfc.name,
        account_number: hdfc.account_number,
        current_balance: hdfc.current_balance
      },
      transaction_analysis: {
        total_bank_transactions: bankTransactions?.length || 0,
        expense_transactions: expenseTransactions.length,
        cash_expenses_in_bank: analysisResults.filter(r => r.is_cash_expense).length,
        non_cash_expenses_in_bank: analysisResults.filter(r => r.should_exist_in_bank && !r.is_cash_expense).length
      },
      sample_analysis: analysisResults
    };

    return NextResponse.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Error analyzing HDFC transactions:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze transactions'
    }, { status: 500 });
  }
}