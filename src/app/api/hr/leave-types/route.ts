import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET: Fetch leave types
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching leave types:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leave types' },
      { status: 500 }
    );
  }
}

// POST: Create leave type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      max_days_per_year,
      carry_forward_allowed,
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Leave type name is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('leave_types')
      .insert({
        name,
        description,
        max_days_per_year,
        carry_forward_allowed: carry_forward_allowed || false,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating leave type:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create leave type' },
      { status: 500 }
    );
  }
}

// PUT: Update leave type
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      description,
      max_days_per_year,
      carry_forward_allowed,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Leave type ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (max_days_per_year !== undefined) updateData.max_days_per_year = max_days_per_year;
    if (carry_forward_allowed !== undefined) updateData.carry_forward_allowed = carry_forward_allowed;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('leave_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating leave type:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update leave type' },
      { status: 500 }
    );
  }
}
