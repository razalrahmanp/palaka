import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Get employee's shift for a specific date
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('employee_shifts')
      .select(`
        *,
        shift:work_shifts(*)
      `)
      .eq('employee_id', params.id)
      .eq('is_active', true)
      .lte('effective_from', date)
      .or(`effective_to.is.null,effective_to.gte.${date}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is ok
      throw error;
    }

    return NextResponse.json(data || null);
  } catch (error) {
    console.error('Error fetching employee shift:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee shift' },
      { status: 500 }
    );
  }
}
