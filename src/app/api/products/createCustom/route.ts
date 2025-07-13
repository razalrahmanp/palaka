import { supabase } from '@/lib/supabaseAdmin';
import { generateSku } from '@/lib/skuGenerator';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { name, configuration } = await req.json();

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const sku = await generateSku(name);

  const { data, error } = await supabase
    .from('custom_products')
    .insert([
      {
        id: randomUUID(),
        name,
        price: 0,
        description: 'Custom configured product',
        sku,
        config_schema: configuration || {},
      },
    ])
    .select()
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
