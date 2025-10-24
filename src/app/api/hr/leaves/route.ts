import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET: Fetch leave requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        employee:employees(id, name, employee_id, department, position),
        leave_type:leave_types(id, name, description),
        approver:users!leave_requests_approved_by_fkey(id, name, email)
      `)
      .order('created_at', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leave requests' },
      { status: 500 }
    );
  }
}

// POST: Create leave request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      reason,
    } = body;

    if (!employee_id || !leave_type_id || !start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate total days
    const start = new Date(start_date);
    const end = new Date(end_date);
    const total_days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        total_days,
        reason,
        status: 'pending',
      })
      .select(`
        *,
        employee:employees(id, name, employee_id, department),
        leave_type:leave_types(id, name, description)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating leave request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create leave request' },
      { status: 500 }
    );
  }
}

// PUT: Update leave request (approve/reject/cancel)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      status,
      approved_by,
      rejection_reason,
    } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Leave request ID and status are required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'approved' && approved_by) {
      updateData.approved_by = approved_by;
      updateData.approved_date = new Date().toISOString();
    }

    if (status === 'rejected' && rejection_reason) {
      updateData.rejection_reason = rejection_reason;
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employee:employees(id, name, employee_id, department),
        leave_type:leave_types(id, name, description)
      `)
      .single();

    if (error) throw error;

    // Update leave balance if approved
    if (status === 'approved' && data) {
      const { data: leaveRequest } = await supabase
        .from('leave_requests')
        .select('employee_id, leave_type_id, total_days')
        .eq('id', id)
        .single();

      if (leaveRequest) {
        const currentYear = new Date().getFullYear();
        
        // Update or create leave balance
        await supabase.rpc('update_leave_balance', {
          p_employee_id: leaveRequest.employee_id,
          p_leave_type_id: leaveRequest.leave_type_id,
          p_year: currentYear,
          p_used_days: leaveRequest.total_days,
        });
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating leave request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update leave request' },
      { status: 500 }
    );
  }
}

// DELETE: Delete leave request
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Leave request ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting leave request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete leave request' },
      { status: 500 }
    );
  }
}
