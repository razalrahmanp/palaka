import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching employee data for ID:', id);

    // Fetch employee data from the database
    const { data: employee, error } = await supabase
      .from('employees')
      .select('id, name, email, position, salary, department, employment_status, hire_date, phone')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error fetching employee:', error);
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    console.log('✅ Employee data fetched successfully:', {
      id: employee.id,
      name: employee.name,
      position: employee.position,
      salary: employee.salary
    });

    return NextResponse.json({
      success: true,
      data: employee
    });

  } catch (error) {
    console.error('❌ Unexpected error in employee API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Updating employee data for ID:', id);

    // Update employee data in the database
    const { data: employee, error } = await supabase
      .from('employees')
      .update({
        name: body.name,
        email: body.email,
        position: body.position,
        salary: body.salary,
        department: body.department,
        employment_status: body.employment_status,
        phone: body.phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating employee:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update employee' },
        { status: 500 }
      );
    }

    console.log('✅ Employee updated successfully:', employee.id);

    return NextResponse.json({
      success: true,
      data: employee
    });

  } catch (error) {
    console.error('❌ Unexpected error updating employee:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
