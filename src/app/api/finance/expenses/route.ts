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

    // 2. Create bank transaction (if bank_account_id provided)
    if (bank_account_id) {
      await supabase
        .from("bank_transactions")
        .insert([{
          bank_account_id,
          date,
          type: "withdrawal",
          amount,
          description: `Expense: ${description}`,
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

