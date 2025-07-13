// app/api/products/route.ts

import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  // read from our view
  const { data, error } = await supabase
    .from('inventory_product_view')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('GET /api/products error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// create a new product
export async function POST(req: NextRequest) {
  const { name, sku, description, category, price, image_url } = await req.json()
  const { data, error } = await supabase
    .from('products')
    .insert([{ name, sku, description, category, price, image_url }])
    .select()
    .single()

  if (error) {
    console.error('POST /api/products error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const { id, ...updates } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }
  const { error } = await supabase.from('products').update(updates).eq('id', id)
  if (error) {
    console.error('PUT /api/products error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) {
    console.error('DELETE /api/products error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
