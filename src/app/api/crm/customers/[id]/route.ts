// src/app/api/crm/customers/[id]/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id
  const body = await req.json()

  // Update the customer
  const { data, error } = await supabase
    .from('customers')
    .update({
      name: body.name,
      email: body.email,
      phone: body.phone,
      company: body.company,
      status: body.status,
      source: body.source,
      tags: body.tags,
    })
    .eq('id', id)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id

  const { error } = await supabase.from('customers').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Deleted' }, { status: 200 })
}
