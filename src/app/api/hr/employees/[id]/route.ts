import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        user:users!employees_user_id_fkey(
          id,
          email,
          name
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching employee:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Transform the data
    const transformedEmployee = {
      ...employee,
      email: employee.user?.email || employee.email,
      name: employee.user?.name || employee.name
    };

    return NextResponse.json(transformedEmployee);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      email,
      phone,
      position,
      department,
      hire_date,
      employment_type,
      employment_status,
      salary,
      address,
      emergency_contact_name,
      emergency_contact_phone,
      date_of_birth,
      gender,
      nationality,
      marital_status,
      manager_id
    } = body;

    const { data: employee, error: updateError } = await supabaseAdmin
      .from('employees')
      .update({
        name,
        email,
        phone,
        position,
        department,
        hire_date,
        employment_type,
        employment_status,
        salary,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        date_of_birth,
        gender,
        nationality,
        marital_status,
        manager_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating employee:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Soft delete by updating employment_status to 'terminated'
    const { error: deleteError } = await supabaseAdmin
      .from('employees')
      .update({
        employment_status: 'terminated',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting employee:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Employee terminated successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
