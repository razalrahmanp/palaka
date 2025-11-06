import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Get single shift
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('work_shifts')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching shift:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shift' },
      { status: 500 }
    );
  }
}

// PUT - Update shift
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('work_shifts')
      .update({
        shift_name: body.shift_name,
        start_time: body.start_time,
        end_time: body.end_time,
        break_duration: body.break_duration,
        grace_period_in: body.grace_period_in,
        grace_period_out: body.grace_period_out,
        overtime_threshold: body.overtime_threshold,
        is_active: body.is_active
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating shift:', error);
    return NextResponse.json(
      { error: 'Failed to update shift' },
      { status: 500 }
    );
  }
}

// DELETE - Delete shift
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if any employees are assigned to this shift
    const { data: assignments } = await supabase
      .from('employee_shifts')
      .select('id')
      .eq('shift_id', params.id)
      .eq('is_active', true);

    if (assignments && assignments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete shift with active employee assignments' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('work_shifts')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shift:', error);
    return NextResponse.json(
      { error: 'Failed to delete shift' },
      { status: 500 }
    );
  }
}
