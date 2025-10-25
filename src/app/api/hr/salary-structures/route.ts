import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const isActive = searchParams.get('is_active');

    let query = supabase
      .from('salary_structures')
      .select(`
        *,
        employee:employees (
          id,
          name,
          employee_id,
          department,
          position
        )
      `)
      .order('created_at', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching salary structures:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch salary structures' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employee_id,
      basic_salary,
      house_rent_allowance = 0,
      transport_allowance = 0,
      medical_allowance = 0,
      other_allowances = {},
      provident_fund_deduction = 0,
      tax_deduction = 0,
      other_deductions = {},
      effective_from,
    } = body;

    if (!employee_id || !basic_salary || !effective_from) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Deactivate previous salary structures for this employee
    await supabase
      .from('salary_structures')
      .update({ 
        is_active: false, 
        effective_to: new Date().toISOString().split('T')[0] 
      })
      .eq('employee_id', employee_id)
      .eq('is_active', true);

    // Create new salary structure
    const { data, error } = await supabase
      .from('salary_structures')
      .insert({
        employee_id,
        basic_salary,
        house_rent_allowance,
        transport_allowance,
        medical_allowance,
        other_allowances,
        provident_fund_deduction,
        tax_deduction,
        other_deductions,
        effective_from,
        is_active: true,
      })
      .select(`
        *,
        employee:employees (
          id,
          name,
          employee_id,
          department,
          position
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Error creating salary structure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create salary structure' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      basic_salary,
      house_rent_allowance,
      transport_allowance,
      medical_allowance,
      other_allowances,
      provident_fund_deduction,
      tax_deduction,
      other_deductions,
      effective_from,
      effective_to,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Salary structure ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (basic_salary !== undefined) updateData.basic_salary = basic_salary;
    if (house_rent_allowance !== undefined) updateData.house_rent_allowance = house_rent_allowance;
    if (transport_allowance !== undefined) updateData.transport_allowance = transport_allowance;
    if (medical_allowance !== undefined) updateData.medical_allowance = medical_allowance;
    if (other_allowances !== undefined) updateData.other_allowances = other_allowances;
    if (provident_fund_deduction !== undefined) updateData.provident_fund_deduction = provident_fund_deduction;
    if (tax_deduction !== undefined) updateData.tax_deduction = tax_deduction;
    if (other_deductions !== undefined) updateData.other_deductions = other_deductions;
    if (effective_from !== undefined) updateData.effective_from = effective_from;
    if (effective_to !== undefined) updateData.effective_to = effective_to;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('salary_structures')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employee:employees (
          id,
          name,
          employee_id,
          department,
          position
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating salary structure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update salary structure' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Salary structure ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('salary_structures')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Salary structure deleted successfully' });
  } catch (error) {
    console.error('Error deleting salary structure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete salary structure' },
      { status: 500 }
    );
  }
}
