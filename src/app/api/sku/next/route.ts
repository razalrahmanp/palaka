// src/app/api/sku/next/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const material = searchParams.get('material') || 'STD';
    
    if (!category || !subcategory) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Create prefix for SKU search
    const prefix = `${category}-${subcategory}-${material}-`;
    
    // Find highest existing ID
    const { data, error } = await supabase
      .from('products')
      .select('sku')
      .like('sku', `${prefix}%`);
    
    if (error) {
      console.error('Error querying SKUs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Extract the numeric part and find max
    const usedIds = (data || [])
      .map(d => d.sku)
      .map(sku => {
        const parts = sku.split('-');
        if (parts.length >= 4) {
          return parseInt(parts[3], 10);
        }
        return 0;
      })
      .filter(n => !isNaN(n));
    
    // Find next available ID
    const maxId = usedIds.length > 0 ? Math.max(...usedIds) : 0;
    const nextId = maxId + 1;
    
    return NextResponse.json({ nextId });
    
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
