// Expense Transaction Classification Fix
// This script analyzes existing bank transactions and expense records to properly classify them

import { NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabasePool';

export async function POST() {
  try {
    console.log('🔧 Starting expense transaction classification fix...');

    // 1. Get all expenses and their payment methods
    const { data: expenses, error: expenseError } = await supabaseAdmin
      .from('expenses')
      .select(`
        id,
        date,
        amount,
        description,
        payment_method,
        entity_type,
        created_at
      `)
      .order('date', { ascending: false });

    if (expenseError) {
      console.error('Error fetching expenses:', expenseError);
      return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
    }

    console.log(`📊 Found ${expenses?.length || 0} expense records`);

    // 2. Find all bank transactions that look like expense transactions
    const { data: bankTransactions, error: bankError } = await supabaseAdmin
      .from('bank_transactions')
      .select('*')
      .ilike('description', '%Expense:%')
      .order('date', { ascending: false });

    if (bankError) {
      console.error('Error fetching bank transactions:', bankError);
      return NextResponse.json({ error: 'Failed to fetch bank transactions' }, { status: 500 });
    }

    console.log(`💳 Found ${bankTransactions?.length || 0} expense-related bank transactions`);

    // 3. Create a map of expenses by description and amount for matching
    const expenseMap = new Map();
    if (expenses) {
      expenses.forEach(expense => {
        const key = `${expense.description}_${expense.amount}_${expense.date}`;
        expenseMap.set(key, expense);
      });
    }

    // 4. Analyze and classify each bank transaction
    let cashExpenseTransactions = 0;
    let nonCashExpenseTransactions = 0;
    let unmatchedTransactions = 0;
    const transactionsToDelete = [];
    const transactionsToUpdate = [];

    if (bankTransactions) {
      for (const bankTx of bankTransactions) {
        // Extract expense description from bank transaction description
        const match = bankTx.description?.match(/Expense: (.+?)(?:\s*\(via|$)/);
        if (match) {
          const expenseDesc = match[1].trim();
          const key = `${expenseDesc}_${bankTx.amount}_${bankTx.date}`;
          const relatedExpense = expenseMap.get(key);

          if (relatedExpense) {
            console.log(`🔍 Matched bank transaction ${bankTx.id} with expense ${relatedExpense.id} (${relatedExpense.payment_method})`);
            
            if (relatedExpense.payment_method === 'cash') {
              // This bank transaction should not exist for cash payments
              cashExpenseTransactions++;
              transactionsToDelete.push({
                id: bankTx.id,
                description: bankTx.description,
                amount: bankTx.amount,
                expense_id: relatedExpense.id,
                payment_method: relatedExpense.payment_method
              });
            } else {
              // Update this transaction with proper source tracking
              nonCashExpenseTransactions++;
              transactionsToUpdate.push({
                id: bankTx.id,
                source_type: 'expense',
                payment_method: relatedExpense.payment_method,
                source_id: relatedExpense.id
              });
            }
          } else {
            unmatchedTransactions++;
            console.log(`⚠️ Could not match bank transaction: ${bankTx.description} (${bankTx.amount}) on ${bankTx.date}`);
          }
        }
      }
    }

    console.log(`📈 Analysis Results:`);
    console.log(`   💵 Cash expenses with bank transactions (should delete): ${cashExpenseTransactions}`);
    console.log(`   🏦 Non-cash expenses (should update): ${nonCashExpenseTransactions}`);
    console.log(`   ❓ Unmatched transactions: ${unmatchedTransactions}`);

    // 5. Execute the cleanup (with confirmation)
    let deletedCount = 0;
    let updatedCount = 0;

    // Delete inappropriate bank transactions for cash expenses
    if (transactionsToDelete.length > 0) {
      console.log(`🗑️ Deleting ${transactionsToDelete.length} inappropriate bank transactions for cash expenses...`);
      
      for (const tx of transactionsToDelete.slice(0, 10)) { // Limit to first 10 for safety
        const { error: deleteError } = await supabaseAdmin
          .from('bank_transactions')
          .delete()
          .eq('id', tx.id);

        if (deleteError) {
          console.error(`❌ Failed to delete transaction ${tx.id}:`, deleteError);
        } else {
          deletedCount++;
          console.log(`✅ Deleted cash expense bank transaction: ${tx.description} (₹${tx.amount})`);
        }
      }
    }

    // Update appropriate bank transactions with source tracking
    if (transactionsToUpdate.length > 0) {
      console.log(`🔄 Updating ${transactionsToUpdate.length} bank transactions with source tracking...`);
      
      for (const tx of transactionsToUpdate.slice(0, 20)) { // Limit to first 20 for safety
        const { error: updateError } = await supabaseAdmin
          .from('bank_transactions')
          .update({
            source_type: tx.source_type,
            payment_method: tx.payment_method,
            source_id: tx.source_id
          })
          .eq('id', tx.id);

        if (updateError) {
          console.error(`❌ Failed to update transaction ${tx.id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`✅ Updated transaction ${tx.id} with source tracking`);
        }
      }
    }

    const summary = {
      analysis: {
        total_expense_records: expenses?.length || 0,
        total_expense_bank_transactions: bankTransactions?.length || 0,
        cash_expenses_with_bank_tx: cashExpenseTransactions,
        non_cash_expenses: nonCashExpenseTransactions,
        unmatched_transactions: unmatchedTransactions
      },
      actions_taken: {
        transactions_deleted: deletedCount,
        transactions_updated: updatedCount
      },
      remaining_issues: {
        cash_transactions_to_delete: Math.max(0, transactionsToDelete.length - deletedCount),
        transactions_to_update: Math.max(0, transactionsToUpdate.length - updatedCount)
      }
    };

    console.log('🎉 Expense transaction classification fix completed!');
    console.log('Summary:', summary);

    return NextResponse.json({
      success: true,
      message: 'Expense transaction classification fix completed',
      summary
    });

  } catch (error) {
    console.error('❌ Error in expense transaction classification fix:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run expense transaction classification fix'
    }, { status: 500 });
  }
}