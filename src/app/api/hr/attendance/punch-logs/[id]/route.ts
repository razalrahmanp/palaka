import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { punch_type } = body;

    if (!punch_type || !['IN', 'OUT', 'BREAK'].includes(punch_type)) {
      return NextResponse.json(
        { error: 'Invalid punch type. Must be IN, OUT, or BREAK' },
        { status: 400 }
      );
    }

    // Update the punch log
    const { data: punchLog, error: updateError } = await supabaseAdmin
      .from('attendance_punch_logs')
      .update({ punch_type })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating punch log:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    if (!punchLog) {
      return NextResponse.json(
        { error: 'Punch log not found' },
        { status: 404 }
      );
    }

    // Mark the punch log as unprocessed so it will be reprocessed
    await supabaseAdmin
      .from('attendance_punch_logs')
      .update({ processed: false })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      message: 'Punch log updated successfully',
      data: punchLog,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { error: deleteError } = await supabaseAdmin
      .from('attendance_punch_logs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting punch log:', deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Punch log deleted successfully',
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
