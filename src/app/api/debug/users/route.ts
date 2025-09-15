import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, role_id, is_deleted')
      .eq('is_deleted', false)
      .order('email');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: users || [],
      count: users?.length || 0
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch users' 
    }, { status: 500 });
  }
}