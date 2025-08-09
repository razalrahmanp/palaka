import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

// Helper function to create journal entry for existing purchase order
async function createMissingPurchaseOrderJournalEntry(purchaseOrder: {
  id: string;
  total: number;
  created_at: string;
  created_by: string;
  supplier_id?: string;
  product_name?: string;
  description?: string;
  status: string;
}) {
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

    const total = purchaseOrder.total || 0;
    
    // Create journal entry
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        journal_number: nextEntryNumber,
        entry_date: purchaseOrder.created_at ? 
          new Date(purchaseOrder.created_at).toISOString().split('T')[0] : 
          new Date().toISOString().split('T')[0],
        reference_number: `PO-${purchaseOrder.id.slice(0, 8)}`,
        description: `Purchase Order - Inventory Purchase (Auto-balanced)`,
        source_document_type: 'PURCHASE_ORDER',
        source_document_id: purchaseOrder.id,
        status: 'DRAFT',
        total_debit: total,
        total_credit: total,
        created_by: purchaseOrder.created_by
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
        description: `Inventory purchase from PO ${purchaseOrder.id.slice(0, 8)} (Auto-balanced)`,
        reference: `PO-${purchaseOrder.id.slice(0, 8)}`
      },
      {
        journal_entry_id: journalEntry.id,
        line_number: 2,
        account_id: payableAccount.id,
        debit_amount: 0,
        credit_amount: total,
        description: `Accounts payable for PO ${purchaseOrder.id.slice(0, 8)} (Auto-balanced)`,
        reference: `PO-${purchaseOrder.id.slice(0, 8)}`
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
    console.error("Error in createMissingPurchaseOrderJournalEntry:", error);
    return null;
  }
}

export async function GET() {
  try {
    // Find purchase orders that don't have journal entries
    const { data: purchaseOrdersWithoutJournals, error } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        total,
        created_at,
        created_by,
        supplier_id,
        product_name,
        description,
        status
      `)
      .not('total', 'is', null)
      .gt('total', 0);

    if (error) {
      console.error('Error fetching purchase orders:', error);
      return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 });
    }

    if (!purchaseOrdersWithoutJournals || purchaseOrdersWithoutJournals.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No purchase orders found',
        data: {
          total_purchase_orders: 0,
          missing_journal_entries: 0,
          purchase_orders: []
        }
      });
    }

    // Get existing journal entries for these purchase orders
    const poIds = purchaseOrdersWithoutJournals.map(po => po.id);
    const { data: existingJournals, error: journalsError } = await supabase
      .from('journal_entries')
      .select('source_document_id')
      .eq('source_document_type', 'PURCHASE_ORDER')
      .in('source_document_id', poIds);

    if (journalsError) {
      console.error('Error fetching existing journals:', journalsError);
      return NextResponse.json({ error: 'Failed to fetch existing journals' }, { status: 500 });
    }

    const existingJournalPOIds = new Set(existingJournals?.map(j => j.source_document_id) || []);
    
    // Filter out purchase orders that already have journal entries
    const missingJournalPOs = purchaseOrdersWithoutJournals.filter(
      po => !existingJournalPOIds.has(po.id)
    );

    return NextResponse.json({
      success: true,
      data: {
        total_purchase_orders: purchaseOrdersWithoutJournals.length,
        missing_journal_entries: missingJournalPOs.length,
        purchase_orders: missingJournalPOs.map(po => ({
          id: po.id,
          total: po.total,
          created_at: po.created_at,
          product_name: po.product_name,
          description: po.description,
          status: po.status
        }))
      }
    });
  } catch (error) {
    console.error('Error in purchase order journal check:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, purchase_order_ids } = body;

    if (action !== 'create_missing_journals') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get purchase orders that need journal entries
    let purchaseOrdersToProcess;

    if (purchase_order_ids && purchase_order_ids.length > 0) {
      // Process specific purchase orders
      const { data: specificPOs, error: specificError } = await supabase
        .from('purchase_orders')
        .select('*')
        .in('id', purchase_order_ids)
        .not('total', 'is', null)
        .gt('total', 0);

      if (specificError) {
        return NextResponse.json({ error: 'Failed to fetch specified purchase orders' }, { status: 500 });
      }

      purchaseOrdersToProcess = specificPOs || [];
    } else {
      // Process all purchase orders without journal entries
      const { data: allPOs, error: allError } = await supabase
        .from('purchase_orders')
        .select('*')
        .not('total', 'is', null)
        .gt('total', 0);

      if (allError) {
        return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 });
      }

      // Filter out those that already have journal entries
      const poIds = allPOs?.map(po => po.id) || [];
      const { data: existingJournals } = await supabase
        .from('journal_entries')
        .select('source_document_id')
        .eq('source_document_type', 'PURCHASE_ORDER')
        .in('source_document_id', poIds);

      const existingJournalPOIds = new Set(existingJournals?.map(j => j.source_document_id) || []);
      
      purchaseOrdersToProcess = allPOs?.filter(
        po => !existingJournalPOIds.has(po.id)
      ) || [];
    }

    if (purchaseOrdersToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No purchase orders need journal entries',
        data: {
          processed: 0,
          successful: 0,
          failed: 0,
          results: []
        }
      });
    }

    // Create journal entries for each purchase order
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const po of purchaseOrdersToProcess) {
      const journalEntry = await createMissingPurchaseOrderJournalEntry(po);
      
      if (journalEntry) {
        successful++;
        results.push({
          purchase_order_id: po.id,
          journal_entry_id: journalEntry.id,
          journal_number: journalEntry.journal_number,
          status: 'success',
          total: po.total
        });
      } else {
        failed++;
        results.push({
          purchase_order_id: po.id,
          status: 'failed',
          error: 'Failed to create journal entry',
          total: po.total
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto-balance completed. ${successful} successful, ${failed} failed.`,
      data: {
        processed: purchaseOrdersToProcess.length,
        successful,
        failed,
        results
      }
    });
  } catch (error) {
    console.error('Error in purchase order auto-balance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
