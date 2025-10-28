import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

interface BankTransaction {
  id: string;
  bank_account_id?: string;
  date: string;
  type: string;
  amount: number;
  description?: string;
  reference?: string;
  created_at?: string;
}

interface Expense {
  id: string;
  date: string;
  category: string;
  description?: string;
  amount: number;
  payment_method?: string;
  created_by?: string;
  created_at?: string;
}

export async function GET() {
  try {
    console.log('🔍 Analyzing bank transactions and expenses for duplicates...');

    // Fetch all expenses
    const allExpenses: Record<string, unknown>[] = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: expensesPage, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (expensesError) {
        throw new Error(`Failed to fetch expenses page ${page}: ${expensesError.message}`);
      }
      
      if (!expensesPage || expensesPage.length === 0) {
        break;
      }
      
      allExpenses.push(...expensesPage);
      
      if (expensesPage.length < pageSize) {
        break;
      }
      
      page++;
    }

    // Fetch all bank transactions
    const { data: bankTransactions, error: btError } = await supabase
      .from('bank_transactions')
      .select('*')
      .order('date', { ascending: false });

    if (btError) {
      throw new Error(`Failed to fetch bank transactions: ${btError.message}`);
    }

    // Analyze duplicates in bank_transactions
    const expenseReferences = bankTransactions?.filter(bt => bt.reference && bt.reference.startsWith('EXP-')) || [];
    const referenceMap = new Map<string, BankTransaction[]>();
    const duplicateReferences: Array<{ reference: string, transactions: BankTransaction[] }> = [];

    expenseReferences.forEach(bt => {
      if (bt.reference) {
        if (!referenceMap.has(bt.reference)) {
          referenceMap.set(bt.reference, []);
        }
        referenceMap.get(bt.reference)!.push(bt);
      }
    });

    referenceMap.forEach((transactions, reference) => {
      if (transactions.length > 1) {
        duplicateReferences.push({ reference, transactions });
      }
    });

    // Analyze amount/date duplicates
    const amountDateMap = new Map<string, BankTransaction[]>();
    const duplicateAmountDate: Array<{ key: string, transactions: BankTransaction[] }> = [];

    bankTransactions?.forEach(bt => {
      const key = `${bt.date}_${bt.amount}_${bt.type}`;
      if (!amountDateMap.has(key)) {
        amountDateMap.set(key, []);
      }
      amountDateMap.get(key)!.push(bt);
    });

    amountDateMap.forEach((transactions, key) => {
      if (transactions.length > 1) {
        duplicateAmountDate.push({ key, transactions });
      }
    });

    // Cross-reference with expenses
    const expenseById = new Map(allExpenses.map(exp => [exp.id, exp]));
    const orphanedBankTransactions: BankTransaction[] = [];
    const validBankTransactions: (BankTransaction & { matched_expense: Expense })[] = [];

    expenseReferences.forEach(bt => {
      const expenseId = bt.reference?.replace('EXP-', '');
      if (expenseId && expenseById.has(expenseId)) {
        validBankTransactions.push({
          ...bt,
          matched_expense: expenseById.get(expenseId)
        });
      } else {
        orphanedBankTransactions.push(bt);
      }
    });

    // Identify expenses without bank transactions
    const expenseIdsWithTransactions = new Set(
      expenseReferences.map(bt => bt.reference?.replace('EXP-', ''))
    );
    const expensesWithoutTransactions = allExpenses.filter(
      exp => !expenseIdsWithTransactions.has(exp.id)
    );

    const analysis = {
      summary: {
        totalExpenses: allExpenses.length,
        totalBankTransactions: bankTransactions?.length || 0,
        expenseRelatedTransactions: expenseReferences.length,
        duplicateReferences: duplicateReferences.length,
        duplicateAmountDate: duplicateAmountDate.length,
        orphanedTransactions: orphanedBankTransactions.length,
        expensesWithoutTransactions: expensesWithoutTransactions.length
      },
      duplicates: {
        byReference: duplicateReferences.slice(0, 10), // Show first 10
        byAmountDate: duplicateAmountDate.slice(0, 10), // Show first 10
      },
      orphaned: orphanedBankTransactions.slice(0, 10), // Show first 10
      unmatched_expenses: expensesWithoutTransactions.slice(0, 10), // Show first 10
      sample_valid_matches: validBankTransactions.slice(0, 5),
      cleanup_recommendations: [
        duplicateReferences.length > 0 ? `Remove ${duplicateReferences.reduce((sum, dup) => sum + dup.transactions.length - 1, 0)} duplicate reference transactions` : null,
        duplicateAmountDate.length > 0 ? `Investigate ${duplicateAmountDate.length} potential duplicate amount/date combinations` : null,
        orphanedBankTransactions.length > 0 ? `Clean up ${orphanedBankTransactions.length} orphaned bank transactions` : null,
        expensesWithoutTransactions.length > 0 ? `Create bank transactions for ${expensesWithoutTransactions.length} unmatched expenses` : null
      ].filter(Boolean)
    };

    return NextResponse.json({
      success: true,
      analysis,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Error analyzing duplicates:', error);
    return NextResponse.json({
      error: 'Failed to analyze duplicates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    console.log('🧹 Starting cleanup of duplicate bank transactions...');

    const { data: bankTransactions, error: btError } = await supabase
      .from('bank_transactions')
      .select('*')
      .order('created_at', { ascending: true }); // Get oldest first

    if (btError) {
      throw new Error(`Failed to fetch bank transactions: ${btError.message}`);
    }

    // Group by reference
    const referenceGroups = new Map<string, BankTransaction[]>();
    bankTransactions?.forEach(bt => {
      if (bt.reference && bt.reference.startsWith('EXP-')) {
        if (!referenceGroups.has(bt.reference)) {
          referenceGroups.set(bt.reference, []);
        }
        referenceGroups.get(bt.reference)!.push(bt);
      }
    });

    // Identify duplicates to delete (keep the oldest one)
    const transactionsToDelete: string[] = [];
    const duplicatesFound: Array<{ reference: string, kept: BankTransaction, deleted: BankTransaction[] }> = [];

    referenceGroups.forEach((transactions, reference) => {
      if (transactions.length > 1) {
        // Sort by created_at to keep the oldest
        transactions.sort((a: BankTransaction, b: BankTransaction) => {
          const aTime = new Date(a.created_at || '').getTime();
          const bTime = new Date(b.created_at || '').getTime();
          return aTime - bTime;
        });
        
        const [kept, ...toDelete] = transactions;
        toDelete.forEach((bt: BankTransaction) => transactionsToDelete.push(bt.id));
        
        duplicatesFound.push({
          reference,
          kept,
          deleted: toDelete
        });
      }
    });

    console.log(`🧹 Found ${transactionsToDelete.length} duplicate transactions to delete`);

    let deletedCount = 0;
    const errors: string[] = [];

    // Delete duplicates in batches
    if (transactionsToDelete.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < transactionsToDelete.length; i += batchSize) {
        const batch = transactionsToDelete.slice(i, i + batchSize);
        
        const { error: deleteError } = await supabase
          .from('bank_transactions')
          .delete()
          .in('id', batch);

        if (deleteError) {
          console.error(`❌ Batch ${i / batchSize + 1} delete failed:`, deleteError.message);
          errors.push(`Batch ${i / batchSize + 1}: ${deleteError.message}`);
        } else {
          deletedCount += batch.length;
          console.log(`✅ Batch ${i / batchSize + 1} deleted ${batch.length} transactions`);
        }
      }
    }

    // Verify cleanup
    const { data: remainingTransactions, error: verifyError } = await supabase
      .from('bank_transactions')
      .select('reference')
      .like('reference', 'EXP-%');

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
    }

    const remainingReferences = new Set(remainingTransactions?.map(bt => bt.reference) || []);
    const stillDuplicated: string[] = [];
    
    referenceGroups.forEach((transactions, reference) => {
      if (transactions.length > 1 && remainingReferences.has(reference)) {
        // Check if duplicates still exist
        const remaining = remainingTransactions?.filter(bt => bt.reference === reference) || [];
        if (remaining.length > 1) {
          stillDuplicated.push(reference);
        }
      }
    });

    const result = {
      success: true,
      cleanup_summary: {
        duplicatesFound: duplicatesFound.length,
        transactionsDeleted: deletedCount,
        errors: errors.length,
        stillDuplicated: stillDuplicated.length
      },
      details: {
        duplicates_processed: duplicatesFound.slice(0, 10), // Show first 10
        remaining_duplicates: stillDuplicated.slice(0, 10),
        errors: errors
      },
      verification: {
        remaining_expense_transactions: remainingReferences.size,
        cleanup_success_rate: duplicatesFound.length > 0 ? 
          Math.round(((duplicatesFound.length - stillDuplicated.length) / duplicatesFound.length) * 100) : 100
      }
    };

    console.log(`✅ Cleanup complete: ${deletedCount} transactions deleted, ${stillDuplicated.length} still duplicated`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('💥 Error in cleanup:', error);
    return NextResponse.json({
      error: 'Failed to cleanup duplicates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}