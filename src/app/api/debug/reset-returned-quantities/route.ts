// Reset vendor bill line item returned quantities
// File: src/app/api/debug/reset-returned-quantities/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { vendor_bill_line_item_id } = await request.json();
    
    if (!vendor_bill_line_item_id) {
      return NextResponse.json(
        { error: 'vendor_bill_line_item_id is required' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('vendor_bill_line_items')
      .update({
        total_returned_quantity: 0
      })
      .eq('id', vendor_bill_line_item_id);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      message: 'Returned quantity reset to 0' 
    });

  } catch (error) {
    console.error('Error resetting returned quantity:', error);
    return NextResponse.json(
      { error: 'Failed to reset returned quantity' },
      { status: 500 }
    );
  }
}