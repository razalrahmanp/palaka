
//api/finance/bank_accounts/transactions/route.ts

import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('bank_account_id'); // Changed from 'account_id' to 'bank_account_id'

  console.log('Fetching transactions for bank_account_id:', accountId); // Debug log

  let query = supabase
    .from("bank_transactions")
    .select("*")
    .order("date", { ascending: false }); // Changed back to 'date' as per database schema

  // Filter by account_id if provided
  if (accountId) {
    query = query.eq("bank_account_id", accountId);
  }

  const { data, error } = await query;

  console.log('Query result:', { 
    accountId, 
    dataCount: data?.length || 0, 
    firstRowBankAccountId: data?.[0]?.bank_account_id,
    error 
  }); // Debug log

  if (error) {
    console.error("Error fetching bank transactions:", error);
    return NextResponse.json({ error: "Failed to fetch transactions." }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { bank_account_id, date, type, amount, description, reference } = body;

  if (!bank_account_id || !date || !type || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!['deposit', 'withdrawal'].includes(type)) {
    return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
  }

  const { error } = await supabase.from("bank_transactions").insert([
    {
      bank_account_id,
      date,
      type,
      amount,
      description,
      reference,
    },
  ]);

  if (error) {
    console.error("Error inserting bank transaction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
