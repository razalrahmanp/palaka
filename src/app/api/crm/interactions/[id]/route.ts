// PUT update interaction, DELETE interaction
import { supabase } from '@/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const updates = await req.json()

  const { data, error } = await supabase
    .from('customer_interactions')
    .update({
      type: updates.type,
      notes: updates.notes,
      interaction_date: updates.interaction_date
    })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await supabase
    .from('customer_interactions')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ message: 'Deleted' }, { status: 200 })
}
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabase
    .from('customer_interactions')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}