// src/app/api/crm/customers/[id]/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

// The second argument is now a 'context' object
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } } 
) {
  // We get the 'id' from the context object inside the function
  const id = context.params.id;

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

// The second argument is also changed to a 'context' object here
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  // We get the 'id' from the context object inside the function
  const id = context.params.id;

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: 'Deleted' }, { status: 200 });
}