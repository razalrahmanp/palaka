//src/app/api/sku/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateSku } from '@/lib/skuGenerator';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { productName, supplierName } = body;
  if (!productName) {
    return NextResponse.json({ error: 'productName is required' }, { status: 400 });
  }

  try {
    const sku = await generateSku(productName, supplierName);
    return NextResponse.json({ sku });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
