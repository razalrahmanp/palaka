// api/finance/purchase-order/route.ts

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { FinPurchaseOrder } from "@/types";
import { getCurrentUser } from "@/lib/auth";

interface RawPurchaseOrder {
  id: string;
  status: "pending" | "approved" | "received";
  quantity: number | null;
  total: number | null;
  created_at: string | null;
  due_date?: string | null;
  payment_status?: "unpaid" | "paid" | "partially_paid";
  paid_amount?: number | null;
  suppliers?: { id: string; name: string } | null;
  product?: { price: number | null; name?: string | null } | null;
  product_id?: string | null;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select(`
        id,
        status,
        quantity,
        total,
        due_date,
        payment_status,
        paid_amount,
        created_at,
        suppliers (
          id,
          name
        ),
        product:product_id (
          price,
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const typedData = data as RawPurchaseOrder[];

    const mapped: FinPurchaseOrder[] = typedData.map((row) => ({
      id: row.id,
      date: row.created_at ? row.created_at.split("T")[0] : "",
      status: row.status,
      total: row.total ?? 0,
      due_date: row.due_date ?? "",
      payment_status: row.payment_status ?? "unpaid",
      paid_amount: row.paid_amount ?? 0,
      supplier: row.suppliers
        ? { id: row.suppliers.id, name: row.suppliers.name }
        : undefined,
      products: row.product
        ? [
            {
              id: row.product_id ?? "",
              name: row.product?.name ?? "",
              quantity: row.quantity ?? 0,
              price: row.product?.price ?? 0,
            },
          ]
        : [],
      products_id: row.product
        ? [
            {
              id: row.product_id ?? "",
              name: row.product?.name ?? "",
              quantity: row.quantity ?? 0,
              price: row.product?.price ?? 0,
            },
          ]
        : [],
    }));

    return NextResponse.json({ data: mapped });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    supplier_id,
    product_id,
    quantity,
    status,
    due_date,
    paid_amount,
    payment_status,
  } = body;

  if (!supplier_id || !quantity || !status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error, data } = await supabase.from("purchase_orders").insert([
    {
      supplier_id,
      product_id: product_id ?? null,
      quantity,
      status,
      due_date,
      paid_amount,
      payment_status,
      created_by: getCurrentUser(),
    },
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (paid_amount && payment_status === "paid") {
    await supabase.from("expenses").insert([
      {
        date: new Date().toISOString().slice(0, 10),
        category: "Manufacturing",
        description: `PO Payment to Supplier ID: ${supplier_id}`,
        amount: paid_amount,
        payment_method: "Bank",
        type: "Direct",
      },
    ]);
  }

  return NextResponse.json({ success: true });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const {
    id,
    status,
    quantity,
    product_id,
    due_date,
    paid_amount,
    bank_account_id,
  } = body;

  if (!id) {
    return NextResponse.json(
      { error: "Missing purchase order ID" },
      { status: 400 }
    );
  }

  const updates: {
    status?: string;
    quantity?: number;
    product_id?: string;
    paid_amount?: number;
    payment_status?: string;
    // new_payment_amount?: number;
    due_date?: string;
  } = {
    status,
    quantity,
    product_id,
    paid_amount: body.paid_amount ?? null,
    payment_status: body.payment_status ?? "unpaid",
    due_date,
  };

  const { error: updateError } = await supabase
    .from("purchase_orders")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (paid_amount && paid_amount > 0) {
    await supabase.from("purchase_order_payments").insert([
      {
        purchase_order_id: id,
        amount: paid_amount,
        payment_date: new Date().toISOString(),
      },
    ]);

    await supabase.from("expenses").insert([
      {
        date: new Date().toISOString().slice(0, 10),
        category: "Manufacturing",
        description: `PO Payment for PO ID: ${id}`,
        amount: paid_amount,
        payment_method: "Bank",
        type: "Direct",
        created_by: getCurrentUser(), // Replace with actual user ID if available
      },
    ]);

    // create a bank transaction if bank_account_id is provided
    // if (bank_account_id) {
      const { error: transactionError } = await supabase
        .from("bank_transactions")
        .insert([
          {
            bank_account_id,
            date: new Date().toISOString().slice(0, 10),
            type: "withdrawal",
            amount: paid_amount,
            description: `PO Payment for PO ID: ${id}`,
            reference: `purchase_order:${id}`,
          },
        ]);
   
    if (transactionError) {
      return NextResponse.json(
        { error: transactionError.message },
        { status: 500 }
      );
    }
  // }

    // If bank_account_id is provided, update the bank account balance
    if (bank_account_id) {
      const { data: bankAccount, error: bankError } = await supabase
        .from("bank_accounts")
        .select("current_balance")
        .eq("id", bank_account_id)
        .single();

      if (bankError) {
        return NextResponse.json({ error: bankError.message }, { status: 500 });
      }

      const newBalance = (bankAccount?.current_balance || 0) - paid_amount;

      const { error: updateBankError } = await supabase
        .from("bank_accounts")
        .update({ current_balance: newBalance })
        .eq("id", bank_account_id);

      if (updateBankError) {
        return NextResponse.json({ error: updateBankError.message }, { status: 500 });
      }
    }

    // Insert cashflow entry    

    await supabase.from("cashflow_entries").insert([
      {
        date: new Date().toISOString().slice(0, 10),
        amount: paid_amount,
        direction: "outflow",
        description: `PO Payment for PO ID: ${id}`,
        reference_type: "purchase_order",
        reference_id: id,
      },
    ]);

    const today = new Date();
    const month = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    const { data: snapshot } = await supabase
      .from("cashflow_snapshots")
      .select("id, outflows, inflows")
      .eq("month", month)
      .single();

    if (snapshot) {
      await supabase
        .from("cashflow_snapshots")
        .update({
          outflows: snapshot.outflows + paid_amount,
          net_position:
            snapshot.inflows - (snapshot.outflows + paid_amount),
        })
        .eq("id", snapshot.id);
    } else {
      await supabase.from("cashflow_snapshots").insert([
        {
          month,
          inflows: 0,
          outflows: paid_amount,
          net_position: -paid_amount,
        },
      ]);
    }

    // Update purchase_orders.paid_amount and payment_status
    const { data: payments } = await supabase
      .from("purchase_order_payments")
      .select("amount")
      .eq("purchase_order_id", id);

    const totalPaid = payments?.reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0;

    const { data: po } = await supabase
      .from("purchase_orders")
      .select("total")
      .eq("id", id)
      .single();

    const isFullyPaid = po && totalPaid >= po.total;

    await supabase
      .from("purchase_orders")
      .update({
        paid_amount: totalPaid,
        payment_status: isFullyPaid ? "paid" : "partially_paid",
      })
      .eq("id", id);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json(
      { error: "Missing purchase order ID" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("purchase_orders").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
