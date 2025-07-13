// app/api/finance/bank_accounts/route.ts
import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("bank_accounts") // ✅ Correct table
    .select("id, name, account_number, current_balance, currency") // ✅ Explicitly select needed fields
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching bank accounts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();

  const { name, account_number, currency, current_balance } = body;

  if (!name || typeof current_balance !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { error } = await supabase.from("bank_accounts").insert([
    {
      name,
      account_number,
      currency: currency || "INR",
      current_balance,
    },
  ]);

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
