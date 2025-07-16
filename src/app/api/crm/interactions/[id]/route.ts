import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

// Utility to extract `id` from request URL
function extractId(req: NextRequest): string | null {
  const url = new URL(req.url)
  const segments = url.pathname.split('/')
  return segments[segments.length - 1] || null
}

export async function GET(req: NextRequest) {
  const id = extractId(req)
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

  const { data, error } = await supabase
    .from('customer_interactions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const id = extractId(req)
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

  const updates = await req.json()

  const { data, error } = await supabase
    .from('customer_interactions')
    .update({
      type: updates.type,
      notes: updates.notes,
      interaction_date: updates.interaction_date,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const id = extractId(req)
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

  const { error } = await supabase
    .from('customer_interactions')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ message: 'Deleted' }, { status: 200 })
}
