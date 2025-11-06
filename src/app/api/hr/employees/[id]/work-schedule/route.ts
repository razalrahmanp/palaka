import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET employee work schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        id,
        name,
        employee_id,
        work_start_time,
        work_end_time,
        work_hours_per_day,
        working_days_per_week,
        weekly_off_days,
        break_duration_minutes,
        grace_period_minutes,
        overtime_eligible,
        overtime_rate_multiplier
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error fetching work schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch work schedule' },
      { status: 500 }
    );
  }
}

// PUT update employee work schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const updateData: Record<string, unknown> = {};
    
    if (body.work_start_time !== undefined) updateData.work_start_time = body.work_start_time;
    if (body.work_end_time !== undefined) updateData.work_end_time = body.work_end_time;
    if (body.work_hours_per_day !== undefined) updateData.work_hours_per_day = body.work_hours_per_day;
    if (body.working_days_per_week !== undefined) updateData.working_days_per_week = body.working_days_per_week;
    if (body.weekly_off_days !== undefined) updateData.weekly_off_days = body.weekly_off_days;
    if (body.break_duration_minutes !== undefined) updateData.break_duration_minutes = body.break_duration_minutes;
    if (body.grace_period_minutes !== undefined) updateData.grace_period_minutes = body.grace_period_minutes;
    if (body.overtime_eligible !== undefined) updateData.overtime_eligible = body.overtime_eligible;
    if (body.overtime_rate_multiplier !== undefined) updateData.overtime_rate_multiplier = body.overtime_rate_multiplier;

    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Work schedule updated successfully',
      data
    });
  } catch (error) {
    console.error('Error updating work schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update work schedule' },
      { status: 500 }
    );
  }
}
