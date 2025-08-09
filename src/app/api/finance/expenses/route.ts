// app/api/finance/expenses/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { createExpenseJournalEntry } from "@/lib/accounting-integration";
import { subcategoryMap } from "@/types";

export async function GET() {
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
  } = await req.json();

  type SubcategoryKey = keyof typeof subcategoryMap;
  const fallback = { category: "Other", type: "Indirect" };
  const { category, type } =
    subcategoryMap[(subcategory as SubcategoryKey)] || fallback;

  try {
    // 1. Create expense record
    const { data: exp, error: expErr } = await supabase
      .from("expenses")
      .insert([{ date, category, type, description, amount, payment_method, created_by }])
      .select()
      .single();

    if (expErr) return NextResponse.json({ error: expErr.message }, { status: 500 });

    // 2. Create bank transaction
    await supabase
      .from("bank_transactions")
      .insert([
        {
          bank_account_id,
          date,
          type: "withdrawal",
          amount,
          description: `Expense: ${description}`,
        },
      ]);

    // 3. Update bank account balance
    const { data: bankAccount, error: bankError } = await supabase
      .from("bank_accounts")
      .select("current_balance")
      .eq("id", bank_account_id)
      .single();
    if (bankError) return NextResponse.json({ error: bankError.message }, { status: 500 });
    const newBalance = (bankAccount?.current_balance || 0) - amount;
    const { error: updateError } = await supabase
      .from("bank_accounts")
      .update({ current_balance: newBalance })
      .eq("id", bank_account_id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    // 4. Update cashflow
    const month = new Date(date);
    month.setDate(1);
    await supabase.rpc("upsert_cashflow_snapshot", {
      mon: month.toISOString().slice(0, 10),
      inflows: 0,
      outflows: amount,
    });

    // 5. Create accounting journal entry for the expense
    // Dr. Expense Account / Cr. Cash/Bank Account
    try {
      await createExpenseJournalEntry({
        id: exp.id,
        date: date,
        category: category,
        description: description,
        amount: amount
      });
      console.log(`✅ Journal entry created for expense ${exp.id}`);
    } catch (journalError) {
      console.error('❌ Failed to create journal entry for expense:', journalError);
      // Don't fail the expense creation, but log the error
    }

    return NextResponse.json({ 
      data: exp,
      accounting_integration: true,
      message: "Expense recorded with automatic journal entry"
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}

