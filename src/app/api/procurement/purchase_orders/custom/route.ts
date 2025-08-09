import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

// Helper function to create vendor bill from purchase order
async function createVendorBillFromPO({
  purchase_order_id,
  supplier_id,
  total_amount
}: {
  purchase_order_id: string;
  supplier_id: string | null;
  total_amount: number;
}) {
  try {
    if (!supplier_id) {
      console.warn("No supplier_id provided for vendor bill creation");
      return null;
    }

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
        description: `Vendor bill for Custom Purchase Order ${purchase_order_id}`,
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

// Helper function to create journal entry for purchase order
async function createPurchaseOrderJournalEntry(purchaseOrderId: string, supplierId: string | null, total: number, createdBy: string) {
  try {
    // Get required account IDs from chart of accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("chart_of_accounts")
      .select("id, account_code, account_name")
      .in("account_code", ["1400", "2000"]); // 1400: Inventory, 2000: Accounts Payable

    if (accountsError || !accounts || accounts.length < 2) {
      console.warn("Required accounts not found for journal entry. Expected accounts: 1400 (Inventory), 2000 (Accounts Payable)");
      return null;
    }

    const inventoryAccount = accounts.find(acc => acc.account_code === "1400");
    const payableAccount = accounts.find(acc => acc.account_code === "2000");

    if (!inventoryAccount || !payableAccount) {
      console.warn("Missing required accounts for purchase order journal entry");
      return null;
    }

    // Generate journal entry number
    const { data: lastEntry } = await supabase
      .from('journal_entries')
      .select('journal_number')
      .order('journal_number', { ascending: false })
      .limit(1);

    const nextEntryNumber = lastEntry && lastEntry.length > 0 
      ? (parseInt(lastEntry[0].journal_number) + 1).toString().padStart(6, '0')
      : '000001';

    // Create journal entry
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        journal_number: nextEntryNumber,
        entry_date: new Date().toISOString().split('T')[0],
        reference_number: `PO-${purchaseOrderId.slice(0, 8)}`,
        description: `Purchase Order - Inventory Purchase`,
        source_document_type: 'PURCHASE_ORDER',
        source_document_id: purchaseOrderId,
        status: 'DRAFT',
        total_debit: total,
        total_credit: total,
        created_by: createdBy
      })
      .select()
      .single();

    if (entryError) {
      console.error("Error creating journal entry:", entryError);
      return null;
    }

    // Create journal entry lines
    const journalLines = [
      {
        journal_entry_id: journalEntry.id,
        line_number: 1,
        account_id: inventoryAccount.id,
        debit_amount: total,
        credit_amount: 0,
        description: `Inventory purchase from PO ${purchaseOrderId.slice(0, 8)}`,
        reference: `PO-${purchaseOrderId.slice(0, 8)}`
      },
      {
        journal_entry_id: journalEntry.id,
        line_number: 2,
        account_id: payableAccount.id,
        debit_amount: 0,
        credit_amount: total,
        description: `Accounts payable for PO ${purchaseOrderId.slice(0, 8)}`,
        reference: `PO-${purchaseOrderId.slice(0, 8)}`
      }
    ];

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(journalLines);

    if (linesError) {
      console.error("Error creating journal entry lines:", linesError);
      // Clean up journal entry if lines failed
      await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
      return null;
    }

    return journalEntry;
  } catch (error) {
    console.error("Error in createPurchaseOrderJournalEntry:", error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      supplier_id = null,
      supplier_name,
      product_id = null,
      product_name,
      quantity,
      created_by,
      custom_type = "custom-sales",
      description = "",
      total,
      status = "pending"
    } = body;

    // Basic validation
    if (!quantity || !created_by || total == null) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // 🔍 Resolve supplier_id by name
    let resolvedSupplierId = supplier_id;
    if (!resolvedSupplierId && supplier_name) {
      const { data: supplier, error: supplierErr } = await supabase
        .from("suppliers")
        .select("id")
        .ilike("name", supplier_name.trim())
        .single();

      if (supplierErr) {
        console.warn(`Supplier not found: "${supplier_name}"`);
      } else {
        resolvedSupplierId = supplier?.id ?? null;
      }
    }

    // 🔍 Resolve product_id by name
    let resolvedProductId = product_id;
    if (!resolvedProductId && product_name) {
      const { data: product, error: productErr } = await supabase
        .from("products")
        .select("id")
        .ilike("name", product_name.trim())
        .single();

      if (productErr) {
        console.warn(`Product not found: "${product_name}"`);
      } else {
        resolvedProductId = product?.id ?? null;
      }
    }

    const { data, error } = await supabase
      .from("purchase_orders")
      .insert([
        {
          supplier_id: resolvedSupplierId,
          product_id: resolvedProductId,
          quantity,
          status,
          created_by,
          is_custom: true,
          custom_type,
          description,
          total,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Insert Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 🆕 Create journal entry for the purchase order
    const journalEntry = await createPurchaseOrderJournalEntry(
      data.id,
      resolvedSupplierId,
      total,
      created_by
    );

    if (journalEntry) {
      console.log(`Journal entry created for PO ${data.id}: ${journalEntry.journal_number}`);
    } else {
      console.warn(`Failed to create journal entry for PO ${data.id}`);
    }

    // 🆕 Create vendor bill if PO is approved
    let vendorBill = null;
    if (status === 'approved') {
      try {
        vendorBill = await createVendorBillFromPO({
          purchase_order_id: data.id,
          supplier_id: resolvedSupplierId,
          total_amount: total
        });

        if (vendorBill) {
          console.log(`Vendor bill created for approved custom PO ${data.id}: ${vendorBill.bill_number}`);
        }
      } catch (vendorBillError) {
        console.error('❌ Failed to create vendor bill for custom purchase order:', vendorBillError);
      }
    }

    return NextResponse.json({
      ...data,
      journal_entry_created: !!journalEntry,
      vendor_bill_created: !!vendorBill
    }, { status: 201 });
  } catch (err: unknown) {
    console.error("Unexpected Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
