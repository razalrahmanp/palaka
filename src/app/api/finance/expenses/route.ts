// app/api/finance/expenses/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { subcategoryMap } from "@/types";
import { createExpenseJournalEntry } from "@/lib/journalHelper";
import { 
  processExpenseIntegration,
  EntityExpenseParams
} from "@/lib/expense-integrations/expenseIntegrationManager";

// Disable Next.js caching for real-time data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const entity_id = searchParams.get('entity_id');
    const entity_type = searchParams.get('entity_type');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const refresh = searchParams.get('refresh') === 'true';
    const timestamp = searchParams.get('_t');
    
    console.log('💸 Fetching expenses for finance management...', {
      refresh,
      timestamp,
      bypassCache: refresh || !!timestamp,
      entity_id,
      entity_type,
      date_range: start_date && end_date ? `${start_date} to ${end_date}` : 'all'
    });

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
    
    const response = NextResponse.json({ data: allExpenses });
    
    // Add cache-busting headers when refresh is requested
    if (refresh || timestamp) {
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }
    
    return response;
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

    // 2. Create bank transaction for ALL account types (BANK, UPI, CASH)
    // KEY FIX: Removed payment_method !== 'cash' condition to support unified cash handling
    if (bank_account_id && bank_account_id.trim() !== '') {
      console.log(`💰 Creating bank transaction for ${payment_method} payment of ₹${amount} (account: ${bank_account_id})`);
      
      // Get bank account details to use actual account name in description
      const { data: accountDetails } = await supabase
        .from("bank_accounts")
        .select("name, account_type")
        .eq("id", bank_account_id)
        .single();
      
      const accountLabel = accountDetails?.name || payment_method?.toUpperCase() || 'bank';
      
      const { data: bankTransaction, error: bankTransError } = await supabase
        .from("bank_transactions")
        .insert([{
          bank_account_id,
          date,
          type: "withdrawal",
          amount,
          description: `Expense: ${category} - ${description} [${accountLabel}]`,
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

      // 3. Update bank account balance (works for BANK, UPI, and CASH accounts)
      const { data: bankAccount, error: bankError } = await supabase
        .from("bank_accounts")
        .select("current_balance, account_type")
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
          console.log(`✅ ${bankAccount.account_type} account balance updated: ${bankAccount.current_balance} → ${newBalance}`);
        }
      }
    } else {
      console.log(`⚠️ No bank account specified for ${payment_method} expense of ₹${amount} - no transaction created`);
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

    // First, try to get the expense details from expenses table
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expense_id)
      .single();

    // If not found in expenses table, try vendor_payment_history table directly
    // This handles cases where frontend sends vendor_payment_history.id as expense_id
    if (fetchError || !expense) {
      console.log(`⚠️ Expense ${expense_id} not found in expenses table. Checking vendor_payment_history...`);
      
      const { data: vendorPayment, error: vendorPaymentError } = await supabase
        .from('vendor_payment_history')
        .select('*')
        .eq('id', expense_id)
        .single();
      
      if (vendorPaymentError || !vendorPayment) {
        console.error('Not found in either table:', { fetchError, vendorPaymentError });
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }
      
      // Found in vendor_payment_history - delete it and related expense entries
      console.log('✅ Found payment in vendor_payment_history table:', vendorPayment);
      
      // First, find and delete corresponding expense entries linked to this payment
      // The expense might have entity_reference_id = vendor_payment_history.id
      const { data: relatedExpenses, error: expenseSearchError } = await supabase
        .from('expenses')
        .select('*')
        .eq('entity_reference_id', expense_id);
      
      if (!expenseSearchError && relatedExpenses && relatedExpenses.length > 0) {
        console.log(`🔍 Found ${relatedExpenses.length} related expense(s) to delete:`, relatedExpenses);
        
        for (const relatedExpense of relatedExpenses) {
          const { error: deleteExpenseError } = await supabase
            .from('expenses')
            .delete()
            .eq('id', relatedExpense.id);
          
          if (deleteExpenseError) {
            console.warn(`⚠️ Warning: Could not delete related expense ${relatedExpense.id}:`, deleteExpenseError);
          } else {
            console.log(`✅ Deleted related expense: ${relatedExpense.id}`);
          }
        }
      } else {
        console.log('ℹ️ No related expenses found in expenses table');
      }
      
      // Delete from vendor_payment_history
      const { error: deletePaymentError } = await supabase
        .from('vendor_payment_history')
        .delete()
        .eq('id', expense_id);
      
      if (deletePaymentError) {
        console.error('Error deleting vendor payment:', deletePaymentError);
        return NextResponse.json({ error: "Failed to delete vendor payment" }, { status: 500 });
      }
      console.log('✅ Deleted vendor_payment_history entry');

      
      // Delete bank_transaction with VP-* reference AND any other bank_transactions created by the expense
      let vendorPaymentBankTransactionDeleted = false;
      let regularBankTransactionDeleted = false;
      const vendorPaymentReference = `VP-${expense_id.slice(0, 8)}`;
      
      if (vendorPayment.payment_method === 'cash') {
        // Get CASH bank account
        const { data: cashAccount } = await supabase
          .from('bank_accounts')
          .select('id')
          .eq('account_type', 'CASH')
          .single();
        
        if (cashAccount) {
          // Delete VP-* reference transaction
          const { data: deletedVPTx } = await supabase
            .from('bank_transactions')
            .delete()
            .match({
              bank_account_id: cashAccount.id,
              reference: vendorPaymentReference,
              type: 'withdrawal',
              amount: vendorPayment.amount
            })
            .select();
          
          if (deletedVPTx && deletedVPTx.length > 0) {
            vendorPaymentBankTransactionDeleted = true;
            console.log(`✅ Deleted bank_transaction with VP reference: ${vendorPaymentReference}`);
          } else {
            // Fallback: Try to delete by description pattern
            console.log(`ℹ️ VP-* reference not found, trying description pattern...`);
            const { data: deletedByDesc } = await supabase
              .from('bank_transactions')
              .delete()
              .eq('bank_account_id', cashAccount.id)
              .eq('type', 'withdrawal')
              .eq('amount', vendorPayment.amount)
              .like('description', '%Vendor payment%')
              .gte('date', vendorPayment.payment_date)
              .lte('date', vendorPayment.payment_date)
              .select();
            
            if (deletedByDesc && deletedByDesc.length > 0) {
              vendorPaymentBankTransactionDeleted = true;
              console.log(`✅ Deleted bank_transaction by description pattern`);
            }
          }
          
          // Also delete any expense-created bank_transactions
          if (relatedExpenses && relatedExpenses.length > 0) {
            for (const exp of relatedExpenses) {
              const { data: deletedExpTx } = await supabase
                .from('bank_transactions')
                .delete()
                .match({
                  bank_account_id: cashAccount.id,
                  type: 'withdrawal',
                  amount: exp.amount,
                  description: `Expense: ${exp.description}`
                })
                .select();
              
              if (deletedExpTx && deletedExpTx.length > 0) {
                regularBankTransactionDeleted = true;
                console.log(`✅ Deleted expense bank_transaction for: ${exp.description}`);
              }
            }
          }
        }
        
        // Also delete cash_transaction
        const { error: deleteCashTxError } = await supabase
          .from('cash_transactions')
          .delete()
          .eq('source_type', 'vendor_payment')
          .eq('source_id', expense_id);
        
        if (!deleteCashTxError) {
          console.log(`✅ Deleted cash_transaction for vendor payment`);
          
          // Restore cash balance
          const { data: cashAccount } = await supabase
            .from('bank_accounts')
            .select('id')
            .eq('account_type', 'CASH')
            .single();
          
          if (cashAccount) {
            const { data: currentBalance } = await supabase
              .from('cash_balances')
              .select('current_balance')
              .eq('cash_account_id', cashAccount.id)
              .single();
            
            if (currentBalance) {
              await supabase
                .from('cash_balances')
                .update({
                  current_balance: (currentBalance.current_balance || 0) + vendorPayment.amount,
                  last_updated: new Date().toISOString()
                })
                .eq('cash_account_id', cashAccount.id);
              
              console.log(`✅ Restored cash balance by ${vendorPayment.amount}`);
            }
          }
        }
      } else if (vendorPayment.bank_account_id) {
        // Bank/UPI payment
        // Delete VP-* reference transaction
        console.log(`🔍 Attempting to delete bank_transaction for bank/UPI payment...`);
        console.log(`   Bank Account ID: ${vendorPayment.bank_account_id}`);
        console.log(`   VP Reference: ${vendorPaymentReference}`);
        console.log(`   Amount: ${vendorPayment.amount}`);
        
        const { data: deletedVPTx, error: deleteVPError } = await supabase
          .from('bank_transactions')
          .delete()
          .match({
            bank_account_id: vendorPayment.bank_account_id,
            reference: vendorPaymentReference,
            type: 'withdrawal',
            amount: vendorPayment.amount
          })
          .select();
        
        if (deleteVPError) {
          console.error(`❌ Error deleting VP transaction:`, deleteVPError);
        } else if (deletedVPTx && deletedVPTx.length > 0) {
          vendorPaymentBankTransactionDeleted = true;
          console.log(`✅ Deleted bank_transaction with reference: ${vendorPaymentReference}`, deletedVPTx[0]);
        } else {
          console.log(`⚠️ VP-* reference transaction not found, trying alternative approaches...`);
          
          // Fallback: Try to match by description pattern
          const { data: allBankTxs } = await supabase
            .from('bank_transactions')
            .select('*')
            .eq('bank_account_id', vendorPayment.bank_account_id)
            .eq('type', 'withdrawal')
            .eq('amount', vendorPayment.amount)
            .gte('date', vendorPayment.payment_date)
            .lte('date', vendorPayment.payment_date);
          
          console.log(`   Found ${allBankTxs?.length || 0} matching transactions by amount and date`);
          
          if (allBankTxs && allBankTxs.length > 0) {
            // Find vendor payment transaction (contains "Vendor payment" in description)
            const vendorTx = allBankTxs.find(tx => 
              tx.description?.includes('Vendor payment') ||
              tx.description?.includes('Payment to') ||
              tx.reference?.includes('VP-') ||
              tx.reference?.includes('Smart')
            );
            
            if (vendorTx) {
              console.log(`   Found vendor transaction by description: ${vendorTx.description}`);
              const { error: deleteAltError } = await supabase
                .from('bank_transactions')
                .delete()
                .eq('id', vendorTx.id);
              
              if (!deleteAltError) {
                vendorPaymentBankTransactionDeleted = true;
                console.log(`✅ Deleted bank_transaction by description pattern`);
              }
            } else {
              console.log(`   No vendor transaction found in ${allBankTxs.length} candidates`);
            }
          }
        }
        
        // Also delete any expense-created bank_transactions
        if (relatedExpenses && relatedExpenses.length > 0) {
          for (const exp of relatedExpenses) {
            if (exp.bank_account_id) {
              const { data: deletedExpTx } = await supabase
                .from('bank_transactions')
                .delete()
                .match({
                  bank_account_id: exp.bank_account_id,
                  type: 'withdrawal',
                  amount: exp.amount,
                  description: `Expense: ${exp.description}`
                })
                .select();
              
              if (deletedExpTx && deletedExpTx.length > 0) {
                regularBankTransactionDeleted = true;
                console.log(`✅ Deleted expense bank_transaction for: ${exp.description}`);
              }
            }
          }
        }
        
        // Restore bank account balance
        const { data: bankAccount } = await supabase
          .from('bank_accounts')
          .select('current_balance')
          .eq('id', vendorPayment.bank_account_id)
          .single();
        
        if (bankAccount) {
          await supabase
            .from('bank_accounts')
            .update({
              current_balance: (bankAccount.current_balance || 0) + vendorPayment.amount
            })
            .eq('id', vendorPayment.bank_account_id);
          
          console.log(`✅ Restored bank balance by ${vendorPayment.amount}`);
        }
      }
      
      // Update vendor bill if linked
      if (vendorPayment.vendor_bill_id) {
        const { data: vendorBill } = await supabase
          .from('vendor_bills')
          .select('*')
          .eq('id', vendorPayment.vendor_bill_id)
          .single();
        
        if (vendorBill) {
          const newPaidAmount = Math.max(0, (vendorBill.paid_amount || 0) - vendorPayment.amount);
          let newStatus = vendorBill.status;
          
          if (newPaidAmount === 0) {
            newStatus = 'pending';
          } else if (newPaidAmount < vendorBill.total_amount) {
            newStatus = 'partial';
          } else if (newPaidAmount >= vendorBill.total_amount) {
            newStatus = 'paid';
          }
          
          await supabase
            .from('vendor_bills')
            .update({
              paid_amount: newPaidAmount,
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', vendorPayment.vendor_bill_id);
          
          console.log(`✅ Updated vendor bill ${vendorPayment.vendor_bill_id}: paid_amount reduced by ${vendorPayment.amount}`);
        }
      }
      
      return NextResponse.json({
        success: true,
        message: "Vendor payment deleted successfully with complete cleanup",
        deleted_payment: vendorPayment,
        related_expenses_deleted: relatedExpenses?.length || 0,
        vendor_payment_history_deleted: true,
        vendor_payment_bank_transaction_deleted: vendorPaymentBankTransactionDeleted,
        regular_bank_transaction_deleted: regularBankTransactionDeleted,
        payment_method: vendorPayment.payment_method
      });
    }

    // Original expense deletion logic continues here...

    // Use the vendor_bill_id passed from frontend (found from vendor_payment_history) 
    // or fallback to the one in expense record
    const targetVendorBillId = vendor_bill_id || expense.vendor_bill_id;
    
    // Track if vendor_payment_history was deleted
    let vendorPaymentHistoryDeleted = false;

    // If this expense is linked to a vendor bill, we need to handle the relationships
    if (targetVendorBillId) {

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
              vendorPaymentHistoryDeleted = true;
              console.log('✅ Successfully deleted vendor payment history using supplier matching:', matchedPayments3);
            }
          } else {
            vendorPaymentHistoryDeleted = true;
            console.log('✅ Successfully deleted vendor payment history using bill and amount matching:', matchedPayments2);
          }
        } else {
          vendorPaymentHistoryDeleted = true;
          console.log('✅ Successfully deleted vendor payment history using bill, amount, and date matching:', matchedPayments1);
        }

        console.log(`✅ Updated vendor bill ${targetVendorBillId}: paid_amount: ${vendorBill.paid_amount} → ${newPaidAmount}, status: ${vendorBill.status} → ${newStatus} (remaining_amount calculated automatically)`);
      }
    } else if (expense.entity_type === 'supplier' && expense.entity_reference_id) {
      // Handle deletion of standalone vendor payments (not linked to a bill)
      console.log('🔍 No vendor_bill_id found. Attempting to delete standalone vendor payment from vendor_payment_history...');
      console.log('Using entity_reference_id:', expense.entity_reference_id);
      
      // Try to delete by the payment ID (entity_reference_id)
      const { data: deletedPayment, error: deletePaymentError } = await supabase
        .from('vendor_payment_history')
        .delete()
        .eq('id', expense.entity_reference_id)
        .select();
      
      if (deletePaymentError || !deletedPayment || deletedPayment.length === 0) {
        console.warn('❌ Warning: Could not delete vendor payment history by entity_reference_id:', {
          error: deletePaymentError?.message,
          entity_reference_id: expense.entity_reference_id
        });
        
        // Fallback: Try matching by supplier, amount, and date
        const { data: deletedPaymentFallback, error: deleteFallbackError } = await supabase
          .from('vendor_payment_history')
          .delete()
          .match({
            supplier_id: expense.entity_id,
            amount: expense.amount,
            payment_date: expense.date
          })
          .limit(1)
          .select();
        
        if (!deleteFallbackError && deletedPaymentFallback && deletedPaymentFallback.length > 0) {
          vendorPaymentHistoryDeleted = true;
          console.log('✅ Successfully deleted standalone vendor payment using fallback matching:', deletedPaymentFallback);
        } else {
          console.warn('❌ Fallback deletion also failed:', deleteFallbackError?.message);
        }
      } else {
        vendorPaymentHistoryDeleted = true;
        console.log('✅ Successfully deleted standalone vendor payment from vendor_payment_history:', deletedPayment);
      }
    }

    // Handle cash vs bank account reversal based on payment method
    let bankAccountUpdated = false;
    let bankTransactionDeleted = false;
    let cashTransactionDeleted = false;
    let cashBalanceUpdated = false;
    let vendorPaymentBankTransactionDeleted = false;
    
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
      
      // ADDITIONAL: For vendor payments, also delete bank_transactions entry if it exists
      // Vendor payments create entries in bank_transactions with reference pattern 'VP-*'
      if (expense.entity_type === 'supplier' && expense.entity_reference_id) {
        console.log(`🔍 Checking for vendor payment bank_transaction entry with reference VP-${expense.entity_reference_id.slice(0, 8)}...`);
        
        const vendorPaymentReference = `VP-${expense.entity_reference_id.slice(0, 8)}`;
        
        // Get the CASH bank account
        const { data: cashAccount } = await supabase
          .from('bank_accounts')
          .select('id')
          .eq('account_type', 'CASH')
          .single();
        
        if (cashAccount) {
          const { data: vendorBankTx, error: vendorBankTxError } = await supabase
            .from('bank_transactions')
            .delete()
            .match({
              bank_account_id: cashAccount.id,
              reference: vendorPaymentReference,
              type: 'withdrawal',
              amount: expense.amount
            })
            .select();

          if (!vendorBankTxError && vendorBankTx && vendorBankTx.length > 0) {
            vendorPaymentBankTransactionDeleted = true;
            console.log(`✅ Deleted vendor payment bank_transaction entry: ${vendorPaymentReference}`);
          } else {
            console.log(`ℹ️ No vendor payment bank_transaction found for reference: ${vendorPaymentReference}`);
          }
        }
      }
    } else if (expense.bank_account_id) {
      console.log(`💰 Expense ${expense_id} was paid from bank account ${expense.bank_account_id}. Reversing bank transaction...`);

      // 1. Delete the bank transaction
      // For vendor payments, try to match by reference pattern first (VP-*)
      let deleted = false;
      
      if (expense.entity_type === 'supplier' && expense.entity_reference_id) {
        const vendorPaymentReference = `VP-${expense.entity_reference_id.slice(0, 8)}`;
        console.log(`🔍 Attempting to delete vendor payment bank_transaction with reference: ${vendorPaymentReference}`);
        
        const { data: vendorBankTx, error: vendorBankTxError } = await supabase
          .from('bank_transactions')
          .delete()
          .match({
            bank_account_id: expense.bank_account_id,
            reference: vendorPaymentReference,
            type: 'withdrawal',
            amount: expense.amount
          })
          .select();

        if (!vendorBankTxError && vendorBankTx && vendorBankTx.length > 0) {
          deleted = true;
          bankTransactionDeleted = true;
          vendorPaymentBankTransactionDeleted = true;
          console.log(`✅ Deleted vendor payment bank_transaction entry: ${vendorPaymentReference}`);
        }
      }
      
      // Fallback to standard expense matching if vendor payment approach didn't work
      if (!deleted) {
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
      vendor_payment_history_deleted: vendorPaymentHistoryDeleted,
      bank_account_updated: bankAccountUpdated,
      bank_transaction_deleted: bankTransactionDeleted,
      cash_transaction_deleted: cashTransactionDeleted,
      cash_balance_updated: cashBalanceUpdated,
      vendor_payment_bank_transaction_deleted: vendorPaymentBankTransactionDeleted,
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
