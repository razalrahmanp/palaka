import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test simple query first
    const { data, error } = await supabase
      .from('sales_order_items')
      .select('id, order_id, quantity')
      .limit(1);

    if (error) {
      return NextResponse.json({ 
        error: error.message, 
        code: error.code,
        details: error.details,
        hint: error.hint 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      connection: 'OK',
      sample_data: data,
      admin_client_available: !!supabase
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Connection failed', 
      message: (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Test update operation
    const testId = 'cd5edd55-27d6-4699-8786-bfe08dd972dd';
    
    // First, get the current item
    const { data: currentItem, error: fetchError } = await supabase
      .from('sales_order_items')
      .select('*')
      .eq('id', testId)
      .single();

    if (fetchError) {
      return NextResponse.json({ 
        error: 'Failed to fetch item', 
        details: fetchError 
      }, { status: 500 });
    }

    // Try a simple update (just add 0.01 to quantity to test)
    const { error: updateError } = await supabase
      .from('sales_order_items')
      .update({ 
        quantity: currentItem.quantity + 0.01
      })
      .eq('id', testId);

    if (updateError) {
      return NextResponse.json({ 
        error: 'Update failed', 
        details: updateError 
      }, { status: 500 });
    }

    // Revert the change
    const { error: revertError } = await supabase
      .from('sales_order_items')
      .update({ 
        quantity: currentItem.quantity
      })
      .eq('id', testId);

    return NextResponse.json({
      success: true,
      test: 'update_operations',
      original_item: currentItem,
      update_successful: !updateError,
      revert_successful: !revertError
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed', 
      message: (error as Error).message 
    }, { status: 500 });
  }
}
