import { NextResponse, NextRequest } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - Fetch employee obligations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employee_id = searchParams.get('employee_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const obligation_type = searchParams.get('obligation_type');

    let query = supabaseAdmin
      .from('employee_obligations')
      .select(`
        id,
        employee_id,
        obligation_date,
        obligation_type,
        amount,
        description,
        reference_number,
        notes,
        created_at,
        created_by,
        updated_at,
        employees:employee_id (
          id,
          name,
          employee_id,
          position
        )
      `)
      .order('obligation_date', { ascending: false });

    // Apply filters
    if (employee_id) {
      query = query.eq('employee_id', employee_id);
    }

    if (start_date) {
      query = query.gte('obligation_date', start_date);
    }

    if (end_date) {
      query = query.lte('obligation_date', end_date);
    }

    if (obligation_type) {
      query = query.eq('obligation_type', obligation_type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching employee obligations:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Error in GET employee obligations:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create new employee obligation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      obligation_date,
      obligation_type,
      amount,
      description,
      reference_number,
      notes,
      created_by
    } = body;

    // Validation
    if (!employee_id || !obligation_date || !obligation_type || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: employee_id, obligation_date, obligation_type, amount' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    const validTypes = ['salary', 'incentive', 'overtime', 'bonus', 'allowance', 'commission', 'other'];
    if (!validTypes.includes(obligation_type)) {
      return NextResponse.json(
        { success: false, error: `Invalid obligation_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Insert obligation
    const { data, error } = await supabaseAdmin
      .from('employee_obligations')
      .insert({
        employee_id,
        obligation_date,
        obligation_type,
        amount,
        description,
        reference_number,
        notes,
        created_by
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating employee obligation:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Obligation created successfully'
    });

  } catch (error) {
    console.error('Error in POST employee obligation:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Update employee obligation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      obligation_date,
      obligation_type,
      amount,
      description,
      reference_number,
      notes,
      updated_by
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Obligation ID is required' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by
    };

    if (obligation_date !== undefined) updateData.obligation_date = obligation_date;
    if (obligation_type !== undefined) updateData.obligation_type = obligation_type;
    if (amount !== undefined) updateData.amount = amount;
    if (description !== undefined) updateData.description = description;
    if (reference_number !== undefined) updateData.reference_number = reference_number;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabaseAdmin
      .from('employee_obligations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating employee obligation:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Obligation updated successfully'
    });

  } catch (error) {
    console.error('Error in PUT employee obligation:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete employee obligation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Obligation ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('employee_obligations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting employee obligation:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Obligation deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE employee obligation:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
