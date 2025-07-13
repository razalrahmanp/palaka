// src/app/api/crm/customers/[id]/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

export async function PUT(
  req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  // 🔑 await params
  const { id } = await params

  const updates = await req.json()

  const { data, error } = await supabase
    .from('customers')
    .update({
      name: updates.name,
      email: updates.email,
      phone: updates.phone,
      company: updates.company,
      status: updates.status,
      source: updates.source,
      tags: updates.tags
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  // 🔑 await params here as well
  const { id } = await params

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ message: 'Deleted' }, { status: 200 })
}
