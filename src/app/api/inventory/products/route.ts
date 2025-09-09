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
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get('page');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const supplier = searchParams.get('supplier') || '';
    
    // If page parameter is provided, use pagination format
    const usePagination = pageParam !== null;
    const page = parseInt(pageParam || '1');
    const offset = (page - 1) * limit;

    // Build the query to join inventory_items with products
    let query = supabase
      .from('inventory_items')
      .select(`
        *,
        products!inner (
          id,
          name,
          sku,
          price,
          cost,
          category,
          description,
          supplier_id,
          image_url,
          created_at
        )
      `, { count: usePagination ? 'exact' : undefined });

    // Apply filters
    if (search) {
      query = query.or(`products.name.ilike.%${search}%,products.sku.ilike.%${search}%,products.description.ilike.%${search}%`);
    }
    
    if (category) {
      query = query.eq('products.category', category);
    }
    
    if (supplier) {
      query = query.eq('products.supplier_id', supplier);
    }

    // Apply pagination and ordering
    if (usePagination) {
      // First get the count with exact counting enabled
      let countQuery = supabase
        .from('inventory_items')
        .select(`
          id,
          products!inner(
            id,
            name,
            sku,
            description,
            category,
            price,
            cost,
            supplier_id,
            created_at,
            image_url
          )
        `, { count: 'exact', head: true });

      // Apply the same filters for count
      if (search) {
        countQuery = countQuery.or(`products.name.ilike.%${search}%,products.sku.ilike.%${search}%,products.description.ilike.%${search}%`);
      }
      
      if (category) {
        countQuery = countQuery.eq('products.category', category);
      }
      
      if (supplier) {
        countQuery = countQuery.eq('products.supplier_id', supplier);
      }

      const { count: totalCount, error: countError } = await countQuery;
      
      if (countError) {
        console.error('Error getting count:', countError);
        return NextResponse.json({ error: countError.message }, { status: 500 });
      }

      // Now get the actual data
      const { data: inventoryItems, error } = await query
        .range(offset, offset + limit - 1)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching inventory data:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const total = totalCount || 0;

      // Transform to ProductWithInventory format
      const transformedItems = inventoryItems?.map(item => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products;
        
        return {
          inventory_id: item.id,
          product_id: product?.id || '',
          category: item.category,
          subcategory: item.subcategory,
          material: item.material,
          location: item.location,
          quantity: item.quantity,
          reorder_point: item.reorder_point,
          updated_at: item.updated_at,
          product_created_at: product?.created_at,
          supplier_name: `Supplier ${product?.supplier_id || 'Unknown'}`, // We'll improve this later
          supplier_id: product?.supplier_id,
          price: product?.price,
          product_name: product?.name || '',
          product_description: product?.description,
          product_category: product?.category,
          product_image_url: product?.image_url,
          sku: product?.sku,
          applied_margin: 0, // Default value
          cost: product?.cost || 0
        };
      }) || [];

      const totalPages = Math.ceil(total / limit);

      return NextResponse.json({
        products: transformedItems,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } else {
      // For backward compatibility, return simple array when no pagination
      // Remove explicit range limit to get all records
      // Note: Supabase has a default limit of 1000 rows, so we need to use a larger limit
      const { data: inventoryItems, error } = await query
        .limit(100000) // Set a high limit to effectively get all records
        .order('id', { ascending: false }); // Order by ID to get latest entries first

      if (error) {
        console.error('Error fetching inventory data:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log(`Non-paginated request: Fetched ${inventoryItems?.length || 0} inventory items`);

      // Transform to ProductWithInventory format
      const transformedItems = inventoryItems?.map(item => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products;
        
        return {
          inventory_id: item.id,
          product_id: product?.id || '',
          category: item.category,
          subcategory: item.subcategory,
          material: item.material,
          location: item.location,
          quantity: item.quantity,
          reorder_point: item.reorder_point,
          updated_at: item.updated_at,
          product_created_at: product?.created_at,
          supplier_name: `Supplier ${product?.supplier_id || 'Unknown'}`, // We'll improve this later
          supplier_id: product?.supplier_id,
          price: product?.price,
          product_name: product?.name || '',
          product_description: product?.description,
          product_category: product?.category,
          product_image_url: product?.image_url,
          sku: product?.sku,
          applied_margin: 0, // Default value
          cost: product?.cost || 0
        };
      }) || [];

      console.log(`Non-paginated request: Returning ${transformedItems.length} transformed products`);
      return NextResponse.json(transformedItems);
    }
  } catch (error) {
    console.error('GET /api/inventory/products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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



