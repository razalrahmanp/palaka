// Simple API endpoint to check journal entries and lines
// src/app/api/debug/journal-check/route.ts

import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log('🔍 Simple journal check...');
    
    // Get count of journal entries
    const { count: journalCount, error: journalCountError } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true });
    
    // Get count of journal entry lines
    const { count: linesCount, error: linesCountError } = await supabase
      .from('journal_entry_lines')
      .select('*', { count: 'exact', head: true });
    
    // Get recent journal entries
    const { data: recentJournals } = await supabase
      .from('journal_entries')
      .select('id, journal_number, entry_date, description, total_debit, total_credit, status')
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Get recent journal lines
    const { data: recentLines } = await supabase
      .from('journal_entry_lines')
      .select('id, journal_entry_id, line_number, debit_amount, credit_amount, description')
      .order('updated_at', { ascending: false })
      .limit(20);
    
    return NextResponse.json({
      summary: {
        journalEntriesCount: journalCount || 0,
        journalLinesCount: linesCount || 0,
        errors: {
          journalCountError: journalCountError?.message,
          linesCountError: linesCountError?.message
        }
      },
      recentJournals: recentJournals || [],
      recentLines: recentLines || []
    });
    
  } catch (error) {
    console.error('Journal check error:', error);
    return NextResponse.json(
      { error: 'Journal check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
