import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET: Fetch training programs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('is_active');

    let query = supabase
      .from('training_programs')
      .select('*')
      .order('created_at', { ascending: false });

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching training programs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch training programs' },
      { status: 500 }
    );
  }
}

// POST: Create training program
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      duration_hours,
      trainer_name,
      training_type,
      max_participants,
      cost_per_participant,
    } = body;

    if (!title || !training_type) {
      return NextResponse.json(
        { success: false, error: 'Title and training type are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('training_programs')
      .insert({
        title,
        description,
        duration_hours,
        trainer_name,
        training_type,
        max_participants,
        cost_per_participant: cost_per_participant || 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating training program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create training program' },
      { status: 500 }
    );
  }
}

// PUT: Update training program
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      description,
      duration_hours,
      trainer_name,
      training_type,
      max_participants,
      cost_per_participant,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Training program ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (duration_hours !== undefined) updateData.duration_hours = duration_hours;
    if (trainer_name !== undefined) updateData.trainer_name = trainer_name;
    if (training_type !== undefined) updateData.training_type = training_type;
    if (max_participants !== undefined) updateData.max_participants = max_participants;
    if (cost_per_participant !== undefined) updateData.cost_per_participant = cost_per_participant;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('training_programs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating training program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update training program' },
      { status: 500 }
    );
  }
}

// DELETE: Delete training program
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Training program ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('training_programs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting training program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete training program' },
      { status: 500 }
    );
  }
}
