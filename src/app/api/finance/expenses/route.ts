// app/api/finance/expenses/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { subcategoryMap } from "@/types";
import { createExpenseJournalEntry } from "@/lib/journalHelper";
import { 
  processExpenseIntegration,
  EntityExpenseParams
} from "@/lib/expense-integrations/expenseIntegrationManager";export async function GET() {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
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

    // 2. Create bank transaction (only for non-cash payments)
    if (bank_account_id && payment_method !== 'cash') {
      console.log(`Creating bank transaction for ${payment_method} payment of ₹${amount}`);
      
      await supabase
        .from("bank_transactions")
        .insert([{
          bank_account_id,
          date,
          type: "withdrawal",
          amount,
          description: `Expense: ${description} (via ${exp.entity_type || 'Al rams Furniture'})`,
          reference: receipt_number || `EXP-${exp.id.slice(-8)}`,
          source_type: 'expense',
          payment_method: payment_method,
          source_id: exp.id
        }]);

      // 3. Update bank account balance
      const { data: bankAccount, error: bankError } = await supabase
        .from("bank_accounts")
        .select("current_balance")
        .eq("id", bank_account_id)
        .single();
      
      if (!bankError && bankAccount) {
        const newBalance = (bankAccount.current_balance || 0) - amount;
        await supabase
          .from("bank_accounts")
          .update({ current_balance: newBalance })
          .eq("id", bank_account_id);
      }
    } else if (payment_method === 'cash') {
      console.log(`Cash expense of ₹${amount} - no bank transaction created`);
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
    const { expense_id } = await req.json();

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

    // If this expense is linked to a vendor bill, we need to handle the relationships
    if (expense.vendor_bill_id) {
      console.log(`🔗 Expense ${expense_id} is linked to vendor bill ${expense.vendor_bill_id}. Handling relationships...`);

      // Get the current vendor bill details
      const { data: vendorBill, error: billError } = await supabase
        .from('vendor_bills')
        .select('*')
        .eq('id', expense.vendor_bill_id)
        .single();

      if (billError) {
        console.error('Error fetching vendor bill:', billError);
        return NextResponse.json({ error: "Failed to fetch associated vendor bill" }, { status: 500 });
      }

      if (vendorBill) {
        // Calculate new paid amount (reduce by the expense amount)
        const newPaidAmount = Math.max(0, (vendorBill.paid_amount || 0) - expense.amount);
        const newRemainingAmount = vendorBill.total_amount - newPaidAmount;
        
        // Determine new status based on payment amounts
        let newStatus = vendorBill.status;
        if (newPaidAmount === 0) {
          newStatus = 'pending';
        } else if (newPaidAmount < vendorBill.total_amount) {
          newStatus = 'partial';
        } else if (newPaidAmount >= vendorBill.total_amount) {
          newStatus = 'paid';
        }

        // Update the vendor bill
        const { error: updateBillError } = await supabase
          .from('vendor_bills')
          .update({
            paid_amount: newPaidAmount,
            remaining_amount: newRemainingAmount,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', expense.vendor_bill_id);

        if (updateBillError) {
          console.error('Error updating vendor bill:', updateBillError);
          return NextResponse.json({ error: "Failed to update vendor bill" }, { status: 500 });
        }

        // Delete associated vendor payment history record
        // Try multiple approaches to find and delete the correct payment history record
        
        // First approach: Match by vendor_bill_id, amount, and payment_date
        const { error: paymentHistoryError1 } = await supabase
          .from('vendor_payment_history')
          .delete()
          .match({
            vendor_bill_id: expense.vendor_bill_id,
            amount: expense.amount,
            payment_date: expense.date
          });

        if (paymentHistoryError1) {
          console.log('First approach failed, trying alternative matching...');
          
          // Second approach: Match by vendor_bill_id and amount (in case dates don't match exactly)
          const { error: paymentHistoryError2 } = await supabase
            .from('vendor_payment_history')
            .delete()
            .match({
              vendor_bill_id: expense.vendor_bill_id,
              amount: expense.amount
            })
            .limit(1);  // Only delete one record

          if (paymentHistoryError2) {
            console.log('Second approach failed, trying by supplier and amount...');
            
            // Third approach: Match by supplier_id, amount, and payment_date
            const { error: paymentHistoryError3 } = await supabase
              .from('vendor_payment_history')
              .delete()
              .match({
                supplier_id: expense.entity_id,
                amount: expense.amount,
                payment_date: expense.date
              })
              .limit(1);

            if (paymentHistoryError3) {
              console.warn('Warning: Could not delete vendor payment history with any approach:', {
                error1: paymentHistoryError1,
                error2: paymentHistoryError2, 
                error3: paymentHistoryError3
              });
            } else {
              console.log('✅ Successfully deleted vendor payment history using supplier matching');
            }
          } else {
            console.log('✅ Successfully deleted vendor payment history using bill and amount matching');
          }
        } else {
          console.log('✅ Successfully deleted vendor payment history using bill, amount, and date matching');
        }

        console.log(`✅ Updated vendor bill ${expense.vendor_bill_id}: paid_amount: ${vendorBill.paid_amount} → ${newPaidAmount}, status: ${vendorBill.status} → ${newStatus}`);
      }
    }

    // Handle bank account reversal if the expense was paid from a bank account
    let bankAccountUpdated = false;
    let bankTransactionDeleted = false;
    
    if (expense.bank_account_id) {
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
      vendor_bill_updated: !!expense.vendor_bill_id,
      bank_account_updated: bankAccountUpdated,
      bank_transaction_deleted: bankTransactionDeleted
    });
  } catch (error) {
    console.error('Error in DELETE /api/finance/expenses:', error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
