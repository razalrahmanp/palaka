import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const reference = searchParams.get('reference')
    const status = searchParams.get('status')

    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('journal_entries')
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
      .order('entry_date', { ascending: false })
      .order('journal_number', { ascending: false })

    // Apply filters
    if (startDate) {
      query = query.gte('entry_date', startDate)
    }
    if (endDate) {
      query = query.lte('entry_date', endDate)
    }
    if (reference) {
      query = query.ilike('reference', `%${reference}%`)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: entries, error } = await query
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('journal_entries')
      .select('*', { count: 'exact', head: true })

    if (startDate) countQuery = countQuery.gte('entry_date', startDate)
    if (endDate) countQuery = countQuery.lte('entry_date', endDate)
    if (reference) countQuery = countQuery.ilike('reference', `%${reference}%`)
    if (status) countQuery = countQuery.eq('status', status)

    const { count, error: countError } = await countQuery

    if (countError) throw countError

    return NextResponse.json({
      success: true,
      data: {
        entries,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    })
  } catch (error) {
    console.error('Error fetching journal entries:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch journal entries'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      entry_date,
      reference,
      description,
      source_document_type,
      source_document_id,
      lines
    } = body

    // Validate required fields
    if (!entry_date || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields or invalid lines'
      }, { status: 400 })
    }

    // Calculate totals and validate balance
    let totalDebits = 0
    let totalCredits = 0

    for (const line of lines) {
      if (!line.account_id) {
        return NextResponse.json({
          success: false,
          error: 'Account ID is required for all lines'
        }, { status: 400 })
      }

      const debitAmount = parseFloat(line.debit_amount || 0)
      const creditAmount = parseFloat(line.credit_amount || 0)

      if (debitAmount && creditAmount) {
        return NextResponse.json({
          success: false,
          error: 'Line cannot have both debit and credit amounts'
        }, { status: 400 })
      }

      if (!debitAmount && !creditAmount) {
        return NextResponse.json({
          success: false,
          error: 'Line must have either debit or credit amount'
        }, { status: 400 })
      }

      totalDebits += debitAmount
      totalCredits += creditAmount
    }

    // Check if debits equal credits
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json({
        success: false,
        error: `Journal entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`
      }, { status: 400 })
    }

    // Generate entry number
    const { data: lastEntry } = await supabaseAdmin
      .from('journal_entries')
      .select('journal_number')
      .order('journal_number', { ascending: false })
      .limit(1)

    const nextEntryNumber = lastEntry && lastEntry.length > 0 
      ? (parseInt(lastEntry[0].journal_number) + 1).toString().padStart(6, '0')
      : '000001'

    // Start transaction
    const { data: journalEntry, error: entryError } = await supabaseAdmin
      .from('journal_entries')
      .insert({
        journal_number: nextEntryNumber,
        entry_date,
        reference_number: reference,
        description,
        source_document_type,
        source_document_id,
        status: 'DRAFT',
        total_debit: totalDebits,
        total_credit: totalCredits,
        created_by: '00000000-0000-0000-0000-000000000000' // TODO: Get from auth
      })
      .select()
      .single()

    if (entryError) throw entryError

    // Insert journal entry lines
    type JournalEntryLineInput = {
      account_id: string;
      debit_amount?: number | string;
      credit_amount?: number | string;
      description?: string;
      reference?: string;
    };

    const linesWithEntryId = lines.map((line: JournalEntryLineInput, index: number) => ({
      journal_entry_id: journalEntry.id,
      line_number: index + 1,
      account_id: line.account_id,
      debit_amount: parseFloat(line.debit_amount as string ?? '0') || null,
      credit_amount: parseFloat(line.credit_amount as string ?? '0') || null,
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

    if (linesError) {
      // Clean up journal entry if lines failed
      await supabaseAdmin
        .from('journal_entries')
        .delete()
        .eq('id', journalEntry.id)
      
      throw linesError
    }

    return NextResponse.json({
      success: true,
      data: {
        ...journalEntry,
        journal_entry_lines: entryLines
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating journal entry:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create journal entry'
    }, { status: 500 })
  }
}
