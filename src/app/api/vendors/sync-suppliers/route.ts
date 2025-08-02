// app/api/vendors/sync-suppliers/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Get all unique supplier names from products that don't have a supplier_id
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('supplier_name')
      .not('supplier_name', 'is', null)
      .is('supplier_id', null);

    if (productsError) throw productsError;

    // Get unique supplier names
    const uniqueSupplierNames = [...new Set(products?.map(p => p.supplier_name).filter(Boolean))];
    
    // Get existing suppliers
    const { data: existingSuppliers } = await supabase
      .from('suppliers')
      .select('id, name');

    const existingSupplierNames = new Set(existingSuppliers?.map(s => s.name) || []);
    
    // Create suppliers for names that don't exist
    const newSuppliers = uniqueSupplierNames.filter(name => !existingSupplierNames.has(name));
    
    let createdCount = 0;
    let updatedCount = 0;

    if (newSuppliers.length > 0) {
      const { data: createdSuppliers, error: createError } = await supabase
        .from('suppliers')
        .insert(newSuppliers.map(name => ({
          name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })))
        .select();

      if (createError) throw createError;
      createdCount = createdSuppliers?.length || 0;
    }

    // Update products to link with supplier IDs
    const allSuppliers = await supabase
      .from('suppliers')
      .select('id, name');

    const supplierMap = new Map(allSuppliers.data?.map(s => [s.name, s.id]) || []);

    // Update products in batches
    for (const supplierName of uniqueSupplierNames) {
      const supplierId = supplierMap.get(supplierName);
      if (supplierId) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ supplier_id: supplierId })
          .eq('supplier_name', supplierName)
          .is('supplier_id', null);

        if (!updateError) {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('supplier_id', supplierId);
          
          updatedCount += count || 0;
        }
      }
    }

    return NextResponse.json({
      message: 'Sync completed successfully',
      created_suppliers: createdCount,
      updated_products: updatedCount,
      supplier_names_found: uniqueSupplierNames.length
    });

  } catch (error) {
    console.error('POST /api/vendors/sync-suppliers error', error);
    return NextResponse.json({ error: 'Failed to sync suppliers' }, { status: 500 });
  }
}
