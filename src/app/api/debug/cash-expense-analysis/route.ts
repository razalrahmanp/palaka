// API to analyze and clean up cash expenses in bank transactions
import { NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    console.log('🔍 Analyzing cash expenses in bank transactions...');

    // 1. Get all payments
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select('id, method, amount, payment_date, description')
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
    }

    // 2. Get all bank transactions
    const { data: bankTransactions, error: bankError } = await supabaseAdmin
      .from('bank_transactions')
      .select('id, date, type, amount, description, reference, bank_account_id')
      .order('date', { ascending: false });

    if (bankError) {
      console.error('Error fetching bank transactions:', bankError);
      return NextResponse.json({ error: 'Failed to fetch bank transactions' }, { status: 500 });
    }

    // 3. Get all expenses
    const { data: expenses, error: expensesError } = await supabaseAdmin
      .from('expenses')
      .select('id, date, amount, description, payment_method, created_at')
      .order('date', { ascending: false });

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError);
      return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
    }

    // 4. Analyze cash payments vs bank transactions
    const cashPayments = payments?.filter(p => p.method === 'cash' || p.method === 'CASH') || [];
    const cashExpenses = expenses?.filter(e => e.payment_method === 'cash' || e.payment_method === 'CASH') || [];
    
    // 5. Find bank transactions that look like they came from cash expenses
    const expenseBankTransactions = bankTransactions?.filter(bt => 
      bt.description?.includes('Expense:')
    ) || [];

    // 6. Try to match expense bank transactions to actual expenses
    const cashExpenseMatches = [];
    const nonCashExpenseMatches = [];

    for (const bankTx of expenseBankTransactions) {
      // Extract expense description from bank transaction
      const match = bankTx.description?.match(/Expense: (.+?)(?:\s*\[|\s*\(via|$)/);
      const expenseDesc = match ? match[1].trim() : null;

      if (expenseDesc) {
        // Try to find matching expense
        const matchingExpense = expenses?.find(exp => 
          exp.description === expenseDesc && 
          Math.abs(exp.amount - bankTx.amount) < 0.01 &&
          exp.date === bankTx.date
        );

        if (matchingExpense) {
          if (matchingExpense.payment_method === 'cash' || matchingExpense.payment_method === 'CASH') {
            cashExpenseMatches.push({
              bankTransactionId: bankTx.id,
              expenseId: matchingExpense.id,
              description: expenseDesc,
              amount: bankTx.amount,
              date: bankTx.date,
              bankAccountId: bankTx.bank_account_id
            });
          } else {
            nonCashExpenseMatches.push({
              bankTransactionId: bankTx.id,
              expenseId: matchingExpense.id,
              description: expenseDesc,
              amount: bankTx.amount,
              date: bankTx.date,
              paymentMethod: matchingExpense.payment_method
            });
          }
        }
      }
    }

    const analysis = {
      summary: {
        totalPayments: payments?.length || 0,
        totalBankTransactions: bankTransactions?.length || 0,
        totalExpenses: expenses?.length || 0,
        cashPayments: cashPayments.length,
        cashExpenses: cashExpenses.length,
        expenseRelatedBankTransactions: expenseBankTransactions.length
      },
      issues: {
        cashExpensesWithBankTransactions: cashExpenseMatches.length,
        inappropriateBankTransactions: cashExpenseMatches
      },
      nonCashExpenses: {
        properBankTransactions: nonCashExpenseMatches.length,
        transactions: nonCashExpenseMatches.slice(0, 5) // Sample
      }
    };

    console.log('Analysis completed:', analysis);

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Error analyzing transactions:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze transactions'
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log('🧹 Starting cleanup of cash expense bank transactions...');

    // Run the same analysis logic directly instead of making an internal fetch
    const { data: expenses, error: expensesError } = await supabaseAdmin
      .from('expenses')
      .select('id, date, amount, description, payment_method, created_at')
      .order('date', { ascending: false });

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError);
      return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
    }

    const { data: bankTransactions, error: bankError } = await supabaseAdmin
      .from('bank_transactions')
      .select('id, date, type, amount, description, reference, bank_account_id')
      .order('date', { ascending: false });

    if (bankError) {
      console.error('Error fetching bank transactions:', bankError);
      return NextResponse.json({ error: 'Failed to fetch bank transactions' }, { status: 500 });
    }

    // Find bank transactions that look like they came from cash expenses
    const expenseBankTransactions = bankTransactions?.filter(bt => 
      bt.description?.includes('Expense:')
    ) || [];

    // Match expense bank transactions to actual cash expenses
    const cashExpenseMatches = [];

    for (const bankTx of expenseBankTransactions) {
      // Extract expense description from bank transaction
      const match = bankTx.description?.match(/Expense: (.+?)(?:\s*\[|\s*\(via|$)/);
      const expenseDesc = match ? match[1].trim() : null;

      if (expenseDesc) {
        // Try to find matching expense
        const matchingExpense = expenses?.find(exp => 
          exp.description === expenseDesc && 
          Math.abs(exp.amount - bankTx.amount) < 0.01 &&
          exp.date === bankTx.date
        );

        if (matchingExpense && (matchingExpense.payment_method === 'cash' || matchingExpense.payment_method === 'CASH')) {
          cashExpenseMatches.push({
            bankTransactionId: bankTx.id,
            expenseId: matchingExpense.id,
            description: expenseDesc,
            amount: bankTx.amount,
            date: bankTx.date,
            bankAccountId: bankTx.bank_account_id
          });
        }
      }
    }
    
    console.log(`Found ${cashExpenseMatches.length} inappropriate bank transactions to remove`);

    let deletedCount = 0;
    const deletionResults = [];

    // Delete each inappropriate bank transaction (limit to 50 for safety)
    const transactionsToDelete = cashExpenseMatches.slice(0, 50);

    for (const match of transactionsToDelete) {
      try {
        const { error: deleteError } = await supabaseAdmin
          .from('bank_transactions')
          .delete()
          .eq('id', match.bankTransactionId);

        if (deleteError) {
          console.error(`Failed to delete bank transaction ${match.bankTransactionId}:`, deleteError);
          deletionResults.push({
            bankTransactionId: match.bankTransactionId,
            success: false,
            error: deleteError.message
          });
        } else {
          deletedCount++;
          console.log(`✅ Deleted bank transaction: ${match.description} (₹${match.amount})`);
          deletionResults.push({
            bankTransactionId: match.bankTransactionId,
            success: true,
            description: match.description,
            amount: match.amount,
            date: match.date
          });
        }
      } catch (error) {
        console.error(`Error deleting bank transaction ${match.bankTransactionId}:`, error);
        deletionResults.push({
          bankTransactionId: match.bankTransactionId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const summary = {
      totalInappropriateTransactions: cashExpenseMatches.length,
      processedInThisBatch: transactionsToDelete.length,
      successfullyDeleted: deletedCount,
      failed: deletionResults.filter(r => !r.success).length,
      remainingToProcess: Math.max(0, cashExpenseMatches.length - transactionsToDelete.length),
      results: deletionResults
    };

    console.log('Cleanup completed:', summary);

    return NextResponse.json({
      success: true,
      message: `Cleanup batch completed: ${deletedCount} inappropriate bank transactions removed`,
      summary
    });

  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup transactions'
    }, { status: 500 });
  }
}