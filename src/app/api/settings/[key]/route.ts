import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const body = await request.json();
    const { value, description } = body;

    if (value === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: value' },
        { status: 400 }
      );
    }

    const updateData: {
      value: string;
      updated_at: string;
      description?: string;
    } = {
      value: JSON.stringify(value),
      updated_at: new Date().toISOString()
    };

    if (description !== undefined) {
      updateData.description = description;
    }

    const { data: setting, error } = await supabase
      .from('system_settings')
      .update(updateData)
      .eq('key', key)
      .select()
      .single();

    if (error || !setting) {
      console.error('Error updating setting:', error);
      return NextResponse.json({ error: 'Setting not found or update failed' }, { status: 404 });
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error('Error in setting update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;

    const { error } = await supabase
      .from('system_settings')
      .delete()
      .eq('key', key);

    if (error) {
      console.error('Error deleting setting:', error);
      return NextResponse.json({ error: 'Failed to delete setting' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('Error in setting delete API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
