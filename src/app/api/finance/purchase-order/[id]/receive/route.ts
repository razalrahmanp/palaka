// app/api/finance/purchase-orders/[id]/receive/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function PATCH(req: NextRequest) {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const id = segments[segments.length - 2]; // extract the [id] from URL

  // 1. Fetch the PO with related data
  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .select(
      `
        id,
        product_id,
        quantity,
        status,
        suppliers ( id, name ),
        product:product_id ( name, price )
      `
    )
    .eq("id", id)
    .single();

  if (poErr || !po) {
    return NextResponse.json({ error: poErr?.message || "PO not found" }, { status: 500 });
  }

  const { product, quantity, suppliers } = po;

  if (!product || !quantity || !suppliers) {
    return NextResponse.json({ error: "Missing product/supplier data" }, { status: 400 });
  }

  const total = Number(quantity) * Number(product[0]?.price);

  // 2. Mark PO as received
  const { error: updateErr } = await supabase
    .from("purchase_orders")
    .update({ status: "received" })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // 3. Increment inventory
  await supabase.rpc("increment_inventory", {
    prod_id: po.product_id,
    qty: quantity,
  });

  // 4. Create expense
  await supabase.from("expenses").insert([
    {
      date: new Date().toISOString().slice(0, 10),
      category: "Manufacturing",
      type: "Direct",
      description: `PO ${id} - ${product[0]?.name}`,
      amount: total,
      payment_method: "Bank",
      subcategory: "Furniture",
    },
  ]);

  // 5. Create bank transaction
  await supabase.from("bank_transactions").insert([
    {
      date: new Date().toISOString().slice(0, 10),
      type: "withdrawal",
      amount: total,
      description: `PO Payment: ${product[0]?.name} from ${suppliers[0]?.name}`,
    },
  ]);

  // 6. Update cashflow snapshot
  const monthStart = new Date();
  monthStart.setDate(1);

  await supabase.rpc("upsert_cashflow_snapshot", {
    mon: monthStart.toISOString().slice(0, 10),
    inflows: 0,
    outflows: total,
  });

  return NextResponse.json({ data: { success: true } });
}
