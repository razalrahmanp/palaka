import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: leave_request, error } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        employee:employees(
          id,
          name,
          employee_id,
          department,
          position,
          user:users!employees_user_id_fkey(
            id,
            name,
            email
          )
        ),
        approved_by_user:users!leave_requests_approved_by_fkey(
          id,
          name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching leave request:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Leave request not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch leave request' },
        { status: 500 }
      );
    }

    return NextResponse.json(leave_request);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      leave_type,
      start_date,
      end_date,
      days_requested,
      reason,
      emergency_contact,
      emergency_phone,
      status,
      approved_by,
      approved_at,
      admin_notes
    } = body;

    // Validate dates if provided
    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      
      if (startDate > endDate) {
        return NextResponse.json(
          { error: 'Start date cannot be after end date' },
          { status: 400 }
        );
      }
    }

    // Check if leave request exists
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('leave_requests')
      .select('id, employee_id, status')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // Prevent updating approved/rejected requests unless it's a status change
    if (existing.status !== 'pending' && status !== existing.status) {
      // Allow status changes for admin actions
    } else if (existing.status !== 'pending' && !status) {
      return NextResponse.json(
        { error: 'Cannot modify approved or rejected leave requests' },
        { status: 400 }
      );
    }

    // Check for overlapping requests if dates are being changed
    if (start_date && end_date) {
      const { data: overlapping, error: overlapError } = await supabaseAdmin
        .from('leave_requests')
        .select('id')
        .eq('employee_id', existing.employee_id)
        .neq('id', id)
        .in('status', ['pending', 'approved'])
        .or(`start_date.lte.${end_date},end_date.gte.${start_date}`);

      if (overlapError) {
        console.error('Error checking overlapping requests:', overlapError);
        return NextResponse.json(
          { error: 'Failed to validate leave request' },
          { status: 500 }
        );
      }

      if (overlapping && overlapping.length > 0) {
        return NextResponse.json(
          { error: 'Overlapping leave request already exists' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (leave_type !== undefined) updateData.leave_type = leave_type;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (days_requested !== undefined) updateData.days_requested = Number(days_requested);
    if (reason !== undefined) updateData.reason = reason;
    if (emergency_contact !== undefined) updateData.emergency_contact = emergency_contact;
    if (emergency_phone !== undefined) updateData.emergency_phone = emergency_phone;
    if (status !== undefined) updateData.status = status;
    if (approved_by !== undefined) updateData.approved_by = approved_by;
    if (approved_at !== undefined) updateData.approved_at = approved_at;
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes;

    // If approving or rejecting, set approved_at if not provided
    if (status === 'approved' || status === 'rejected') {
      if (!updateData.approved_at) {
        updateData.approved_at = new Date().toISOString();
      }
    }

    const { data: updated_request, error: updateError } = await supabaseAdmin
      .from('leave_requests')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employee:employees(
          id,
          name,
          employee_id,
          department,
          position
        ),
        approved_by_user:users!leave_requests_approved_by_fkey(
          id,
          name,
          email
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating leave request:', updateError);
      return NextResponse.json(
        { error: 'Failed to update leave request' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated_request);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if leave request exists and is in pending status
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('leave_requests')
      .select('id, status')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of pending requests
    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only delete pending leave requests' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from('leave_requests')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting leave request:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete leave request' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Leave request deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
