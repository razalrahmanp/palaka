import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Update quote status (removed updated_at since it doesn't exist in schema)
    const { data, error } = await supabase
      .from('quotes')
      .update({ 
        status
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update quote status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Quote status updated successfully',
      quote: data
    });

  } catch (error) {
    console.error('Update quote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
