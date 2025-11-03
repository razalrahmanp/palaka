// GET all interactions (optionally filtered by customer_id), POST new interaction
import { supabase } from '@/lib/supabasePool'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customer_id')

  let query = supabase
    .from('customer_interactions')
    .select(`
      *,
      customer:customers(id, name, email, phone, address)
    `)
    .order('interaction_date', { ascending: false })

  if (customerId) {
    query = query.eq('customer_id', customerId)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const {
    customer_id,
    type,
    notes,
    interaction_date,
    created_by
  } = await req.json()

  const { data, error } = await supabase
    .from('customer_interactions')
    .insert([
      {
        customer_id,
        type,
        notes,
        interaction_date,
        created_by
      }
    ])

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
export async function PUT(req: Request) {
  const { id, ...data } = await req.json()

  const { error } = await supabase
    .from('customer_interactions')
    .update(data)
    .eq('id', id)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ message: 'Interaction updated successfully' })
}