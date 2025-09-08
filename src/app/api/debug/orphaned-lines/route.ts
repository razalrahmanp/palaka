// API endpoint to find orphaned journal entry lines
// src/app/api/debug/orphaned-lines/route.ts

import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log('🔍 Checking for orphaned journal entry lines...');
    
    // Get all journal entry IDs
    const { data: journalEntries } = await supabase
      .from('journal_entries')
      .select('id, journal_number, description, entry_date, source_document_type, source_document_id');
    
    const journalEntryIds = journalEntries?.map(je => je.id) || [];
    console.log(`Found ${journalEntryIds.length} journal entries`);
    
    // Get all journal entry lines
    const { data: allLines } = await supabase
      .from('journal_entry_lines')
      .select(`
        id,
        journal_entry_id,
        line_number,
        debit_amount,
        credit_amount,
        description,
        reference
      `);
    
    console.log(`Found ${allLines?.length || 0} journal lines`);
    
    // Find orphaned lines (lines that reference non-existent journal entries)
    const orphanedLines = allLines?.filter(line => 
      !journalEntryIds.includes(line.journal_entry_id)
    ) || [];
    
    console.log(`Found ${orphanedLines.length} orphaned lines`);
    
    // Find journal entries without lines
    const linesJournalIds = allLines?.map(line => line.journal_entry_id) || [];
    const journalsWithoutLines = journalEntries?.filter(je => 
      !linesJournalIds.includes(je.id)
    ) || [];
    
    console.log(`Found ${journalsWithoutLines.length} journals without lines`);
    
    // Get sales order payments to cross-reference
    const { data: salesOrderPayments } = await supabase
      .from('sales_order_payments')
      .select(`
        id,
        sales_order_id,
        amount,
        payment_method,
        payment_date,
        reference_number,
        sales_orders (
          id,
          order_number,
          total_amount,
          status
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);
    
    // Check which sales order payments might not have journal entries
    const paymentsWithoutJournals = [];
    if (salesOrderPayments) {
      for (const payment of salesOrderPayments) {
        const hasJournal = journalEntries?.some(je => 
          je.source_document_type === 'sales_order_payment' && 
          je.source_document_id === payment.id
        );
        if (!hasJournal) {
          paymentsWithoutJournals.push(payment);
        }
      }
    }
    
    console.log(`Found ${paymentsWithoutJournals.length} payments without journals`);
    
    return NextResponse.json({
      summary: {
        totalJournalEntries: journalEntries?.length || 0,
        totalJournalLines: allLines?.length || 0,
        orphanedLines: orphanedLines.length,
        journalsWithoutLines: journalsWithoutLines.length,
        paymentsWithoutJournals: paymentsWithoutJournals.length
      },
      orphanedLines,
      journalsWithoutLines,
      paymentsWithoutJournals,
      recentJournalEntries: journalEntries?.slice(0, 10) || [],
      recentSalesOrderPayments: salesOrderPayments?.slice(0, 10) || []
    });
    
  } catch (error) {
    console.error('Orphaned lines check error:', error);
    return NextResponse.json(
      { 
        error: 'Orphaned lines check failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
