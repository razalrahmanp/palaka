
//api/finance/bank_accounts/transactions/route.ts

import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("bank_transactions")
    .select("*")
    .order("date", { ascending: false });
  if (error) {
    console.error("Error fetching bank transactions:", error);
    return NextResponse.json({ error: "Failed to fetch transactions." }, { status: 500 });
  }

  return NextResponse.json({ data });
}
