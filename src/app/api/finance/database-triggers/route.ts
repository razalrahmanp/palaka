import { NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    // Check for active triggers related to journal entries
    const { data: triggers, error: triggersError } = await supabaseAdmin
      .from('information_schema.triggers')
      .select('*')
      .ilike('trigger_name', '%journal%');

    if (triggersError) {
      console.error('Error fetching triggers:', triggersError);
    }

    // Alternative: Check pg_trigger directly
    const { data: pgTriggers, error: pgError } = await supabaseAdmin
      .rpc('execute_sql', { 
        sql_query: `
          SELECT 
            t.tgname as trigger_name,
            c.relname as table_name,
            p.proname as function_name,
            t.tgenabled as enabled
          FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          JOIN pg_proc p ON t.tgfoid = p.oid
          WHERE t.tgname LIKE '%journal%'
          AND c.relname IN ('payments', 'invoices', 'sales_orders', 'purchase_orders')
          ORDER BY c.relname, t.tgname;
        `
      });

    if (pgError) {
      console.error('Error fetching pg_triggers:', pgError);
    }

    // Check current journal entry counts by source
    const { data: journalStats, error: statsError } = await supabaseAdmin
      .from('journal_entries')
      .select('description, entry_date, journal_number')
      .order('created_at', { ascending: false })
      .limit(20);

    if (statsError) {
      console.error('Error fetching journal stats:', statsError);
    }

    return NextResponse.json({
      success: true,
      triggers: triggers || [],
      pgTriggers: pgTriggers || [],
      recentJournalEntries: journalStats || [],
      message: 'Database trigger analysis complete'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
