import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Journal entry ID is required' }, { status: 400 });
    }

    // Check if entry exists and is in draft status
    const { data: existingEntry, error: fetchError } = await supabase
      .from('journal_entries')
      .select('id, status, entry_number')
      .eq('id', id)
      .single();

    if (fetchError || !existingEntry) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    if (existingEntry.status === 'POSTED') {
      return NextResponse.json({ error: 'Journal entry is already posted' }, { status: 400 });
    }

    // Verify that the journal entry is balanced
    const { data: lines, error: linesError } = await supabase
      .from('journal_entry_lines')
      .select('debit_amount, credit_amount')
      .eq('journal_entry_id', id);

    if (linesError) {
      console.error('Error fetching journal entry lines:', linesError);
      return NextResponse.json({ error: linesError.message }, { status: 500 });
    }

    const totalDebits = lines?.reduce((sum, line) => sum + (line.debit_amount || 0), 0) || 0;
    const totalCredits = lines?.reduce((sum, line) => sum + (line.credit_amount || 0), 0) || 0;

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json(
        { error: 'Cannot post unbalanced journal entry. Debits must equal credits.' },
        { status: 400 }
      );
    }

    // Update journal entry status to POSTED
    const { data, error } = await supabase
      .from('journal_entries')
      .update({
        status: 'POSTED',
        posted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error posting journal entry:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data,
      message: `Journal entry ${existingEntry.entry_number} posted successfully` 
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
