// app/api/inventory/products/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

import QRCode from 'qrcode';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// S3 config
const REGION = process.env.AWS_REGION_QR!;
const BUCKET = process.env.AWS_S3_BUCKET_QR!; // Use a dedicated bucket or same bucket
const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});
export async function GET() {
  // you no longer need this; front‑end hits /api/products instead
  return NextResponse.json({ error: 'Use /api/products' }, { status: 400 })
}

// create a new inventory_item
export async function POST(req: NextRequest) {
  const {
    product_id,
    category,
    subcategory,
    material,
    location,
    quantity,
    reorder_point,
    supplier_id
  } = await req.json()

  const { data, error } = await supabase
    .from('inventory_items')
    .insert([{
      product_id, category, subcategory, material,
      location, quantity, reorder_point, supplier_id
    }])
    .select()
    .single()

  if (error) {
    console.error('POST /api/inventory/products error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  if (supplier_id) {
  const { error: updateError } = await supabase
    .from('products')
    .update({ supplier_id })
    .eq('id', product_id);

  if (updateError) {
    console.error('Error updating product supplier_id', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
}
// 1. Generate QR
const qrData = JSON.stringify({
  inventory_id: data.id,
  product_id
})
const qrBuffer = await QRCode.toBuffer(qrData, { type: 'png', width: 300 })

// 2. Upload to S3
const qrKey = `inventory_qr/${data.id}.png`
await s3.send(new PutObjectCommand({
  Bucket: BUCKET,
  Key: qrKey,
  Body: qrBuffer,
  ContentType: 'image/png',
  ACL: 'public-read'
}))
const qrUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${qrKey}`

// 3. Update row
await supabase
  .from('inventory_items')
  .update({ qr_code_url: qrUrl })
  .eq('id', data.id)

return NextResponse.json({ ...data, qr_code_url: qrUrl }, { status: 201 })
}



