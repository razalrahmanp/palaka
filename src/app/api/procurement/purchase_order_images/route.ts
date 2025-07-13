// app/api/procurement/purchase_order_images/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(req: NextRequest) {
  const { purchase_order_id, urls }: { purchase_order_id: string; urls: string[] } = await req.json()

  const records = urls.map(url => ({
    purchase_order_id,
    url
  }))

  const { error } = await supabase
    .from('purchase_order_images')
    .insert(records)

  if (error) {
    console.error('Image metadata insert error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
