import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { data: entry, error } = await supabaseAdmin
      .from('journal_entries')
      .select(`
        *,
        journal_entry_lines (
          *,
          chart_of_accounts (
            account_code,
            account_name,
            account_type
          )
        )
      `)
      .eq('id', params.id)
      .single()

    if (error) throw error

    if (!entry) {
      return NextResponse.json({
        success: false,
        error: 'Journal entry not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: entry
    })
  } catch (error) {
    console.error('Error fetching journal entry:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch journal entry'
    }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const {
      entry_date,
      reference,
      description,
      lines
    } = body

    // Check if entry is already posted
    const { data: existingEntry, error: fetchError } = await supabaseAdmin
      .from('journal_entries')
      .select('status')
      .eq('id', params.id)
      .single()

    if (fetchError) throw fetchError

    if (existingEntry.status === 'POSTED') {
      return NextResponse.json({
        success: false,
        error: 'Cannot modify posted journal entry'
      }, { status: 400 })
    }

    // Validate lines if provided
    if (lines && Array.isArray(lines)) {
      let totalDebits = 0
      let totalCredits = 0

      for (const line of lines) {
        const debitAmount = parseFloat(line.debit_amount || 0)
        const creditAmount = parseFloat(line.credit_amount || 0)

        if (debitAmount && creditAmount) {
          return NextResponse.json({
            success: false,
            error: 'Line cannot have both debit and credit amounts'
          }, { status: 400 })
        }

        totalDebits += debitAmount
        totalCredits += creditAmount
      }

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        return NextResponse.json({
          success: false,
          error: `Journal entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`
        }, { status: 400 })
      }

      // Update journal entry
      const { data: updatedEntry, error: updateError } = await supabaseAdmin
        .from('journal_entries')
        .update({
          entry_date,
          reference,
          description,
          total_amount: totalDebits
        })
        .eq('id', params.id)
        .select()
        .single()

      if (updateError) throw updateError

      // Delete existing lines
      const { error: deleteError } = await supabaseAdmin
        .from('journal_entry_lines')
        .delete()
        .eq('journal_entry_id', params.id)

      if (deleteError) throw deleteError

      // Insert updated lines
      type JournalEntryLine = {
        account_id: string;
        debit_amount?: number | string | null;
        credit_amount?: number | string | null;
        description?: string;
        reference?: string;
      };

      const linesWithEntryId = lines.map((line: JournalEntryLine, index: number) => ({
        journal_entry_id: params.id,
        line_number: index + 1,
        account_id: line.account_id,
        debit_amount: parseFloat(line.debit_amount as string || '0') || null,
        credit_amount: parseFloat(line.credit_amount as string || '0') || null,
        description: line.description || description,
        reference: line.reference
      }))

      const { data: entryLines, error: linesError } = await supabaseAdmin
        .from('journal_entry_lines')
        .insert(linesWithEntryId)
        .select(`
          *,
          chart_of_accounts (
            account_code,
            account_name
          )
        `)

      if (linesError) throw linesError

      return NextResponse.json({
        success: true,
        data: {
          ...updatedEntry,
          journal_entry_lines: entryLines
        }
      })
    } else {
      // Update only journal entry header
      const { data: updatedEntry, error: updateError } = await supabaseAdmin
        .from('journal_entries')
        .update({
          entry_date,
          reference,
          description
        })
        .eq('id', params.id)
        .select(`
          *,
          journal_entry_lines (
            *,
            chart_of_accounts (
              account_code,
              account_name
            )
          )
        `)
        .single()

      if (updateError) throw updateError

      return NextResponse.json({
        success: true,
        data: updatedEntry
      })
    }
  } catch (error) {
    console.error('Error updating journal entry:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update journal entry'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    // Check if entry is posted
    const { data: entry, error: fetchError } = await supabaseAdmin
      .from('journal_entries')
      .select('status')
      .eq('id', params.id)
      .single()

    if (fetchError) throw fetchError

    if (entry.status === 'POSTED') {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete posted journal entry'
      }, { status: 400 })
    }

    // Delete journal entry (lines will be deleted by cascade)
    const { error } = await supabaseAdmin
      .from('journal_entries')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Journal entry deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting journal entry:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete journal entry'
    }, { status: 500 })
  }
}
