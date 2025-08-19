import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface JournalEntryLine {
  account_id: string;
  description?: string;
  debit_amount: string | number;
  credit_amount: string | number;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_entry_lines (
          *,
          chart_of_accounts:account_id (
            account_code,
            account_name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching journal entries:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entry_number, transaction_date, description, reference_number, lines } = body;

    // Validate required fields
    if (!entry_number || !transaction_date || !description || !lines || lines.length < 2) {
      return NextResponse.json(
        { error: 'Entry number, date, description, and at least 2 lines are required' },
        { status: 400 }
      );
    }

    // Validate that debits equal credits
    const totalDebits = lines.reduce((sum: number, line: JournalEntryLine) => sum + (parseFloat(line.debit_amount.toString()) || 0), 0);
    const totalCredits = lines.reduce((sum: number, line: JournalEntryLine) => sum + (parseFloat(line.credit_amount.toString()) || 0), 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json(
        { error: 'Journal entry must be balanced. Debits must equal credits.' },
        { status: 400 }
      );
    }

    // Check if entry number already exists
    const { data: existingEntry } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('entry_number', entry_number)
      .single();

    if (existingEntry) {
      return NextResponse.json(
        { error: 'Entry number already exists' },
        { status: 400 }
      );
    }

    // Create journal entry
    const { data: journalEntry, error: journalError } = await supabase
      .from('journal_entries')
      .insert([{
        entry_number,
        transaction_date,
        description,
        reference_number: reference_number || null,
        total_amount: totalDebits,
        status: 'DRAFT',
      }])
      .select()
      .single();

    if (journalError) {
      console.error('Error creating journal entry:', journalError);
      return NextResponse.json({ error: journalError.message }, { status: 500 });
    }

    // Create journal entry lines
    const journalLines = lines.map((line: JournalEntryLine) => ({
      journal_entry_id: journalEntry.id,
      account_id: line.account_id,
      description: line.description || null,
      debit_amount: parseFloat(line.debit_amount.toString()) || 0,
      credit_amount: parseFloat(line.credit_amount.toString()) || 0,
    }));

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(journalLines);

    if (linesError) {
      // Rollback journal entry if lines creation fails
      await supabase
        .from('journal_entries')
        .delete()
        .eq('id', journalEntry.id);

      console.error('Error creating journal entry lines:', linesError);
      return NextResponse.json({ error: linesError.message }, { status: 500 });
    }

    return NextResponse.json({ data: journalEntry }, { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, entry_number, transaction_date, description, reference_number, lines } = body;

    if (!id) {
      return NextResponse.json({ error: 'Journal entry ID is required' }, { status: 400 });
    }

    // Check if entry is already posted
    const { data: existingEntry } = await supabase
      .from('journal_entries')
      .select('status')
      .eq('id', id)
      .single();

    if (existingEntry?.status === 'POSTED') {
      return NextResponse.json(
        { error: 'Cannot edit posted journal entries' },
        { status: 400 }
      );
    }

    // Validate balance if lines are provided
    if (lines) {
      const totalDebits = lines.reduce((sum: number, line: JournalEntryLine) => sum + (parseFloat(line.debit_amount.toString()) || 0), 0);
      const totalCredits = lines.reduce((sum: number, line: JournalEntryLine) => sum + (parseFloat(line.credit_amount.toString()) || 0), 0);
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        return NextResponse.json(
          { error: 'Journal entry must be balanced. Debits must equal credits.' },
          { status: 400 }
        );
      }
    }

    // Update journal entry
    const { data, error } = await supabase
      .from('journal_entries')
      .update({
        entry_number,
        transaction_date,
        description,
        reference_number: reference_number || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating journal entry:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update lines if provided
    if (lines) {
      // Delete existing lines
      await supabase
        .from('journal_entry_lines')
        .delete()
        .eq('journal_entry_id', id);

      // Insert new lines
      const journalLines = lines.map((line: JournalEntryLine) => ({
        journal_entry_id: id,
        account_id: line.account_id,
        description: line.description || null,
        debit_amount: parseFloat(line.debit_amount.toString()) || 0,
        credit_amount: parseFloat(line.credit_amount.toString()) || 0,
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(journalLines);

      if (linesError) {
        console.error('Error updating journal entry lines:', linesError);
        return NextResponse.json({ error: linesError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Journal entry ID is required' }, { status: 400 });
    }

    // Check if entry is posted
    const { data: existingEntry } = await supabase
      .from('journal_entries')
      .select('status')
      .eq('id', id)
      .single();

    if (existingEntry?.status === 'POSTED') {
      return NextResponse.json(
        { error: 'Cannot delete posted journal entries' },
        { status: 400 }
      );
    }

    // Delete journal entry lines first (due to foreign key constraint)
    await supabase
      .from('journal_entry_lines')
      .delete()
      .eq('journal_entry_id', id);

    // Delete journal entry
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting journal entry:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Journal entry deleted successfully' });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
