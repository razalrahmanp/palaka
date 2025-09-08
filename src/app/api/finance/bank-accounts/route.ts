// app/api/finance/bank-accounts/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("bank_accounts")
      .select("id, name as account_name, account_number, current_balance, account_type, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error('Error fetching bank accounts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error fetching bank accounts:', error);
    return NextResponse.json({ error: "Failed to fetch bank accounts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const {
      name, // Using 'name' to match the database schema
      account_number,
      current_balance = 0,
      account_type = 'BANK',
      upi_id,
      linked_bank_account_id
    } = await req.json();

    const { data, error } = await supabase
      .from("bank_accounts")
      .insert([{
        name,
        account_number,
        current_balance,
        account_type,
        upi_id,
        linked_bank_account_id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating bank account:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data,
      message: "Bank account created successfully"
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error creating bank account:', error);
    return NextResponse.json({ error: "Failed to create bank account" }, { status: 500 });
  }
}
