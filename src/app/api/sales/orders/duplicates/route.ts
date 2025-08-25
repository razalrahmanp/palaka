import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

interface SalesOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  custom_product_id: string | null;
  quantity: number;
  unit_price: number;
  name: string | null;
  supplier_name: string | null;
}

interface DuplicateGroup {
  key: string;
  order_id: string;
  product_id: string | null;
  custom_product_id: string | null;
  items: SalesOrderItem[];
  total_quantity: number;
  duplicate_count: number;
}

export async function GET() {
  try {
    // Find duplicate sales order items by order_id + product_id combination
    const { data: duplicatesData, error } = await supabase
      .from('sales_order_items')
      .select(`
        order_id,
        product_id,
        custom_product_id,
        quantity,
        unit_price,
        name,
        supplier_name,
        id
      `)
      .order('order_id, product_id, custom_product_id');

    if (error) {
      console.error('Error fetching sales order items:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by order_id and product identifiers to find duplicates
    const itemGroups = new Map<string, SalesOrderItem[]>();
    const duplicates: DuplicateGroup[] = [];

    (duplicatesData || []).forEach((item: SalesOrderItem) => {
      const key = `${item.order_id}_${item.product_id || 'null'}_${item.custom_product_id || 'null'}`;
      
      if (!itemGroups.has(key)) {
        itemGroups.set(key, []);
      }
      itemGroups.get(key)!.push(item);
    });

    // Find groups with more than one item (duplicates)
    itemGroups.forEach((items, key) => {
      if (items.length > 1) {
        duplicates.push({
          key,
          order_id: items[0].order_id,
          product_id: items[0].product_id,
          custom_product_id: items[0].custom_product_id,
          items: items,
          total_quantity: items.reduce((sum: number, item: SalesOrderItem) => sum + item.quantity, 0),
          duplicate_count: items.length
        });
      }
    });

    return NextResponse.json({
      total_items: duplicatesData?.length || 0,
      duplicate_groups: duplicates.length,
      duplicates: duplicates,
      summary: {
        orders_with_duplicates: new Set(duplicates.map((d: DuplicateGroup) => d.order_id)).size,
        total_duplicate_items: duplicates.reduce((sum: number, d: DuplicateGroup) => sum + d.duplicate_count, 0)
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Clean up duplicates by merging quantities
    const { data: duplicatesData, error: fetchError } = await supabase
      .from('sales_order_items')
      .select(`
        order_id,
        product_id,
        custom_product_id,
        quantity,
        unit_price,
        name,
        supplier_name,
        id
      `)
      .order('order_id, product_id, custom_product_id, id');

    if (fetchError) {
      console.error('Error fetching sales order items:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Group by order_id and product identifiers
    const itemGroups = new Map<string, SalesOrderItem[]>();
    const duplicatesToClean: Array<{
      key: string;
      kept_item_id: string;
      merged_quantity: number;
      average_price: number;
      original_prices: number[];
      deleted_items: number;
    }> = [];

    (duplicatesData || []).forEach((item: SalesOrderItem) => {
      const key = `${item.order_id}_${item.product_id || 'null'}_${item.custom_product_id || 'null'}`;
      
      if (!itemGroups.has(key)) {
        itemGroups.set(key, []);
      }
      itemGroups.get(key)!.push(item);
    });

    // Process duplicate groups
    for (const [key, items] of itemGroups.entries()) {
      if (items.length > 1) {
        console.log(`Processing duplicate group: ${key}, items count: ${items.length}`);
        
        // Keep the first item and merge quantities
        const keepItem = items[0];
        const itemsToDelete = items.slice(1);
        
        const totalQuantity = items.reduce((sum: number, item: SalesOrderItem) => sum + item.quantity, 0);
        
        // Calculate weighted average price based on quantities
        const totalValue = items.reduce((sum: number, item: SalesOrderItem) => sum + (item.quantity * item.unit_price), 0);
        const averagePrice = Math.round(totalValue / totalQuantity * 100) / 100; // Round to 2 decimal places
        
        console.log(`Merging: quantity ${totalQuantity}, average price ${averagePrice}`);
        
        // Update the kept item with merged quantity and average price
        const { error: updateError } = await supabase
          .from('sales_order_items')
          .update({ 
            quantity: totalQuantity,
            unit_price: averagePrice
          })
          .eq('id', keepItem.id);

        if (updateError) {
          console.error(`Error updating item ${keepItem.id}:`, updateError);
          return NextResponse.json({ error: `Failed to update item: ${updateError.message}` }, { status: 500 });
        }

        console.log(`Successfully updated item ${keepItem.id}`);

        // Delete duplicate items
        const idsToDelete = itemsToDelete.map((item: SalesOrderItem) => item.id);
        console.log(`Deleting items: ${idsToDelete.join(', ')}`);
        
        const { error: deleteError } = await supabase
          .from('sales_order_items')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          console.error(`Error deleting duplicate items:`, deleteError);
          return NextResponse.json({ error: `Failed to delete items: ${deleteError.message}` }, { status: 500 });
        }

        console.log(`Successfully deleted ${idsToDelete.length} duplicate items`);

        duplicatesToClean.push({
          key,
          kept_item_id: keepItem.id,
          merged_quantity: totalQuantity,
          average_price: averagePrice,
          original_prices: items.map((item: SalesOrderItem) => item.unit_price),
          deleted_items: idsToDelete.length
        });
      }
    }

    return NextResponse.json({
      success: true,
      cleaned_groups: duplicatesToClean.length,
      duplicates_removed: duplicatesToClean.reduce((sum: number, d) => sum + d.deleted_items, 0),
      details: duplicatesToClean
    });

  } catch (error) {
    console.error('Unexpected error during cleanup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
