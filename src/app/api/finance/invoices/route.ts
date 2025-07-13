import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import type { PostgrestError } from "@supabase/supabase-js";

interface InvoiceRow {
  id: string;
  customer_id: string;
  sales_order_id: string;
  total: number;
  paid_amount: number;
  status: string;
  customers: {
    name: string | null;
  } | null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const search = searchParams.get("search")?.toLowerCase() || "";

  let query = supabase
    .from("invoices")
    .select("*, customers(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) query = query.ilike("id", `%${search}%`);

  const {
    data,
    count,
    error,
  }: {
    data: InvoiceRow[] | null;
    count: number | null;
    error: PostgrestError | null;
  } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formatted = (data || []).map((i) => ({
    id: i.id,
    customer_name: i.customers?.name ?? "(unknown)",
    total: i.total,
    paid_amount: i.paid_amount,
    status: i.status,
    sales_order_id: i.sales_order_id,
  }));

  return NextResponse.json({ data: formatted, count });
}


export async function POST(req: Request) {
  const body = await req.json();
  const { sales_order_id, customer_name, total, status, paid_amount } = body;

  // Log received body for debug
  console.log("Received body:", body);

  // Validate sales_order_id exists
  const { data: so, error: soErr } = await supabase
    .from("sales_orders")
    .select("customer_id,total")
    .eq("id", sales_order_id)
    .single();

  console.log("Sales order found:", so);

  if (soErr || !so) {
    return NextResponse.json({ error: "Invalid sales_order_id" }, { status: 400 });
  }

  // Normalize status to lowercase to match CHECK constraint
  const normalizedStatus = (status ?? "").toLowerCase();

  const { data, error } = await supabase
    .from("invoices")
    .insert([
      {
        sales_order_id,
        customer_id: so.customer_id,
        customer_name,
        total,
        status: normalizedStatus,
        paid_amount,
      },
    ])
    .single();

  if (error) {
    console.error("Error inserting invoice:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}


export async function PUT(req: Request) {
  const body = await req.json();
  const { id, status, paid_amount } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 });
  }

  // Validate status
  const allowedStatuses = ["unpaid", "paid"];
  const normalizedStatus = (status ?? "").toLowerCase();
  if (status && !allowedStatuses.includes(normalizedStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // 🟡 Step 1: Fetch current invoice
  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // 🟡 Step 2: Calculate new paid_amount by adding the new input
  let newPaymentAmount = 0;
  if (paid_amount !== undefined && paid_amount > 0) {
    newPaymentAmount = paid_amount;
  }

  const updatedPaidAmount = invoice.paid_amount + newPaymentAmount;

  // 🟡 Step 3: Update invoice with new total paid amount and status (if any)
  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      ...(status ? { status: normalizedStatus } : {}),
      paid_amount: updatedPaidAmount,
    })
    .eq("id", id);

  if (updateError) {
    console.error("Error updating invoice:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 🟡 Step 4: Create new payment record if a new amount was paid
  if (newPaymentAmount > 0) {
    const now = new Date();
    const { error: insertPaymentError } = await supabase
      .from("payments")
      .insert([
        {
          invoice_id: id,
          amount: newPaymentAmount,
          method: "manual",
          date: now.toISOString().split("T")[0],
          payment_date: now.toISOString(),
        },
      ]);

    if (insertPaymentError) {
      console.error("Error inserting payment record:", insertPaymentError);
      return NextResponse.json({ error: insertPaymentError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}


