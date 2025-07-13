// GET all customers, POST create customer
import { supabase } from '@/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const {
    name,
    email,
    phone,
    status,
    source,
    tags,
    created_by
  } = await req.json()

  const { data, error } = await supabase
    .from('customers')
    .insert([
      {
        name,
        email,
        phone,
        status,
        source,
        tags,
        created_by
      }
    ])

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
export async function PUT(req: Request) {
  const { id, ...data } = await req.json()

  const { error } = await supabase
    .from('customers')
    .update(data)
    .eq('id', id)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ message: 'Customer updated successfully' })
}