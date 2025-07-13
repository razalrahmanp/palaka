// src/app/api/crm/customers/[id]/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

// The second argument's type is simplified here
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } } 
) {
  // 'params' is a simple object, no 'await' needed
  const { id } = params;

  const updates = await req.json();

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
    .select() // Return the updated row

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// The second argument's type is also simplified here
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 'params' is a simple object, no 'await' needed
  const { id } = params;

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: 'Deleted' }, { status: 200 });
}