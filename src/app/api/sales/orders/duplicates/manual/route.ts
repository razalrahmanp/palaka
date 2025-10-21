import { supabase } from '@/lib/supabasePool';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Manual cleanup for the specific duplicate we identified
    const keepItemId = 'cd5edd55-27d6-4699-8786-bfe08dd972dd';
    const deleteItemId = 'b29771d7-f0bd-425a-9aa2-76d45af8537f';
    
    // Calculate the new values:
    // Item 1: quantity 1, price 7228
    // Item 2: quantity 5, price 6924.42
    // Merged: quantity 6, weighted average price
    const totalQuantity = 1 + 5;
    const totalValue = (1 * 7228) + (5 * 6924.42);
    const averagePrice = totalValue / totalQuantity;
    
    console.log(`Manual cleanup: merging to quantity ${totalQuantity}, average price ${averagePrice}`);
    
    // Update the kept item
    const { error: updateError } = await supabase
      .from('sales_order_items')
      .update({ 
        quantity: totalQuantity,
        unit_price: Math.round(averagePrice * 100) / 100 // Round to 2 decimals
      })
      .eq('id', keepItemId);

    if (updateError) {
      console.error(`Error updating item ${keepItemId}:`, updateError);
      return NextResponse.json({ error: `Failed to update: ${updateError.message}` }, { status: 500 });
    }

    // Delete the duplicate item
    const { error: deleteError } = await supabase
      .from('sales_order_items')
      .delete()
      .eq('id', deleteItemId);

    if (deleteError) {
      console.error(`Error deleting item ${deleteItemId}:`, deleteError);
      return NextResponse.json({ error: `Failed to delete: ${deleteError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      kept_item_id: keepItemId,
      deleted_item_id: deleteItemId,
      merged_quantity: totalQuantity,
      average_price: Math.round(averagePrice * 100) / 100,
      total_value: totalValue
    });

  } catch (error) {
    console.error('Manual cleanup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
