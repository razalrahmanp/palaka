// app/api/finance/delete-employee-payment/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

interface DeletionDetails {
  expense_id?: string;
  payment_method?: string;
  amount?: number;
  bank_transaction_id?: string;
  cash_transaction_id?: string;
  balance_adjustment?: string;
  journal_entries_deleted?: number;
}

export async function POST(req: Request) {
  try {
    const { payroll_record_id, confirm } = await req.json();
    
    if (!confirm) {
      return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });
    }

    if (!payroll_record_id) {
      return NextResponse.json({ error: 'Payroll record ID required' }, { status: 400 });
    }

    console.log('🗑️ Starting comprehensive deletion for payroll record:', payroll_record_id);

    // Step 1: Get the payroll record details
    const { data: payrollRecord, error: payrollError } = await supabase
      .from('payroll_records')
      .select('*')
      .eq('id', payroll_record_id)
      .single();

    if (payrollError || !payrollRecord) {
      console.error('❌ Payroll record not found:', payrollError);
      return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 });
    }

    console.log('📋 Found payroll record:', {
      employee_id: payrollRecord.employee_id,
      amount: payrollRecord.net_salary,
      date: payrollRecord.pay_period_start
    });

    const deletionResults = {
      payroll_record: false,
      expense_record: false,
      bank_transaction: false,
      cash_transaction: false,
      bank_balance_updated: false,
      journal_entries: false,
      details: {} as DeletionDetails
    };

    // Step 2: Find and process the linked expense record
    let linkedExpense = null;
    
    // Try to find expense by entity_reference_id first
    const { data: expenseByRef, error: expenseRefError } = await supabase
      .from('expenses')
      .select('*')
      .eq('entity_reference_id', payroll_record_id)
      .eq('entity_type', 'employee')
      .eq('entity_id', payrollRecord.employee_id);

    if (!expenseRefError && expenseByRef && expenseByRef.length > 0) {
      linkedExpense = expenseByRef[0];
    } else {
      // Try to find by date and amount match
      const { data: expenseByMatch, error: expenseMatchError } = await supabase
        .from('expenses')
        .select('*')
        .eq('entity_type', 'employee')
        .eq('entity_id', payrollRecord.employee_id)
        .eq('date', payrollRecord.pay_period_start)
        .eq('amount', payrollRecord.net_salary);

      if (!expenseMatchError && expenseByMatch && expenseByMatch.length > 0) {
        linkedExpense = expenseByMatch[0];
      }
    }

    if (linkedExpense) {
      console.log('💰 Found linked expense:', linkedExpense.id);
      deletionResults.details.expense_id = linkedExpense.id;
      deletionResults.details.payment_method = linkedExpense.payment_method;
      deletionResults.details.amount = linkedExpense.amount;

      // Step 3: Handle bank transaction deletion and balance reversal
      if (linkedExpense.payment_method !== 'cash') {
        console.log('🏦 Processing bank transaction deletion...');
        
        // Find bank transactions for this expense (created around the same time)
        const expenseDate = linkedExpense.date;
        const expenseAmount = linkedExpense.amount;
        
        const { data: bankTransactions, error: bankTxError } = await supabase
          .from('bank_transactions')
          .select('*')
          .eq('date', expenseDate)
          .eq('amount', expenseAmount)
          .eq('type', 'withdrawal')
          .ilike('description', `%${linkedExpense.description}%`);

        if (!bankTxError && bankTransactions && bankTransactions.length > 0) {
          const bankTransaction = bankTransactions[0];
          console.log('🏦 Found bank transaction:', bankTransaction.id);
          
          // Delete the bank transaction
          const { error: deleteBankTxError } = await supabase
            .from('bank_transactions')
            .delete()
            .eq('id', bankTransaction.id);

          if (!deleteBankTxError) {
            deletionResults.bank_transaction = true;
            deletionResults.details.bank_transaction_id = bankTransaction.id;
            console.log('✅ Deleted bank transaction');

            // Reverse the bank account balance
            const { data: bankAccount, error: bankAccountError } = await supabase
              .from('bank_accounts')
              .select('current_balance')
              .eq('id', bankTransaction.bank_account_id)
              .single();

            if (!bankAccountError && bankAccount) {
              const newBalance = (bankAccount.current_balance || 0) + expenseAmount;
              
              const { error: updateBalanceError } = await supabase
                .from('bank_accounts')
                .update({ current_balance: newBalance })
                .eq('id', bankTransaction.bank_account_id);

              if (!updateBalanceError) {
                deletionResults.bank_balance_updated = true;
                deletionResults.details.balance_adjustment = `+₹${expenseAmount}`;
                console.log(`✅ Reversed bank balance: +₹${expenseAmount}`);
              }
            }
          }
        }
      } else {
        console.log('💵 Processing cash transaction deletion...');
        
        // Find and delete cash transactions
        const { data: cashTransactions, error: cashTxError } = await supabase
          .from('cash_transactions')
          .select('*')
          .eq('transaction_date', linkedExpense.date)
          .eq('amount', -linkedExpense.amount) // Cash transactions are negative for expenses
          .eq('transaction_type', 'DEBIT')
          .eq('source_type', 'expense')
          .eq('source_id', linkedExpense.id);

        if (!cashTxError && cashTransactions && cashTransactions.length > 0) {
          const cashTransaction = cashTransactions[0];
          console.log('💵 Found cash transaction:', cashTransaction.id);
          
          // Delete the cash transaction
          const { error: deleteCashTxError } = await supabase
            .from('cash_transactions')
            .delete()
            .eq('id', cashTransaction.id);

          if (!deleteCashTxError) {
            deletionResults.cash_transaction = true;
            deletionResults.details.cash_transaction_id = cashTransaction.id;
            console.log('✅ Deleted cash transaction');

            // Update cash balance (reverse the debit)
            const { data: cashAccount, error: cashAccountError } = await supabase
              .from('bank_accounts')
              .select('current_balance')
              .eq('id', cashTransaction.cash_account_id)
              .eq('account_type', 'CASH')
              .single();

            if (!cashAccountError && cashAccount) {
              const newBalance = (cashAccount.current_balance || 0) + linkedExpense.amount;
              
              const { error: updateCashError } = await supabase
                .from('bank_accounts')
                .update({ current_balance: newBalance })
                .eq('id', cashTransaction.cash_account_id);

              if (!updateCashError) {
                deletionResults.bank_balance_updated = true;
                deletionResults.details.balance_adjustment = `+₹${linkedExpense.amount}`;
                console.log(`✅ Reversed cash balance: +₹${linkedExpense.amount}`);
              }
            }
          }
        }
      }

      // Step 4: Delete journal entries related to the expense
      console.log('📝 Deleting journal entries...');
      
      const { data: journalEntries, error: journalError } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('source_document_type', 'expense')
        .eq('source_document_id', linkedExpense.id);

      if (!journalError && journalEntries && journalEntries.length > 0) {
        for (const journal of journalEntries) {
          // Delete journal entry lines first
          await supabase
            .from('journal_entry_lines')
            .delete()
            .eq('journal_entry_id', journal.id);

          // Delete general ledger entries
          await supabase
            .from('general_ledger')
            .delete()
            .eq('journal_entry_id', journal.id);

          // Delete journal entry
          await supabase
            .from('journal_entries')
            .delete()
            .eq('id', journal.id);
        }
        
        deletionResults.journal_entries = true;
        deletionResults.details.journal_entries_deleted = journalEntries.length;
        console.log(`✅ Deleted ${journalEntries.length} journal entries`);
      }

      // Step 5: Delete the expense record
      console.log('🗑️ Deleting expense record...');
      
      const { error: deleteExpenseError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', linkedExpense.id);

      if (!deleteExpenseError) {
        deletionResults.expense_record = true;
        console.log('✅ Deleted expense record');
      } else {
        console.error('❌ Error deleting expense:', deleteExpenseError);
      }
    }

    // Step 6: Delete the payroll record
    console.log('🗑️ Deleting payroll record...');
    
    const { error: deletePayrollError } = await supabase
      .from('payroll_records')
      .delete()
      .eq('id', payroll_record_id);

    if (!deletePayrollError) {
      deletionResults.payroll_record = true;
      console.log('✅ Deleted payroll record');
    } else {
      console.error('❌ Error deleting payroll record:', deletePayrollError);
    }

    // Step 7: Update cashflow (reverse the outflow)
    if (linkedExpense) {
      const month = new Date(linkedExpense.date);
      month.setDate(1);
      
      await supabase.rpc("upsert_cashflow_snapshot", {
        mon: month.toISOString().slice(0, 10),
        inflows: 0,
        outflows: -linkedExpense.amount, // Negative to reverse the outflow
      });
      console.log('✅ Reversed cashflow impact');
    }

    const success = deletionResults.payroll_record && (deletionResults.expense_record || !linkedExpense);

    return NextResponse.json({
      success,
      message: success ? 'Employee payment deletion completed successfully' : 'Partial deletion completed',
      deleted: deletionResults,
      summary: {
        payroll_record_deleted: deletionResults.payroll_record,
        expense_record_deleted: deletionResults.expense_record,
        bank_transaction_deleted: deletionResults.bank_transaction,
        cash_transaction_deleted: deletionResults.cash_transaction,
        balance_reversed: deletionResults.bank_balance_updated,
        journal_entries_deleted: deletionResults.journal_entries
      }
    });

  } catch (error) {
    console.error('❌ Employee payment deletion failed:', error);
    return NextResponse.json({ error: 'Employee payment deletion failed' }, { status: 500 });
  }
}