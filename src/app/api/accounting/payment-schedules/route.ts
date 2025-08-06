import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { 
      supplier_id, 
      scheduled_date, 
      amount, 
      payment_methods, 
      frequency, 
      notes 
    } = await request.json();

    if (!supplier_id || !scheduled_date || !amount) {
      return NextResponse.json(
        { error: 'Supplier ID, scheduled date, and amount are required' },
        { status: 400 }
      );
    }

    if (!payment_methods || payment_methods.length === 0) {
      return NextResponse.json(
        { error: 'At least one payment method is required' },
        { status: 400 }
      );
    }

    // Create payment schedule with enhanced features
    const scheduleData = {
      supplier_id,
      scheduled_date,
      amount,
      payment_methods: JSON.stringify(payment_methods), // Store as JSON array
      frequency: frequency || 'once',
      status: 'SCHEDULED',
      notes,
      created_at: new Date().toISOString()
    };

    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from('vendor_payment_schedules')
      .insert(scheduleData)
      .select()
      .single();

    if (scheduleError) {
      throw new Error(`Failed to create payment schedule: ${scheduleError.message}`);
    }

    return NextResponse.json({
      success: true,
      schedule,
      message: 'Payment scheduled successfully'
    });

  } catch (error) {
    console.error('Payment schedule error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to schedule payment' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplier_id = searchParams.get('supplier_id');
    const status = searchParams.get('status') || 'SCHEDULED';

    let query = supabaseAdmin
      .from('vendor_payment_schedules')
      .select(`
        *,
        supplier:suppliers(name)
      `)
      .eq('status', status)
      .order('scheduled_date', { ascending: true });

    if (supplier_id) {
      query = query.eq('supplier_id', supplier_id);
    }

    const { data: schedules, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ schedules });

  } catch (error) {
    console.error('Get payment schedules error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment schedules' },
      { status: 500 }
    );
  }
}

// Update payment schedule status
export async function PUT(request: NextRequest) {
  try {
    const { id, status, notes } = await request.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Schedule ID and status are required' },
        { status: 400 }
      );
    }

    const updateData = {
      status,
      notes,
      updated_at: new Date().toISOString()
    };

    const { data: schedule, error } = await supabaseAdmin
      .from('vendor_payment_schedules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      schedule,
      message: 'Payment schedule updated successfully'
    });

  } catch (error) {
    console.error('Update payment schedule error:', error);
    return NextResponse.json(
      { error: 'Failed to update payment schedule' },
      { status: 500 }
    );
  }
}
