import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get unmatched bank deposits
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bank_account_id = searchParams.get('bank_account_id');
    const is_matched = searchParams.get('is_matched');

    let query = supabase
      .from('unmatched_bank_deposits')
      .select(`
        *,
        bank_accounts (
          id,
          name,
          account_number
        ),
        bank_statement_imports (
          id,
          file_name,
          import_date
        )
      `)
      .order('transaction_date', { ascending: false });

    // Apply filters
    if (bank_account_id) {
      query = query.eq('bank_account_id', bank_account_id);
    }

    if (is_matched !== null) {
      query = query.eq('is_matched', is_matched === 'true');
    }

    const { data: deposits, error } = await query;

    if (error) {
      console.error('Error fetching unmatched deposits:', error);
      return NextResponse.json(
        { error: 'Failed to fetch unmatched deposits' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deposits || [],
      count: deposits?.length || 0
    });

  } catch (error) {
    console.error('Error in GET /api/finance/bajaj/unmatched-deposits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create unmatched deposit (manual entry)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bank_account_id,
      transaction_date,
      amount,
      reference_number,
      description,
      notes,
      bank_statement_import_id
    } = body;

    // Validate required fields
    if (!bank_account_id || !transaction_date || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: bank_account_id, transaction_date, amount' },
        { status: 400 }
      );
    }

    // Insert unmatched deposit
    const { data: deposit, error: insertError } = await supabase
      .from('unmatched_bank_deposits')
      .insert({
        bank_account_id,
        transaction_date,
        amount,
        reference_number,
        description,
        notes,
        bank_statement_import_id,
        is_matched: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating unmatched deposit:', insertError);
      return NextResponse.json(
        { error: 'Failed to create unmatched deposit: ' + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deposit,
      message: 'Unmatched deposit created successfully'
    });

  } catch (error) {
    console.error('Error in POST /api/finance/bajaj/unmatched-deposits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
