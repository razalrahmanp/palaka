// app/api/suppliers/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('GET /api/suppliers - Starting request');
    
    // Check if supabase client is properly initialized
    if (!supabase) {
      console.error('Supabase client is not initialized');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('GET /api/suppliers error', error);
      return NextResponse.json({ 
        message: 'Database error',
        details: error.message,
        hint: error.hint || '',
        code: error.code || ''
      }, { status: 500 });
    }
    
    console.log(`GET /api/suppliers - Success: ${data?.length || 0} suppliers found`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/suppliers unexpected error:', error);
    return NextResponse.json({ 
      message: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error),
      hint: 'Check database connection and environment variables',
      code: ''
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { name, contact, email, address } = await req.json()
  const { data, error } = await supabase
    .from('suppliers')
    .insert([{ 
      name, 
      contact, 
      email, 
      address,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) {
    console.error('POST /api/suppliers error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
