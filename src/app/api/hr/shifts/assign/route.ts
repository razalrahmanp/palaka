import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Assign employee to shift
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Deactivate previous shift assignment if exists
    if (body.deactivate_previous) {
      await supabase
        .from('employee_shifts')
        .update({ 
          is_active: false,
          effective_to: body.effective_from || new Date().toISOString().split('T')[0]
        })
        .eq('employee_id', body.employee_id)
        .eq('is_active', true);
    }

    // Create new shift assignment
    const { data, error } = await supabase
      .from('employee_shifts')
      .insert([{
        employee_id: body.employee_id,
        shift_id: body.shift_id,
        effective_from: body.effective_from,
        effective_to: body.effective_to,
        is_active: true
      }])
      .select(`
        *,
        employee:employees(id, name, employee_id, department),
        shift:work_shifts(*)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error assigning shift:', error);
    return NextResponse.json(
      { error: 'Failed to assign shift' },
      { status: 500 }
    );
  }
}

// GET - Get all shift assignments
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employee_id');
    const shiftId = searchParams.get('shift_id');
    const isActive = searchParams.get('is_active');

    let query = supabase
      .from('employee_shifts')
      .select(`
        *,
        employee:employees(id, name, employee_id, department, position),
        shift:work_shifts(*)
      `)
      .order('effective_from', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (shiftId) {
      query = query.eq('shift_id', shiftId);
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching shift assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shift assignments' },
      { status: 500 }
    );
  }
}
