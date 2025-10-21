import { NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabasePool';

export async function POST() {
  try {
    console.log('Testing trigger functionality...');

    // Check for recent journal entries (last hour) to see trigger activity
    const { data: recentJournalEntries, error: journalError } = await supabaseAdmin
      .from('journal_entries')
      .select(`
        id,
        reference_type,
        reference_id,
        created_at,
        total_amount,
        journal_entry_lines(account_id, debit_amount, credit_amount)
      `)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (journalError) {
      console.error('Error fetching recent journal entries:', journalError);
      return NextResponse.json({ error: journalError.message }, { status: 500 });
    }

    // Check trigger status
    const { data: triggers, error: triggerError } = await supabaseAdmin
      .rpc('get_trigger_info');

    if (triggerError) {
      console.log('Could not fetch trigger info, checking manually...');
    }

    // Get payment and sales order counts for comparison
    const { data: paymentCount } = await supabaseAdmin
      .from('payments')
      .select('id', { count: 'exact', head: true });

    const { data: salesOrderCount } = await supabaseAdmin
      .from('sales_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'INVOICED');

    const { data: journalCount } = await supabaseAdmin
      .from('journal_entries')
      .select('id', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      recentJournalEntries: recentJournalEntries || [],
      recentCount: recentJournalEntries?.length || 0,
      systemStatus: {
        totalPayments: paymentCount || 0,
        totalInvoicedSalesOrders: salesOrderCount || 0,
        totalJournalEntries: journalCount || 0
      },
      triggerStatus: triggers || 'Could not retrieve',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
