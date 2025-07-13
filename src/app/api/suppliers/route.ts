// app/api/suppliers/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('GET /api/suppliers error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { name, contact } = await req.json()
  const { data, error } = await supabase
    .from('suppliers')
    .insert([{ name, contact }])
    .select()
    .single()

  if (error) {
    console.error('POST /api/suppliers error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
