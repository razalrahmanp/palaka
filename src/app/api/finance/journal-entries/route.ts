import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface JournalEntryLine {
  line_number?: number;
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

    // Map database field names to frontend expected field names
    const mappedData = data?.map(entry => {
      // Calculate total amount from journal lines if not available in the entry
      let totalAmount = entry.total_debit || entry.total_credit || 0;
      
      if (totalAmount === 0 && entry.journal_entry_lines?.length > 0) {
        totalAmount = entry.journal_entry_lines.reduce((sum: number, line: { debit_amount?: number | string }) => {
          return sum + (parseFloat(String(line.debit_amount || 0)));
        }, 0);
      }
      
      return {
        ...entry,
        entry_number: entry.journal_number,
        transaction_date: entry.entry_date,
        total_amount: totalAmount,
        journal_entry_lines: entry.journal_entry_lines?.map((line: unknown) => {
          const typedLine = line as { chart_of_accounts?: { account_code?: string; account_name?: string } };
          return {
            ...typedLine,
            account_code: typedLine.chart_of_accounts?.account_code || '',
            account_name: typedLine.chart_of_accounts?.account_name || ''
          };
        })
      };
    });

    return NextResponse.json({ data: mappedData });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { journal_number, entry_date, description, reference_number, lines, created_by } = body;

    // Validate required fields
    if (!journal_number || !entry_date || !description || !lines || lines.length < 2) {
      return NextResponse.json(
        { error: 'Journal number, date, description, and at least 2 lines are required' },
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
      .eq('journal_number', journal_number)
      .single();

    if (existingEntry) {
      return NextResponse.json(
        { error: 'Journal number already exists' },
        { status: 400 }
      );
    }

    // Create journal entry
    const { data: journalEntry, error: journalError } = await supabase
      .from('journal_entries')
      .insert([{
        journal_number,
        entry_date,
        description,
        reference_number: reference_number || null,
        total_debit: totalDebits,
        total_credit: totalCredits,
        created_by: created_by || '00000000-0000-0000-0000-000000000000',
        status: 'DRAFT',
      }])
      .select()
      .single();

    if (journalError) {
      console.error('Error creating journal entry:', journalError);
      return NextResponse.json({ error: journalError.message }, { status: 500 });
    }

    // Create journal entry lines
    const journalLines = lines.map((line: JournalEntryLine, index: number) => ({
      journal_entry_id: journalEntry.id,
      line_number: line.line_number || (index + 1),
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
    const { id, journal_number, entry_date, description, reference_number, lines } = body;

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
        journal_number,
        entry_date,
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
      const journalLines = lines.map((line: JournalEntryLine, index: number) => ({
        journal_entry_id: id,
        line_number: line.line_number || (index + 1),
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
