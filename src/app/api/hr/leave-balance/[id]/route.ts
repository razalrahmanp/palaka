import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: leave_balance, error } = await supabaseAdmin
      .from('employee_leave_balances')
      .select(`
        *,
        employee:employees(
          id,
          name,
          employee_id,
          department,
          position,
          user:users!employees_user_id_fkey(
            id,
            name,
            email
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching leave balance:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Leave balance not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch leave balance' },
        { status: 500 }
      );
    }

    return NextResponse.json(leave_balance);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      total_days,
      used_days,
      year
    } = body;

    // Validate numeric values if provided
    if (total_days !== undefined && total_days < 0) {
      return NextResponse.json(
        { error: 'Total days cannot be negative' },
        { status: 400 }
      );
    }

    if (used_days !== undefined && used_days < 0) {
      return NextResponse.json(
        { error: 'Used days cannot be negative' },
        { status: 400 }
      );
    }

    // Check if leave balance exists
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('employee_leave_balances')
      .select('id, total_days, used_days, employee_id, leave_type, year')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: 'Leave balance not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    const newTotalDays = total_days !== undefined ? Number(total_days) : existing.total_days;
    const newUsedDays = used_days !== undefined ? Number(used_days) : existing.used_days;

    // Validate that used days don't exceed total days
    if (newUsedDays > newTotalDays) {
      return NextResponse.json(
        { error: 'Used days cannot exceed total days' },
        { status: 400 }
      );
    }

    if (total_days !== undefined) updateData.total_days = newTotalDays;
    if (used_days !== undefined) updateData.used_days = newUsedDays;
    if (year !== undefined) updateData.year = Number(year);

    // Calculate remaining days
    updateData.remaining_days = newTotalDays - newUsedDays;

    // Check for duplicate if year is being changed
    if (year !== undefined && year !== existing.year) {
      const { data: duplicate, error: duplicateError } = await supabaseAdmin
        .from('employee_leave_balances')
        .select('id')
        .eq('employee_id', existing.employee_id)
        .eq('leave_type', existing.leave_type)
        .eq('year', year)
        .neq('id', id)
        .single();

      if (duplicateError && duplicateError.code !== 'PGRST116') {
        console.error('Error checking duplicate balance:', duplicateError);
        return NextResponse.json(
          { error: 'Failed to validate leave balance' },
          { status: 500 }
        );
      }

      if (duplicate) {
        return NextResponse.json(
          { error: 'Leave balance already exists for this employee, leave type, and year' },
          { status: 409 }
        );
      }
    }

    const { data: updated_balance, error: updateError } = await supabaseAdmin
      .from('employee_leave_balances')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employee:employees(
          id,
          name,
          employee_id,
          department,
          position
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating leave balance:', updateError);
      return NextResponse.json(
        { error: 'Failed to update leave balance' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated_balance);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if leave balance exists
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('employee_leave_balances')
      .select('id')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: 'Leave balance not found' },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from('employee_leave_balances')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting leave balance:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete leave balance' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Leave balance deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
