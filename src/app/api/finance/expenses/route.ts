// app/api/finance/expenses/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { subcategoryMap } from "@/types";
import { createExpenseJournalEntry } from "@/lib/journalHelper";
import { 
  processExpenseIntegration,
  EntityExpenseParams
} from "@/lib/expense-integrations/expenseIntegrationManager";export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const entity_id = searchParams.get('entity_id');
    const entity_type = searchParams.get('entity_type');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    // Fetch all expenses using pagination to bypass the 1000 record limit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allExpenses: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from("expenses")
        .select("*", { count: 'exact' })
        .order("date", { ascending: false })
        .range(from, from + pageSize - 1);

      // Apply entity filtering
      if (entity_id && entity_type) {
        query = query
          .eq('entity_id', entity_id)
          .eq('entity_type', entity_type);
      }

      // Apply date range filtering
      if (start_date) {
        query = query.gte('date', start_date);
      }
      if (end_date) {
        query = query.lte('date', end_date);
      }

      const { data, error, count } = await query;
      
      if (error) {
        console.error('Error fetching expenses:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (data && data.length > 0) {
        allExpenses = [...allExpenses, ...data];
        from += pageSize;
        
        // Check if we've fetched all records
        if (count && allExpenses.length >= count) {
          hasMore = false;
        } else if (data.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ Fetched ${allExpenses.length} total expenses`);
    return NextResponse.json({ data: allExpenses });
  } catch (error) {
    console.error('Error in GET /api/finance/expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const {
    date,
    subcategory,
    description,
    amount,
    payment_method,
    bank_account_id,
    created_by,
    // New entity integration fields
    entity_type,
    entity_id,
    vendor_bill_id,
    payroll_record_id,
    odometer,
    quantity,
    location,
    vendor_name,
    receipt_number
  } = await req.json();

  type SubcategoryKey = keyof typeof subcategoryMap;
  const fallback = { category: "Miscellaneous", type: "Variable", accountCode: "7000" };
  const { category, type, accountCode } = subcategoryMap[(subcategory as SubcategoryKey)] || fallback;

  try {
    // 1. Validate and get a valid user ID
    let validUserId = created_by;
    
    // Check if created_by is a valid UUID format (36 characters with dashes)
    const isValidUuid = created_by && 
                       typeof created_by === 'string' && 
                       /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(created_by);
    
    // If no user provided, invalid UUID, or special cases, try to get the first available user
    if (!created_by || 
        created_by === '00000000-0000-0000-0000-000000000000' || 
        created_by === 'system' || 
        created_by === 'undefined' || 
        created_by === 'null' ||
        !isValidUuid) {
      
      console.log('🔍 Invalid or missing user ID, searching for valid user...', { provided: created_by, isValidUuid });
      
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('is_deleted', false)
        .limit(1);
      
      if (!userError && users && users.length > 0) {
        validUserId = users[0].id;
        console.log('✅ Using first available user for expense:', validUserId);
      } else {
        // If no users found, make created_by null (allowed by schema)
        validUserId = null;
        console.log('⚠️ No valid user found, creating expense with null created_by');
      }
    } else {
      console.log('✅ Valid user ID provided:', validUserId);
    }

    // 2. Create expense record
    const { data: exp, error: expErr } = await supabase
      .from("expenses")
      .insert([{ 
        date, 
        category, 
        type, 
        description, 
        amount, 
        payment_method, 
        created_by: validUserId,
        entity_type,
        entity_id,
        entity_reference_id: vendor_bill_id || payroll_record_id
      }])
      .select()
      .single();

    if (expErr) return NextResponse.json({ error: expErr.message }, { status: 500 });

    // 2. Create bank transaction (only for non-cash payments with valid bank account)
    if (bank_account_id && bank_account_id.trim() !== '' && payment_method !== 'cash') {
      console.log(`Creating bank transaction for ${payment_method} payment of ₹${amount}`);
      
      const { data: bankTransaction, error: bankTransError } = await supabase
        .from("bank_transactions")
        .insert([{
          bank_account_id,
          date,
          type: "withdrawal",
          amount,
          description: `Expense: ${description} (${payment_method?.toUpperCase()})`,
          reference: receipt_number || `EXP-${exp.id.slice(-8)}`
        }])
        .select()
        .single();

      if (bankTransError) {
        console.error('❌ Failed to create bank transaction:', bankTransError);
        return NextResponse.json({ 
          error: 'Failed to create bank transaction', 
          details: bankTransError.message,
          expenseId: exp.id 
        }, { status: 500 });
      } else {
        console.log(`✅ Bank transaction created successfully: ${bankTransaction.id}`);
      }

      // 3. Update bank account balance
      const { data: bankAccount, error: bankError } = await supabase
        .from("bank_accounts")
        .select("current_balance")
        .eq("id", bank_account_id)
        .single();
      
      if (bankError) {
        console.error('❌ Failed to fetch bank account for balance update:', bankError);
      } else if (bankAccount) {
        const newBalance = (bankAccount.current_balance || 0) - amount;
        const { error: updateError } = await supabase
          .from("bank_accounts")
          .update({ current_balance: newBalance })
          .eq("id", bank_account_id);
        
        if (updateError) {
          console.error('❌ Failed to update bank account balance:', updateError);
        } else {
          console.log(`✅ Bank account balance updated: ${bankAccount.current_balance} → ${newBalance}`);
        }
      }
    } else {
      console.log(`Cash expense of ₹${amount} - no bank transaction created (payment_method: ${payment_method}, bank_account_id: '${bank_account_id}')`);
    }

    // 4. Update cashflow
    const month = new Date(date);
    month.setDate(1);
    await supabase.rpc("upsert_cashflow_snapshot", {
      mon: month.toISOString().slice(0, 10),
      inflows: 0,
      outflows: amount,
    });

    // 5. Create accounting journal entry
    let journalResult = null;
    try {
      journalResult = await createExpenseJournalEntry({
        expenseId: exp.id,
        amount: amount,
        date: date,
        description: description,
        category: category,
        type: type,
        accountCode: accountCode,
        paymentMethod: payment_method,
        bankAccountId: bank_account_id
      });
      
      if (journalResult.success) {
        console.log(`✅ Journal entry created for expense ${exp.id}:`, journalResult.journalEntryId);
      } else {
        console.error('❌ Failed to create journal entry for expense:', journalResult.error);
      }
    } catch (journalError) {
      console.error('❌ Failed to create journal entry for expense:', journalError);
    }

    // 6. Process entity-specific integrations
    let integrationResult = null;
    if (entity_type && entity_id) {
      const integrationParams: EntityExpenseParams = {
        expenseId: exp.id,
        amount,
        date,
        category,
        subcategory,
        description,
        paymentMethod: payment_method,
        bankAccountId: bank_account_id,
        createdBy: validUserId || created_by,
        entityType: entity_type,
        entityId: entity_id,
        vendorBillId: vendor_bill_id,
        payrollRecordId: payroll_record_id,
        odometer,
        quantity,
        location,
        vendorName: vendor_name,
        receiptNumber: receipt_number
      };

      try {
        integrationResult = await processExpenseIntegration(integrationParams);
        
        if (integrationResult.success) {
          console.log('✅ Entity integration completed:', integrationResult.integrations);
        } else {
          console.error('❌ Entity integration failed:', integrationResult.error);
        }
      } catch (integrationError) {
        console.error('❌ Entity integration error:', integrationError);
      }
    }

    return NextResponse.json({ 
      data: exp,
      accounting_integration: journalResult?.success || false,
      entity_integrations: integrationResult?.integrations || {},
      category: category,
      type: type,
      accountCode: accountCode,
      message: "Expense recorded with automatic journal entry, proper categorization, and entity integration"
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { expense_id, vendor_bill_id } = await req.json();

    if (!expense_id) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });
    }

    // First, get the expense details for validation and relationship handling
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expense_id)
      .single();

    if (fetchError || !expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Use the vendor_bill_id passed from frontend (found from vendor_payment_history) 
    // or fallback to the one in expense record
    const targetVendorBillId = vendor_bill_id || expense.vendor_bill_id;

    // If this expense is linked to a vendor bill, we need to handle the relationships
    if (targetVendorBillId) {
      console.log(`🔗 Expense ${expense_id} is linked to vendor bill ${targetVendorBillId}. Handling relationships...`);
      console.log(`🔗 Expense ${expense_id} is linked to vendor bill ${targetVendorBillId}. Handling relationships...`);

      // Get the current vendor bill details
      const { data: vendorBill, error: billError } = await supabase
        .from('vendor_bills')
        .select('*')
        .eq('id', targetVendorBillId)
        .single();

      if (billError) {
        console.error('Error fetching vendor bill:', billError);
        return NextResponse.json({ error: "Failed to fetch associated vendor bill" }, { status: 500 });
      }

      if (vendorBill) {
        // Calculate new paid amount (reduce by the expense amount)
        const newPaidAmount = Math.max(0, (vendorBill.paid_amount || 0) - expense.amount);
        // remaining_amount will be calculated automatically by the database
        
        // Determine new status based on payment amounts
        let newStatus = vendorBill.status;
        if (newPaidAmount === 0) {
          newStatus = 'pending';
        } else if (newPaidAmount < vendorBill.total_amount) {
          newStatus = 'partial';
        } else if (newPaidAmount >= vendorBill.total_amount) {
          newStatus = 'paid';
        }

        // Update the vendor bill (don't update remaining_amount - it's computed automatically)
        const { error: updateBillError } = await supabase
          .from('vendor_bills')
          .update({
            paid_amount: newPaidAmount,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetVendorBillId);

        if (updateBillError) {
          console.error('Error updating vendor bill:', updateBillError);
          return NextResponse.json({ error: "Failed to update vendor bill" }, { status: 500 });
        }

        // Delete associated vendor payment history record
        // Try multiple approaches to find and delete the correct payment history record
        
        console.log('🔍 Attempting to delete vendor_payment_history with:', {
          vendor_bill_id: targetVendorBillId,
          amount: expense.amount,
          payment_date: expense.date,
          supplier_id: expense.entity_id
        });
        
        // First approach: Match by vendor_bill_id, amount, and payment_date
        const { data: matchedPayments1, error: paymentHistoryError1 } = await supabase
          .from('vendor_payment_history')
          .delete()
          .match({
            vendor_bill_id: targetVendorBillId,
            amount: expense.amount,
            payment_date: expense.date
          })
          .select();

        if (paymentHistoryError1 || !matchedPayments1 || matchedPayments1.length === 0) {
          console.log('First approach failed:', paymentHistoryError1?.message || 'No matching records found');
          console.log('Trying alternative matching...');
          
          // Second approach: Match by vendor_bill_id and amount (in case dates don't match exactly)
          const { data: matchedPayments2, error: paymentHistoryError2 } = await supabase
            .from('vendor_payment_history')
            .delete()
            .match({
              vendor_bill_id: targetVendorBillId,
              amount: expense.amount
            })
            .limit(1)
            .select();

          if (paymentHistoryError2 || !matchedPayments2 || matchedPayments2.length === 0) {
            console.log('Second approach failed:', paymentHistoryError2?.message || 'No matching records found');
            console.log('Trying by supplier and amount...');
            
            // Third approach: Match by supplier_id, amount, and payment_date
            const { data: matchedPayments3, error: paymentHistoryError3 } = await supabase
              .from('vendor_payment_history')
              .delete()
              .match({
                supplier_id: expense.entity_id,
                amount: expense.amount,
                payment_date: expense.date
              })
              .limit(1)
              .select();

            if (paymentHistoryError3 || !matchedPayments3 || matchedPayments3.length === 0) {
              console.warn('❌ Warning: Could not delete vendor payment history with any approach:', {
                error1: paymentHistoryError1?.message,
                error2: paymentHistoryError2?.message, 
                error3: paymentHistoryError3?.message,
                expense_details: {
                  id: expense.id,
                  vendor_bill_id: targetVendorBillId,
                  amount: expense.amount,
                  date: expense.date,
                  entity_id: expense.entity_id
                }
              });
            } else {
              console.log('✅ Successfully deleted vendor payment history using supplier matching:', matchedPayments3);
            }
          } else {
            console.log('✅ Successfully deleted vendor payment history using bill and amount matching:', matchedPayments2);
          }
        } else {
          console.log('✅ Successfully deleted vendor payment history using bill, amount, and date matching:', matchedPayments1);
        }

        console.log(`✅ Updated vendor bill ${targetVendorBillId}: paid_amount: ${vendorBill.paid_amount} → ${newPaidAmount}, status: ${vendorBill.status} → ${newStatus} (remaining_amount calculated automatically)`);
      }
    }

    // Handle cash vs bank account reversal based on payment method
    let bankAccountUpdated = false;
    let bankTransactionDeleted = false;
    let cashTransactionDeleted = false;
    let cashBalanceUpdated = false;
    
    if (expense.payment_method === 'cash') {
      console.log(`💰 Expense ${expense_id} was paid with cash. Reversing cash transaction...`);

      // 1. Find and delete the cash transaction
      const { data: cashTransactions, error: cashTransactionError } = await supabase
        .from('cash_transactions')
        .select('*')
        .eq('source_type', 'expense')
        .eq('source_id', expense.entity_reference_id || expense_id) // Try both IDs
        .eq('amount', -expense.amount); // Should be negative for outgoing payments

      if (!cashTransactionError && cashTransactions && cashTransactions.length > 0) {
        const cashTransaction = cashTransactions[0];
        
        // Delete the cash transaction
        const { error: deleteCashError } = await supabase
          .from('cash_transactions')
          .delete()
          .eq('id', cashTransaction.id);

        if (deleteCashError) {
          console.warn('Warning: Could not delete cash transaction:', deleteCashError);
        } else {
          cashTransactionDeleted = true;
          console.log(`✅ Deleted cash transaction for expense ${expense_id}`);

          // 2. Restore cash balance
          if (cashTransaction.cash_account_id) {
            const { data: currentBalance } = await supabase
              .from('cash_balances')
              .select('current_balance')
              .eq('cash_account_id', cashTransaction.cash_account_id)
              .single();

            const restoredBalance = (currentBalance?.current_balance || 0) + expense.amount;

            const { error: balanceUpdateError } = await supabase
              .from('cash_balances')
              .update({
                current_balance: restoredBalance,
                last_updated: new Date().toISOString()
              })
              .eq('cash_account_id', cashTransaction.cash_account_id);

            if (balanceUpdateError) {
              console.warn('Warning: Could not update cash balance:', balanceUpdateError);
            } else {
              cashBalanceUpdated = true;
              console.log(`✅ Restored cash balance: ${currentBalance?.current_balance || 0} → ${restoredBalance}`);
            }
          }
        }
      } else {
        console.warn('Warning: Could not find cash transaction to delete:', cashTransactionError?.message || 'No matching transaction found');
      }
    } else if (expense.bank_account_id) {
      console.log(`💰 Expense ${expense_id} was paid from bank account ${expense.bank_account_id}. Reversing bank transaction...`);

      // 1. Delete the bank transaction
      const { error: bankTransactionError } = await supabase
        .from('bank_transactions')
        .delete()
        .match({
          bank_account_id: expense.bank_account_id,
          type: 'withdrawal',
          amount: expense.amount,
          description: `Expense: ${expense.description}`
        });

      if (bankTransactionError) {
        console.warn('Warning: Could not delete bank transaction:', bankTransactionError);
      } else {
        bankTransactionDeleted = true;
        console.log(`✅ Deleted bank transaction for expense ${expense_id}`);
      }

      // 2. Restore bank account balance
      const { data: bankAccount, error: bankAccountError } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('id', expense.bank_account_id)
        .single();

      if (!bankAccountError && bankAccount) {
        const restoredBalance = (bankAccount.current_balance || 0) + expense.amount;
        
        const { error: updateBalanceError } = await supabase
          .from('bank_accounts')
          .update({ current_balance: restoredBalance })
          .eq('id', expense.bank_account_id);

        if (updateBalanceError) {
          console.error('Error restoring bank account balance:', updateBalanceError);
          return NextResponse.json({ error: "Failed to restore bank account balance" }, { status: 500 });
        } else {
          bankAccountUpdated = true;
          console.log(`✅ Restored bank account ${expense.bank_account_id} balance: ${bankAccount.current_balance} → ${restoredBalance} (+${expense.amount})`);
        }
      } else {
        console.error('Error fetching bank account for balance restoration:', bankAccountError);
        return NextResponse.json({ error: "Failed to fetch bank account for balance restoration" }, { status: 500 });
      }
    }

    // Delete the expense
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expense_id);

    if (deleteError) {
      console.error('Error deleting expense:', deleteError);
      return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Expense deleted successfully with complete accounting reversal",
      deleted_expense: expense,
      vendor_bill_updated: !!targetVendorBillId,
      bank_account_updated: bankAccountUpdated,
      bank_transaction_deleted: bankTransactionDeleted,
      cash_transaction_deleted: cashTransactionDeleted,
      cash_balance_updated: cashBalanceUpdated,
      payment_method: expense.payment_method
    });
  } catch (error) {
    console.error('Error in DELETE /api/finance/expenses:', error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const {
      expense_id,
      date,
      description,
      category,
      type,
      amount,
      payment_method
    } = await req.json();

    if (!expense_id) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });
    }

    // Get the current expense details for comparison
    const { data: currentExpense, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expense_id)
      .single();

    if (fetchError || !currentExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Update the expense
    const { data: updatedExpense, error: updateError } = await supabase
      .from('expenses')
      .update({
        date,
        description,
        category,
        type,
        amount,
        payment_method,
        updated_at: new Date().toISOString()
      })
      .eq('id', expense_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If amount changed, update bank account balance (if applicable)
    const amountDifference = amount - currentExpense.amount;
    
    if (amountDifference !== 0 && currentExpense.bank_account_id && payment_method !== 'cash') {
      const { data: bankAccount, error: bankError } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('id', currentExpense.bank_account_id)
        .single();
      
      if (!bankError && bankAccount) {
        const newBalance = (bankAccount.current_balance || 0) - amountDifference;
        
        const { error: updateBalanceError } = await supabase
          .from('bank_accounts')
          .update({ current_balance: newBalance })
          .eq('id', currentExpense.bank_account_id);
        
        if (updateBalanceError) {
          console.error('❌ Failed to update bank account balance:', updateBalanceError);
        } else {
          console.log(`✅ Bank account balance updated: ${bankAccount.current_balance} → ${newBalance}`);
        }
      }
      
      // Update bank transaction
      await supabase
        .from('bank_transactions')
        .update({
          date,
          amount,
          description: `Expense: ${description} (${payment_method?.toUpperCase()})`
        })
        .match({
          bank_account_id: currentExpense.bank_account_id,
          type: 'withdrawal',
          description: `Expense: ${currentExpense.description}`
        });
    }

    // Update cashflow if date or amount changed
    if (date !== currentExpense.date || amount !== currentExpense.amount) {
      // Remove old amount from old month
      const oldMonth = new Date(currentExpense.date);
      oldMonth.setDate(1);
      await supabase.rpc("upsert_cashflow_snapshot", {
        mon: oldMonth.toISOString().slice(0, 10),
        inflows: 0,
        outflows: -currentExpense.amount,
      });

      // Add new amount to new month
      const newMonth = new Date(date);
      newMonth.setDate(1);
      await supabase.rpc("upsert_cashflow_snapshot", {
        mon: newMonth.toISOString().slice(0, 10),
        inflows: 0,
        outflows: amount,
      });
    }

    return NextResponse.json({ 
      success: true,
      data: updatedExpense,
      message: "Expense updated successfully"
    });
  } catch (error) {
    console.error('Error in PUT /api/finance/expenses:', error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}
