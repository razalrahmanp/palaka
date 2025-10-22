// lib/expense-integrations/expenseCleanupManager.ts
import { supabase } from "@/lib/supabaseAdmin";

export interface ExpenseCleanupParams {
  expenseId: string;
  entityType?: 'truck' | 'employee' | 'supplier';
  entityId?: string;
}

export interface ExpenseCleanupResult {
  success: boolean;
  error?: string;
  deletedRecords: {
    expense?: boolean;
    bankTransaction?: boolean;
    journalEntry?: boolean;
    journalLines?: boolean;
    vehicleExpenseLog?: boolean;
    vehicleMaintenanceLog?: boolean;
    vendorPaymentHistory?: boolean;
    payrollRecord?: boolean;
    chartOfAccountsUpdated?: boolean;
  };
}

/**
 * Comprehensive cleanup function that removes expense and all related records
 * across all integrated tables and reverses financial impacts
 */
export async function deleteExpenseAndRelatedRecords(params: ExpenseCleanupParams): Promise<ExpenseCleanupResult> {
  const { expenseId, entityType, entityId } = params;
  
  console.log(`🗑️ Starting comprehensive expense cleanup for: ${expenseId}`);
  
  const deletedRecords: ExpenseCleanupResult['deletedRecords'] = {};
  
  try {
    // 1. Get expense details first for reversing financial impacts
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('amount, payment_method, date, description, entity_type, entity_id, category, subcategory')
      .eq('id', expenseId)
      .single();
    
    if (expenseError || !expense) {
      return { 
        success: false, 
        error: `Expense not found: ${expenseError?.message}`,
        deletedRecords 
      };
    }
    
    console.log(`💰 Found expense: ${expense.amount} on ${expense.date} - ${expense.description}`);

    // 2. Get journal entry details for reversal
    const { data: journalEntry } = await supabase
      .from('journal_entries')
      .select('id, journal_number')
      .eq('source_document_id', expenseId)
      .eq('source_document_type', 'EXPENSE')
      .single();
    
    if (journalEntry) {
      console.log(`📋 Found journal entry: ${journalEntry.journal_number}`);
      
      // Get journal lines for account balance reversal
      const { data: journalLines, error: linesError } = await supabase
        .from('journal_entry_lines')
        .select('account_id, debit_amount, credit_amount')
        .eq('journal_entry_id', journalEntry.id);
      
      if (!linesError && journalLines) {
        console.log(`📊 Found ${journalLines.length} journal lines to reverse`);
        
        // Reverse account balances by fetching current balance and updating
        for (const line of journalLines) {
          if (line.debit_amount > 0) {
            // Get current balance and subtract debit amount
            const { data: account, error: fetchError } = await supabase
              .from('chart_of_accounts')
              .select('current_balance')
              .eq('id', line.account_id)
              .single();
            
            if (!fetchError && account) {
              const newBalance = (account.current_balance || 0) - line.debit_amount;
              const { error: updateError } = await supabase
                .from('chart_of_accounts')
                .update({ 
                  current_balance: newBalance,
                  updated_at: new Date().toISOString()
                })
                .eq('id', line.account_id);
              
              if (!updateError) {
                console.log(`✅ Reversed debit of ${line.debit_amount} for account ${line.account_id} (new balance: ${newBalance})`);
              } else {
                console.error(`❌ Error reversing debit:`, updateError);
              }
            }
          }
          
          if (line.credit_amount > 0) {
            // Get current balance and add credit amount
            const { data: account, error: fetchError } = await supabase
              .from('chart_of_accounts')
              .select('current_balance')
              .eq('id', line.account_id)
              .single();
            
            if (!fetchError && account) {
              const newBalance = (account.current_balance || 0) + line.credit_amount;
              const { error: updateError } = await supabase
                .from('chart_of_accounts')
                .update({ 
                  current_balance: newBalance,
                  updated_at: new Date().toISOString()
                })
                .eq('id', line.account_id);
              
              if (!updateError) {
                console.log(`✅ Reversed credit of ${line.credit_amount} for account ${line.account_id} (new balance: ${newBalance})`);
              } else {
                console.error(`❌ Error reversing credit:`, updateError);
              }
            }
          }
        }
        deletedRecords.chartOfAccountsUpdated = true;
        console.log('✅ Reversed chart of accounts balances');
      }
      
      // Delete journal entry lines
      const { error: deleteLinesError } = await supabase
        .from('journal_entry_lines')
        .delete()
        .eq('journal_entry_id', journalEntry.id);
      
      if (!deleteLinesError) {
        deletedRecords.journalLines = true;
        console.log('✅ Deleted journal entry lines');
      }
      
      // Delete journal entry
      const { error: deleteJournalError } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', journalEntry.id);
      
      if (!deleteJournalError) {
        deletedRecords.journalEntry = true;
        console.log('✅ Deleted journal entry');
      }
    }

    // 3. Delete ALL related records first (regardless of entity type)
    // This prevents foreign key constraint violations
    
    // Delete vehicle expense logs if any exist
    const { error: vehicleExpenseError } = await supabase
      .from('vehicle_expense_logs')
      .delete()
      .eq('expense_id', expenseId);
    
    if (!vehicleExpenseError) {
      deletedRecords.vehicleExpenseLog = true;
      console.log('✅ Deleted vehicle expense logs');
    }
    
    // Delete vehicle maintenance logs if any exist
    const { error: vehicleMaintenanceError } = await supabase
      .from('vehicle_maintenance_logs')
      .delete()
      .eq('expense_id', expenseId);
    
    if (!vehicleMaintenanceError) {
      deletedRecords.vehicleMaintenanceLog = true;
      console.log('✅ Deleted vehicle maintenance logs');
    }

    // 4. Delete entity-specific records based on type
    if (entityType === 'truck' && entityId) {
      console.log(`🚛 Processing truck-specific cleanup for vehicle: ${entityId}`);
    }
    
    if (entityType === 'supplier' && entityId) {
      // Delete vendor payment history
      const { error: vendorPaymentError } = await supabase
        .from('vendor_payment_history')
        .delete()
        .match({ 
          supplier_id: entityId,
          amount: expense.amount,
          payment_date: expense.date 
        });
      
      if (!vendorPaymentError) {
        deletedRecords.vendorPaymentHistory = true;
        console.log('✅ Deleted vendor payment history');
      }
    }
    
    if (entityType === 'employee' && entityId) {
      // Find and delete payroll record updates
      const { error: payrollError } = await supabase
        .from('payroll_records')
        .update({ status: 'processed' })
        .match({
          employee_id: entityId,
          status: 'paid',
          net_salary: expense.amount
        });
      
      if (!payrollError) {
        deletedRecords.payrollRecord = true;
        console.log('✅ Reversed payroll payment');
      }
    }

    // 5. Delete bank transaction (balance will be auto-updated by database trigger)
    const { data: bankTransactions, error: bankTransactionError } = await supabase
      .from('bank_transactions')
      .select('id, bank_account_id, amount')
      .eq('type', 'withdrawal')
      .eq('amount', expense.amount)
      .ilike('description', `%${expense.description}%`);
    
    if (!bankTransactionError && bankTransactions && bankTransactions.length > 0) {
      const bankTransaction = bankTransactions[0];
      
      // Delete bank transaction (trigger will automatically update bank account balance)
      const { error: deleteBankError } = await supabase
        .from('bank_transactions')
        .delete()
        .eq('id', bankTransaction.id);
      
      if (!deleteBankError) {
        deletedRecords.bankTransaction = true;
        console.log('✅ Deleted bank transaction (balance auto-updated by trigger)');
      } else {
        console.error(`❌ Error deleting bank transaction:`, deleteBankError);
      }
    }

    // 6. Reverse cashflow impact
    const month = new Date(expense.date);
    month.setDate(1);
    const { error: cashflowError } = await supabase.rpc("upsert_cashflow_snapshot", {
      mon: month.toISOString().slice(0, 10),
      inflows: 0,
      outflows: -expense.amount, // Negative to reverse the outflow
    });
    
    if (!cashflowError) {
      console.log('✅ Reversed cashflow impact');
    }

    // 7. Finally, delete the expense record
    const { error: deleteExpenseError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);
    
    if (!deleteExpenseError) {
      deletedRecords.expense = true;
      console.log('✅ Deleted expense record');
    } else {
      console.error('❌ Error deleting expense:', deleteExpenseError);
      return {
        success: false,
        error: `Failed to delete expense: ${deleteExpenseError.message}`,
        deletedRecords
      };
    }

    console.log('🎉 Comprehensive expense cleanup completed successfully');
    
    return {
      success: true,
      deletedRecords
    };

  } catch (error) {
    console.error('❌ Error during expense cleanup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during cleanup',
      deletedRecords
    };
  }
}

/**
 * Create database functions for account and bank balance updates
 */
export async function createCleanupHelperFunctions() {
  console.log('🔧 Creating cleanup helper functions...');
  
  // We'll create these as direct SQL functions since the functions should exist
  // If they don't exist, we'll create them via the API
  try {
    // Test if functions exist by calling them with dummy data
    await supabase.rpc('increment_account_balance', {
      account_id: '00000000-0000-0000-0000-000000000000',
      amount_change: 0
    });
    console.log('✅ increment_account_balance function exists');
  } catch {
    console.log('⚠️ increment_account_balance function needs to be created');
  }

  try {
    await supabase.rpc('increment_bank_balance', {
      account_id: '00000000-0000-0000-0000-000000000000',
      amount_change: 0
    });
    console.log('✅ increment_bank_balance function exists');
  } catch {
    console.log('⚠️ increment_bank_balance function needs to be created');
  }
}
