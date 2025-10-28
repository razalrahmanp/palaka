import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const { action } = await request.json();
    console.log(`🔄 Starting bank transaction population: ${action}`);

    if (action === 'populate_from_expenses') {
      return await populateBankTransactionsFromExpenses();
    }

    return NextResponse.json({
      error: 'Invalid action. Use "populate_from_expenses"'
    }, { status: 400 });

  } catch (error) {
    console.error('💥 Error in bank transaction population:', error);
    return NextResponse.json({
      error: 'Failed to populate bank transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function populateBankTransactionsFromExpenses() {
  try {
    console.log('📊 Step 1: Analyzing current expense coverage...');

    // Step 1: Analyze current state - fetch ALL expenses using pagination to bypass Supabase limits
    console.log('📊 Fetching all expenses (bypassing default limits)...');
    
    const allExpenses: Record<string, unknown>[] = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: expensesPage, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('amount', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (expensesError) {
        throw new Error(`Failed to fetch expenses page ${page}: ${expensesError.message}`);
      }
      
      if (!expensesPage || expensesPage.length === 0) {
        break; // No more data
      }
      
      allExpenses.push(...expensesPage);
      console.log(`📊 Fetched page ${page + 1}: ${expensesPage.length} expenses (total so far: ${allExpenses.length})`);
      
      if (expensesPage.length < pageSize) {
        break; // Last page
      }
      
      page++;
    }
    
    const expenses = allExpenses;
    console.log(`📊 Total expenses fetched: ${expenses.length}`);

    // Remove this - handled in the pagination loop above

    const { data: existingBankTransactions, error: btError } = await supabase
      .from('bank_transactions')
      .select('*');

    if (btError) {
      throw new Error(`Failed to fetch bank transactions: ${btError.message}`);
    }

    console.log('📊 Step 2: Identifying unmatched expenses...');

    // Find expenses that don't have corresponding bank transactions
    const unmatchedExpenses = expenses?.filter(expense => {
      return !existingBankTransactions?.some(bt => 
        bt.reference === `EXP-${expense.id}` ||
        (bt.date === expense.date && 
         Math.abs(parseFloat(bt.amount as string) - parseFloat(expense.amount as string)) < 0.01)
      );
    }) || [];

    console.log(`📊 Found ${unmatchedExpenses.length} unmatched expenses out of ${expenses?.length || 0} total`);

    // Step 2: Get available bank accounts
    const { data: bankAccounts, error: bankAccountsError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_active', true)
      .order('current_balance', { ascending: false });

    if (bankAccountsError) {
      throw new Error(`Failed to fetch bank accounts: ${bankAccountsError.message}`);
    }

    if (!bankAccounts || bankAccounts.length === 0) {
      throw new Error('No active bank accounts found. Please create at least one bank account.');
    }

    console.log(`📊 Found ${bankAccounts.length} active bank accounts`);

    // Step 3: Create bank account assignment logic
    function getBankAccountForExpense(expense: Record<string, unknown>, bankAccounts: Record<string, unknown>[]) {
      // If expense has bank_account_id, use it (if valid)
      if (expense.bank_account_id) {
        const existingAccount = bankAccounts.find(ba => ba.id === expense.bank_account_id);
        if (existingAccount) {
          return existingAccount.id;
        }
      }

      // For cash payments, try to find a cash account
      if (expense.payment_method && 
          ['cash', 'Cash', 'CASH'].includes(expense.payment_method as string)) {
        const cashAccount = bankAccounts.find(ba => ba.account_type === 'cash');
        if (cashAccount) {
          return cashAccount.id;
        }
      }

      // For bank-based payments, use primary bank account
      if (expense.payment_method && 
          ['bank_transfer', 'upi', 'card', 'cheque', 'online', 'bank'].includes(expense.payment_method as string)) {
        const bankAccount = bankAccounts.find(ba => 
          ['savings', 'current', 'checking'].includes(ba.account_type as string)
        );
        if (bankAccount) {
          return bankAccount.id;
        }
      }

      // Fallback: use the primary account (highest balance)
      return bankAccounts[0].id;
    }

    console.log('📊 Step 3: Creating bank transactions for unmatched expenses...');

    // Step 4: Create bank transactions for unmatched expenses (process more at once)
    const batchLimit = Math.min(200, unmatchedExpenses.length); // Process up to 200 at a time
    const bankTransactionsToCreate = unmatchedExpenses.slice(0, batchLimit).map(expense => {
      const bankAccountId = getBankAccountForExpense(expense, bankAccounts);
      
      return {
        bank_account_id: bankAccountId,
        date: expense.date,
        type: 'withdrawal',
        amount: parseFloat(expense.amount as string),
        description: `Expense: ${expense.category || 'Uncategorized'}${
          expense.description ? ` - ${(expense.description as string).substring(0, 100)}` : ''
        }${expense.payment_method ? ` [${expense.payment_method}]` : ''}`,
        reference: `EXP-${expense.id}`
      };
    });

    const createdTransactions: Record<string, unknown>[] = [];
    const creationErrors: string[] = [];

    if (bankTransactionsToCreate.length > 0) {
      console.log(`📊 Creating ${bankTransactionsToCreate.length} bank transactions...`);

      // Insert in batches to avoid timeout
      const batchSize = 50;
      for (let i = 0; i < bankTransactionsToCreate.length; i += batchSize) {
        const batch = bankTransactionsToCreate.slice(i, i + batchSize);
        
        const { data: batchCreated, error: batchError } = await supabase
          .from('bank_transactions')
          .insert(batch)
          .select();

        if (batchError) {
          console.error(`❌ Batch ${i / batchSize + 1} failed:`, batchError.message);
          creationErrors.push(`Batch ${i / batchSize + 1}: ${batchError.message}`);
        } else {
          createdTransactions.push(...(batchCreated || []));
          console.log(`✅ Batch ${i / batchSize + 1} created ${batchCreated?.length || 0} transactions`);
        }
      }
    }

    console.log('📊 Step 4: Verification and analysis...');

    // Step 5: Final verification
    const { data: updatedBankTransactions, error: verificationError } = await supabase
      .from('bank_transactions')
      .select('*')
      .like('reference', 'EXP-%');

    if (verificationError) {
      console.error('❌ Verification failed:', verificationError.message);
    }

    // Calculate final statistics
    const totalExpenseTransactions = updatedBankTransactions?.length || 0;
    const totalCreatedNow = createdTransactions.length;
    const totalAmountCreated = createdTransactions.reduce((sum, bt) => sum + parseFloat(bt.amount as string), 0);

    // Get updated coverage statistics
    const matchedExpensesAfter = expenses?.filter(expense => {
      return updatedBankTransactions?.some(bt => bt.reference === `EXP-${expense.id}`);
    }) || [];

    const coveragePercentage = expenses?.length > 0 
      ? Math.round((matchedExpensesAfter.length / expenses.length) * 100) 
      : 0;

    const result = {
      success: true,
      summary: {
        totalExpenses: expenses?.length || 0,
        expensesBeforeMatching: (expenses?.length || 0) - unmatchedExpenses.length,
        unmatchedExpenses: unmatchedExpenses.length,
        bankTransactionsCreated: totalCreatedNow,
        totalExpenseBankTransactions: totalExpenseTransactions,
        finalCoveragePercentage: coveragePercentage,
        totalAmountProcessed: totalAmountCreated
      },
      details: {
        availableBankAccounts: bankAccounts.length,
        bankAccountsUsed: [...new Set(bankTransactionsToCreate.map(bt => bt.bank_account_id))].length,
        batchProcessing: {
          totalBatches: Math.ceil(bankTransactionsToCreate.length / 50),
          errors: creationErrors
        }
      },
      samples: {
        createdTransactions: createdTransactions.slice(0, 5),
        remainingUnmatched: unmatchedExpenses.slice(totalCreatedNow, totalCreatedNow + 5),
        bankAccountMapping: bankAccounts.map(ba => ({
          id: ba.id,
          name: ba.account_name,
          type: ba.account_type,
          usageCount: bankTransactionsToCreate.filter(bt => bt.bank_account_id === ba.id).length
        }))
      },
      nextSteps: [
        `Review ${Math.max(0, unmatchedExpenses.length - totalCreatedNow)} remaining unmatched expenses`,
        'Verify bank account assignments are correct',
        'Run similar process for other financial tables (liability_payments, withdrawals, etc.)',
        'Set up automated bank transaction creation for future expenses'
      ]
    };

    console.log(`✅ Expense population complete: ${totalCreatedNow} transactions created, ${coveragePercentage}% coverage`);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('💥 Error in populateBankTransactionsFromExpenses:', error);
    throw error;
  }
}

export async function GET() {
  try {
    // Get current status of expense coverage
    console.log('📊 Getting current expense coverage status...');

    // Fetch all expenses using pagination to get actual count
    const allExpensesStatus: Record<string, unknown>[] = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: expensesPage, error: expensesPageError } = await supabase
        .from('expenses')
        .select('id, date, amount, category, payment_method')
        .order('date', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (expensesPageError) {
        throw new Error(`Failed to fetch expenses page ${page}: ${expensesPageError.message}`);
      }
      
      if (!expensesPage || expensesPage.length === 0) {
        break;
      }
      
      allExpensesStatus.push(...expensesPage);
      
      if (expensesPage.length < pageSize) {
        break;
      }
      
      page++;
    }
    
    const expenses = allExpensesStatus;

    const { data: expenseBankTransactions, error: btError } = await supabase
      .from('bank_transactions')
      .select('*')
      .like('reference', 'EXP-%');

    if (btError) {
      throw new Error(`Query failed: ${btError.message}`);
    }

    const matchedExpenses = expenses?.filter(expense => 
      expenseBankTransactions?.some(bt => bt.reference === `EXP-${expense.id}`)
    ) || [];

    const unmatchedExpenses = expenses?.filter(expense => 
      !expenseBankTransactions?.some(bt => bt.reference === `EXP-${expense.id}`)
    ) || [];

    const totalExpenseAmount = expenses?.reduce((sum, exp) => sum + parseFloat((exp.amount as string) || '0'), 0) || 0;
    const matchedAmount = matchedExpenses.reduce((sum, exp) => sum + parseFloat((exp.amount as string) || '0'), 0);
    const unmatchedAmount = unmatchedExpenses.reduce((sum, exp) => sum + parseFloat((exp.amount as string) || '0'), 0);

    const status = {
      expenses: {
        total: expenses?.length || 0,
        matched: matchedExpenses.length,
        unmatched: unmatchedExpenses.length,
        coveragePercentage: expenses?.length > 0 ? Math.round((matchedExpenses.length / expenses.length) * 100) : 0
      },
      amounts: {
        totalExpenseAmount: totalExpenseAmount,
        matchedAmount: matchedAmount,
        unmatchedAmount: unmatchedAmount,
        amountCoveragePercentage: totalExpenseAmount > 0 ? Math.round((matchedAmount / totalExpenseAmount) * 100) : 0
      },
      samples: {
        topUnmatchedExpenses: unmatchedExpenses.slice(0, 10),
        recentlyCreatedBankTransactions: expenseBankTransactions?.slice(0, 5) || []
      }
    };

    return NextResponse.json({
      success: true,
      status,
      ready_for_population: unmatchedExpenses.length > 0,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Error getting expense status:', error);
    return NextResponse.json({
      error: 'Failed to get expense status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}