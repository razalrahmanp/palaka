import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET: Fetch employee trainings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const trainingProgramId = searchParams.get('training_program_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('employee_trainings')
      .select(`
        *,
        employee:employees(id, name, employee_id, department, position),
        training_program:training_programs(id, title, description, duration_hours, training_type)
      `)
      .order('created_at', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (trainingProgramId) {
      query = query.eq('training_program_id', trainingProgramId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching employee trainings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employee trainings' },
      { status: 500 }
    );
  }
}

// POST: Enroll employee in training
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      training_program_id,
      enrollment_date,
      start_date,
    } = body;

    if (!employee_id || !training_program_id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID and training program ID are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('employee_trainings')
      .insert({
        employee_id,
        training_program_id,
        enrollment_date: enrollment_date || new Date().toISOString().split('T')[0],
        start_date,
        status: 'enrolled',
      })
      .select(`
        *,
        employee:employees(id, name, employee_id, department),
        training_program:training_programs(id, title, description, duration_hours)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error enrolling employee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to enroll employee in training' },
      { status: 500 }
    );
  }
}

// PUT: Update employee training
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      status,
      start_date,
      completion_date,
      score,
      feedback,
      certificate_url,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Employee training ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (completion_date !== undefined) updateData.completion_date = completion_date;
    if (score !== undefined) updateData.score = score;
    if (feedback !== undefined) updateData.feedback = feedback;
    if (certificate_url !== undefined) updateData.certificate_url = certificate_url;

    const { data, error } = await supabase
      .from('employee_trainings')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employee:employees(id, name, employee_id, department),
        training_program:training_programs(id, title, description)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating employee training:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update employee training' },
      { status: 500 }
    );
  }
}

// DELETE: Delete employee training enrollment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Employee training ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('employee_trainings')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee training:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete employee training' },
      { status: 500 }
    );
  }
}
