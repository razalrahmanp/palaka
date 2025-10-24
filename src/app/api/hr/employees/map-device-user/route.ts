import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { employee_id, device_user_id } = await request.json();

    if (!employee_id) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Update employee with device user ID
    const { data, error } = await supabase
      .from('employees')
      .update({ 
        essl_device_id: device_user_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employee_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating employee:', error);
      return NextResponse.json(
        { error: 'Failed to map employee to device user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: device_user_id 
        ? `Employee mapped to device user ${device_user_id}`
        : 'Employee unmapped from device',
    });
  } catch (error) {
    console.error('Map device user error:', error);
    return NextResponse.json(
      { error: 'Failed to map employee to device user' },
      { status: 500 }
    );
  }
}
