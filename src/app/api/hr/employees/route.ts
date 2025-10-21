import { NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabasePool';

export async function GET() {
  try {
    console.log('GET /api/hr/employees - Starting request');
    
    // Check if supabase client is properly initialized
    if (!supabaseAdmin) {
      console.error('Supabase admin client is not initialized');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

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
      return NextResponse.json({ 
        message: 'Database error',
        details: error.message,
        hint: error.hint || '',
        code: error.code || ''
      }, { status: 500 });
    }

    // Transform the data to include user information
    const transformedEmployees = employees.map(employee => ({
      ...employee,
      email: employee.user?.email || employee.email,
      name: employee.user?.name || employee.name
    }));

    console.log(`GET /api/hr/employees - Success: ${transformedEmployees?.length || 0} employees found`);
    return NextResponse.json(transformedEmployees);
  } catch (error) {
    console.error('Error fetching employees:', {
      message: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.stack : 'Unknown error',
    });
    return NextResponse.json({ 
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : String(error),
      hint: 'Check database connection and environment variables',
      code: ''
    }, { status: 500 });
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
