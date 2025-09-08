// API endpoint to debug journal entries and lines
// src/app/api/debug/journal-entries/route.ts

import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log('🔍 Debugging journal entries and lines...');
    
    // Get all journal entries
    const { data: journalEntries, error: journalError } = await supabase
      .from('journal_entries')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (journalError) {
      console.error('Error fetching journal entries:', journalError);
      return NextResponse.json({ error: journalError.message }, { status: 500 });
    }
    
    // Get all journal entry lines
    const { data: journalLines, error: linesError } = await supabase
      .from('journal_entry_lines')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (linesError) {
      console.error('Error fetching journal entry lines:', linesError);
      return NextResponse.json({ error: linesError.message }, { status: 500 });
    }
    
    // Find orphaned lines (lines without corresponding journal entries)
    const journalEntryIds = new Set(journalEntries?.map(je => je.id) || []);
    const orphanedLines = journalLines?.filter(line => !journalEntryIds.has(line.journal_entry_id)) || [];
    
    // Find journal entries without lines
    const lineJournalIds = new Set(journalLines?.map(line => line.journal_entry_id) || []);
    const journalsWithoutLines = journalEntries?.filter(je => !lineJournalIds.has(je.id)) || [];
    
    // Get unique transaction references from orphaned lines
    const orphanedTransactionRefs = [...new Set(orphanedLines.map(line => line.transaction_reference).filter(Boolean))];
    
    // Get sales order payments that might be related to orphaned lines
    const { data: salesOrderPayments } = await supabase
      .from('sales_order_payments')
      .select(`
        id,
        sales_order_id,
        amount,
        payment_method,
        payment_date,
        reference_number,
        notes,
        sales_orders (
          id,
          order_number,
          total_amount,
          customer_id,
          status
        )
      `)
      .order('created_at', { ascending: false });
    
    // Get expense entries that might be related
    const { data: expenses } = await supabase
      .from('finance_expenses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    // Analyze journal entry patterns
    const journalEntrySummary = {
      totalJournalEntries: journalEntries?.length || 0,
      totalJournalLines: journalLines?.length || 0,
      orphanedLines: orphanedLines.length,
      journalsWithoutLines: journalsWithoutLines.length,
      uniqueOrphanedTransactionRefs: orphanedTransactionRefs.length
    };
    
    // Group orphaned lines by transaction reference
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orphanedLinesByRef = orphanedLines.reduce((acc: Record<string, any[]>, line) => {
      const ref = line.transaction_reference || 'NO_REFERENCE';
      if (!acc[ref]) {
        acc[ref] = [];
      }
      acc[ref].push(line);
      return acc;
    }, {});
    
    // Get recent sales orders for context
    const { data: recentSalesOrders } = await supabase
      .from('sales_orders')
      .select(`
        id,
        order_number,
        total_amount,
        status,
        created_at,
        sales_order_payments (
          id,
          amount,
          payment_method,
          payment_date
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);
    
    return NextResponse.json({
      summary: journalEntrySummary,
      journalEntries: journalEntries || [],
      journalLines: journalLines || [],
      orphanedLines,
      orphanedLinesByRef,
      orphanedTransactionRefs,
      journalsWithoutLines,
      salesOrderPayments: salesOrderPayments || [],
      expenses: expenses || [],
      recentSalesOrders: recentSalesOrders || []
    });
    
  } catch (error) {
    console.error('Debug journal entries endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Debug journal entries endpoint failed', details: errorMessage },
      { status: 500 }
    );
  }
}
