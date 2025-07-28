import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: employees, error } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        user:users!employees_user_id_fkey(
          id,
          email,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching employees:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data to include user information
    const transformedEmployees = employees.map(employee => ({
      ...employee,
      email: employee.user?.email || employee.email,
      name: employee.user?.name || employee.name
    }));

    return NextResponse.json(transformedEmployees);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employee_id,
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

    // Validate required fields
    if (!name || !email || !position || !department || !hire_date) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, position, department, hire_date' },
        { status: 400 }
      );
    }

    // Generate employee_id if not provided
    const generatedEmployeeId = employee_id || `EMP${Date.now()}`;

    // Create employee record
    const { data: employee, error: insertError } = await supabaseAdmin
      .from('employees')
      .insert({
        employee_id: generatedEmployeeId,
        name,
        email,
        phone,
        position,
        department,
        hire_date,
        employment_type: employment_type || 'full_time',
        employment_status: employment_status || 'active',
        salary,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        date_of_birth,
        gender,
        nationality,
        marital_status,
        manager_id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating employee:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
