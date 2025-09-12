import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

interface ReturnItem {
  product_id?: string | null;
  quantity: number;
  is_custom_product: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      return_items,
      exchange_items = []
    }: {
      return_items: ReturnItem[];
      exchange_items?: ReturnItem[];
    } = body;

    // Process returns - add quantity back to inventory for regular products
    for (const item of return_items) {
      if (!item.is_custom_product && item.product_id) {
        // Call the database function to update inventory
        const { error } = await supabase.rpc('update_inventory_quantity', {
          p_product_id: item.product_id,
          p_quantity_change: item.quantity
        });

        if (error) {
          console.error('Error updating inventory for return:', error);
          throw error;
        }
      }
    }

    // Process exchanges - remove new product quantity from inventory
    for (const item of exchange_items) {
      if (!item.is_custom_product && item.product_id) {
        // Subtract the new product quantity from inventory
        const { error } = await supabase.rpc('update_inventory_quantity', {
          p_product_id: item.product_id,
          p_quantity_change: -item.quantity
        });

        if (error) {
          console.error('Error updating inventory for exchange:', error);
          throw error;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Inventory updated successfully' 
    });

  } catch (error) {
    console.error('Update inventory error:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}