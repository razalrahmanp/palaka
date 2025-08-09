// api/finance/purchase-order/route.ts

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { createPurchaseOrderJournalEntry, createSupplierPaymentJournalEntry } from "@/lib/accounting-integration";
import { FinPurchaseOrder } from "@/types";
import { getCurrentUser } from "@/lib/auth";

// Helper function to create vendor bill from purchase order
async function createVendorBillFromPO({
  purchase_order_id,
  supplier_id,
  total_amount
}: {
  purchase_order_id: string;
  supplier_id: string;
  total_amount: number;
}) {
  try {
    // Get supplier payment terms
    const { data: paymentTerms } = await supabase
      .from('vendor_payment_terms')
      .select('payment_terms_days')
      .eq('supplier_id', supplier_id)
      .eq('is_active', true)
      .single();

    const termsDays = paymentTerms?.payment_terms_days || 30;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + termsDays);

    // Generate bill number
    const billNumber = `PO-${purchase_order_id.substring(0, 8)}-${Date.now()}`;

    // Get system user for created_by
    const { data: systemUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();

    // Create vendor bill
    const { data: vendorBill, error: vendorBillError } = await supabase
      .from('vendor_bills')
      .insert({
        bill_number: billNumber,
        supplier_id: supplier_id,
        purchase_order_id: purchase_order_id,
        bill_date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        total_amount: total_amount,
        paid_amount: 0,
        status: 'pending',
        description: `Vendor bill for Purchase Order ${purchase_order_id}`,
        reference_number: `PO-REF-${purchase_order_id}`,
        created_by: systemUser?.id,
        updated_by: systemUser?.id
      })
      .select()
      .single();

    if (vendorBillError) {
      throw vendorBillError;
    }

    return vendorBill;
  } catch (error) {
    console.error("Error creating vendor bill from PO:", error);
    throw error;
  }
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


    type PurchaseOrderRow = {
      id: string;
      status: string;
      quantity: number;
      total: number;
      due_date: string;
      payment_status: string;
      paid_amount: number;
      created_at: string;
      suppliers: { id: string; name: string }[] | null;
      product: { price: number; name: string }[] | null;
      product_id?: string;
    };

    const mapped: FinPurchaseOrder[] = (data ?? []).map((row: PurchaseOrderRow) => ({
      id: row.id,
      date: row.created_at ? row.created_at.split("T")[0] : "",
      status: (["pending", "approved", "received"].includes(row.status)
        ? row.status
        : "pending") as "pending" | "approved" | "received",
      total: row.total ?? 0,
      due_date: row.due_date ?? "",
      payment_status: (row.payment_status === "paid" || row.payment_status === "unpaid" || row.payment_status === "partially_paid")
        ? row.payment_status
        : "unpaid",
      paid_amount: row.paid_amount ?? 0,
      supplier: Array.isArray(row.suppliers) && row.suppliers.length > 0
        ? { id: row.suppliers[0].id, name: row.suppliers[0].name }
        : undefined,
      products: Array.isArray(row.product) && row.product.length > 0
        ? [
            {
              id: row.product_id ?? "",
              name: row.product[0].name ?? "",
              quantity: row.quantity ?? 0,
              price: row.product[0].price ?? 0,
            },
          ]
        : [],
      products_id: Array.isArray(row.product) && row.product.length > 0
        ? [
            {
              id: row.product_id ?? "",
              name: row.product[0].name ?? "",
              quantity: row.quantity ?? 0,
              price: row.product[0].price ?? 0,
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

  try {
    // 1. Get product details to calculate total
    let total = 0;
    if (product_id) {
      const { data: product } = await supabase
        .from("products")
        .select("price")
        .eq("id", product_id)
        .single();
      
      if (product) {
        total = (product.price || 0) * quantity;
      }
    }

    // 2. Create purchase order record
    const { data: purchaseOrder, error } = await supabase.from("purchase_orders").insert([
      {
        supplier_id,
        product_id: product_id ?? null,
        quantity,
        total,
        status,
        due_date,
        paid_amount,
        payment_status,
        created_by: getCurrentUser(),
      },
    ])
    .select()
    .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. Create accounting journal entry for purchase order
    // Dr. Inventory / Cr. Accounts Payable
    if (total > 0) {
      try {
        await createPurchaseOrderJournalEntry({
          id: purchaseOrder.id,
          total: total,
          created_at: new Date().toISOString(),
          supplier_id: supplier_id
        });
        console.log(`✅ Journal entry created for purchase order ${purchaseOrder.id}`);
      } catch (journalError) {
        console.error('❌ Failed to create journal entry for purchase order:', journalError);
      }
    }

    // 4. If payment made, create expense record and journal entry
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

      // Create payment journal entry
      try {
        await createSupplierPaymentJournalEntry({
          id: `${purchaseOrder.id}-payment`,
          amount: paid_amount,
          payment_date: new Date().toISOString(),
          supplier_id: supplier_id
        });
        console.log(`✅ Payment journal entry created for purchase order ${purchaseOrder.id}`);
      } catch (journalError) {
        console.error('❌ Failed to create payment journal entry:', journalError);
      }
    }

    return NextResponse.json({ 
      success: true,
      accounting_integration: true,
      message: "Purchase order created with automatic journal entries"
    });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 });
  }
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

  // Get PO details before update for vendor bill creation
  const { data: existingPO, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("id, supplier_id, total, status")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("purchase_orders")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Create vendor bill when PO is approved
  if (status && status === 'approved' && existingPO?.status !== 'approved') {
    try {
      await createVendorBillFromPO({
        purchase_order_id: id,
        supplier_id: existingPO.supplier_id,
        total_amount: existingPO.total || 0
      });
      console.log(`✅ Vendor bill created for approved purchase order ${id}`);
    } catch (vendorBillError) {
      console.error('❌ Failed to create vendor bill for purchase order:', vendorBillError);
    }
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

    // Create supplier payment journal entry
    try {
      await createSupplierPaymentJournalEntry({
        id: `${id}-payment-${Date.now()}`,
        amount: paid_amount,
        payment_date: new Date().toISOString(),
        supplier_id: body.supplier_id || 'unknown'
      });
      console.log(`✅ Payment journal entry created for purchase order ${id}`);
    } catch (journalError) {
      console.error('❌ Failed to create payment journal entry:', journalError);
    }

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
