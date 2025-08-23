// app/api/finance/bank_accounts/route.ts
import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountType = searchParams.get('type'); // 'BANK' or 'UPI'

  let query = supabase
    .from("bank_accounts")
    .select(`
      id, 
      name, 
      account_number, 
      current_balance, 
      currency,
      account_type,
      upi_id,
      linked_bank_account_id,
      is_active,
      created_at
    `)
    .order("name", { ascending: true });

  // Filter by account type if specified
  if (accountType === 'BANK') {
    query = query.eq('account_type', 'BANK');
  } else if (accountType === 'UPI') {
    query = query.eq('account_type', 'UPI');
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching bank accounts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If fetching UPI accounts, join with linked bank account info
  if (accountType === 'UPI' && data) {
    const enrichedData = await Promise.all(
      data.map(async (upiAccount) => {
        if (upiAccount.linked_bank_account_id) {
          const { data: linkedBank } = await supabase
            .from("bank_accounts")
            .select("name, account_number")
            .eq("id", upiAccount.linked_bank_account_id)
            .single();
          
          return {
            ...upiAccount,
            linked_bank_name: linkedBank?.name,
            linked_account_number: linkedBank?.account_number
          };
        }
        return upiAccount;
      })
    );
    return NextResponse.json({ data: enrichedData });
  }

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();

  const { 
    name, 
    account_number, 
    currency, 
    current_balance, 
    account_type,
    upi_id,
    linked_bank_account_id
  } = body;

  if (!name || typeof current_balance !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate account type specific fields
  if (account_type === 'UPI' && !upi_id) {
    return NextResponse.json({ error: "UPI ID is required for UPI accounts" }, { status: 400 });
  }

  if (account_type === 'BANK' && !account_number) {
    return NextResponse.json({ error: "Account number is required for bank accounts" }, { status: 400 });
  }

  const insertData: {
    name: string;
    currency: string;
    current_balance: number;
    account_type: string;
    is_active: boolean;
    account_number?: string;
    upi_id?: string;
    linked_bank_account_id?: string;
  } = {
    name,
    currency: currency || "INR",
    current_balance,
    account_type: account_type || "BANK",
    is_active: true
  };

  // Add type-specific fields
  if (account_type === 'BANK') {
    insertData.account_number = account_number;
  } else if (account_type === 'UPI') {
    insertData.upi_id = upi_id;
    if (linked_bank_account_id) {
      insertData.linked_bank_account_id = linked_bank_account_id;
    }
  }

  const { error } = await supabase
    .from("bank_accounts")
    .insert([insertData]);

  if (error) {
    console.error("Error inserting bank account:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}



export async function DELETE(req: Request) {
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  const { error } = await supabase.from("expenses").delete().eq("id", id);

  if (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
