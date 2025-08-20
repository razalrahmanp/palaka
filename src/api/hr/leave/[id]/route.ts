import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

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
          email,
          phone
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
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
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
      status,
      approved_by,
      rejection_reason,
      leave_type,
      start_date,
      end_date,
      days_requested,
      reason,
      emergency_contact,
      emergency_phone
    } = body;

    // Get current leave request
    const { data: currentRequest, error: fetchError } = await supabaseAdmin
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, string | number | null> = {};

    // Handle status updates (approval/rejection)
    if (status) {
      if (!['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }

      updateData.status = status;
      updateData.updated_at = new Date().toISOString();

      if (status === 'approved' && approved_by) {
        updateData.approved_by = approved_by;
        updateData.approved_at = new Date().toISOString();
      }

      if (status === 'rejected' && rejection_reason) {
        updateData.rejection_reason = rejection_reason;
        updateData.rejected_at = new Date().toISOString();
      }
    }

    // Handle general updates (only if status is pending)
    if (currentRequest.status === 'pending') {
      if (leave_type) updateData.leave_type = leave_type;
      if (start_date) updateData.start_date = start_date;
      if (end_date) updateData.end_date = end_date;
      if (days_requested) updateData.days_requested = Number(days_requested);
      if (reason) updateData.reason = reason;
      if (emergency_contact) updateData.emergency_contact = emergency_contact;
      if (emergency_phone) updateData.emergency_phone = emergency_phone;

      // Validate dates if they're being updated
      if (start_date && end_date) {
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        
        if (startDate > endDate) {
          return NextResponse.json(
            { error: 'Start date cannot be after end date' },
            { status: 400 }
          );
        }

        if (startDate < new Date() && currentRequest.start_date !== start_date) {
          return NextResponse.json(
            { error: 'Cannot update to past dates' },
            { status: 400 }
          );
        }
      }
    } else if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Cannot modify approved, rejected, or cancelled requests' },
        { status: 400 }
      );
    }

    // Update leave request
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

    // Get current leave request
    const { data: currentRequest, error: fetchError } = await supabaseAdmin
      .from('leave_requests')
      .select('status, start_date')
      .eq('id', id)
      .single();

    if (fetchError || !currentRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // Only allow cancellation if request is pending or if start date is in the future
    const startDate = new Date(currentRequest.start_date);
    const now = new Date();
    
    if (currentRequest.status === 'approved' && startDate <= now) {
      return NextResponse.json(
        { error: 'Cannot cancel approved leave that has already started' },
        { status: 400 }
      );
    }

    if (currentRequest.status === 'rejected') {
      return NextResponse.json(
        { error: 'Cannot cancel rejected requests' },
        { status: 400 }
      );
    }

    // Update status to cancelled instead of deleting
    const { data: cancelled_request, error: updateError } = await supabaseAdmin
      .from('leave_requests')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        employee:employees(
          id,
          name,
          employee_id,
          department,
          position
        )
      `)
      .single();

    if (updateError) {
      console.error('Error cancelling leave request:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel leave request' },
        { status: 500 }
      );
    }

    return NextResponse.json(cancelled_request);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
