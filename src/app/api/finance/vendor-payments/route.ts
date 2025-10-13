import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplier_id');
    const vendorBillId = searchParams.get('vendor_bill_id');
    const amount = searchParams.get('amount');
    const paymentDate = searchParams.get('payment_date');

    // Require either supplier_id or vendor_bill_id
    if (!supplierId && !vendorBillId) {
      return NextResponse.json(
        { success: false, error: 'Either supplier_id or vendor_bill_id is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabaseAdmin
      .from('vendor_payment_history')
      .select(`
        id,
        supplier_id,
        vendor_bill_id,
        purchase_order_id,
        amount,
        payment_date,
        payment_method,
        reference_number,
        notes,
        bank_account_id,
        status,
        created_at,
        created_by
      `);

    // Filter by supplier_id or vendor_bill_id
    if (vendorBillId) {
      query = query.eq('vendor_bill_id', vendorBillId);
    } else if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    // Additional filters for finding specific payment
    if (amount) {
      query = query.eq('amount', parseFloat(amount));
    }
    if (paymentDate) {
      query = query.eq('payment_date', paymentDate);
    }

    // Order by payment date
    query = query.order('payment_date', { ascending: false });

    const { data: payments, error } = await query;

    if (error) {
      console.error('Error fetching vendor payments:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: payments || [],
      count: payments?.length || 0
    });

  } catch (error) {
    console.error('Error in vendor payments API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
