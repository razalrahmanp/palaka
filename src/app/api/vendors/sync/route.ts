// app/api/vendors/sync/route.ts
import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Get all suppliers
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('id, name, contact')
      .order('name');

    if (suppliersError) {
      console.error('Error fetching suppliers:', suppliersError);
      return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
    }

    // Get all products that don't have a supplier_id set
    const { data: unassignedProducts, error: productsError } = await supabase
      .from('products')
      .select('id, name, sku, category, supplier_id')
      .is('supplier_id', null);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    // Auto-assign products to suppliers based on simple heuristics
    const updates: Array<{ id: string; supplier_id: string }> = [];

    for (const product of unassignedProducts) {
      // Try to match product name or category with supplier name
      const productName = product.name.toLowerCase();
      const productCategory = product.category?.toLowerCase() || '';
      
      let matchedSupplier = null;

      // Simple matching logic - you can enhance this
      for (const supplier of suppliers) {
        const supplierNameLower = supplier.name.toLowerCase();
        
        // Check if supplier name appears in product name or vice versa
        if (productName.includes(supplierNameLower) || 
            supplierNameLower.includes(productName.split(' ')[0]) ||
            productCategory.includes(supplierNameLower)) {
          matchedSupplier = supplier;
          break;
        }
      }

      // If no match found, assign to first supplier (or implement better logic)
      if (!matchedSupplier && suppliers.length > 0) {
        // Round-robin assignment or assign to a default supplier
        const index: number = updates.length % suppliers.length;
        matchedSupplier = suppliers[index];
      }

      if (matchedSupplier) {
        updates.push({
          id: product.id,
          supplier_id: matchedSupplier.id
        });
      }
    }

    // Perform batch update
    if (updates.length > 0) {
      const { error: updateError } = await supabase
        .from('products')
        .upsert(updates, { onConflict: 'id' });

      if (updateError) {
        console.error('Error updating products:', updateError);
        return NextResponse.json({ error: 'Failed to update products' }, { status: 500 });
      }
    }

    // Get updated statistics
    const { data: totalProducts } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true });

    const { data: assignedProducts } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .not('supplier_id', 'is', null);

    return NextResponse.json({
      message: 'Sync completed successfully',
      total_products: totalProducts?.length || 0,
      assigned_products: assignedProducts?.length || 0,
      newly_assigned: updates.length,
      suppliers_count: suppliers.length
    });

  } catch (error) {
    console.error('POST /api/vendors/sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to check sync status
export async function GET() {
  try {
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id', { count: 'exact', head: true });

    const { data: totalProducts } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true });

    const { data: assignedProducts } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .not('supplier_id', 'is', null);

    const { data: unassignedProducts } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .is('supplier_id', null);

    return NextResponse.json({
      suppliers_count: suppliers?.length || 0,
      total_products: totalProducts?.length || 0,
      assigned_products: assignedProducts?.length || 0,
      unassigned_products: unassignedProducts?.length || 0,
      sync_percentage: (totalProducts?.length || 0) > 0 
        ? Math.round(((assignedProducts?.length || 0) / (totalProducts?.length || 1)) * 100)
        : 0
    });

  } catch (error) {
    console.error('GET /api/vendors/sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
