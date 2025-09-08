import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get journal entries with their status
    const { data: journalEntries, error: journalError } = await supabase
      .from('journal_entries')
      .select(`
        id,
        journal_number,
        description,
        total_debit,
        total_credit,
        status,
        entry_date,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (journalError) {
      return NextResponse.json({ error: journalError.message }, { status: 500 });
    }

    // Count entries by status
    const statusCounts = journalEntries?.reduce((acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Get recent DRAFT entries
    const draftEntries = journalEntries?.filter(entry => entry.status === 'DRAFT') || [];

    return NextResponse.json({
      success: true,
      statusCounts,
      draftEntries,
      totalEntries: journalEntries?.length || 0,
      recentEntries: journalEntries?.slice(0, 10) || []
    });

  } catch (error) {
    console.error('Error checking journal status:', error);
    return NextResponse.json({ 
      error: 'Failed to check journal status',
      details: error 
    }, { status: 500 });
  }
}
