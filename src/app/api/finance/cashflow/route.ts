// app/api/finance/cashflow/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabase
    .from("cashflow_snapshots")
    .select("*")
    .order("month", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
