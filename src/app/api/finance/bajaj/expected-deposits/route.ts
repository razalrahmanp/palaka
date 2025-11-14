import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Create expected deposit record for Bajaj Finance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sales_order_id,
      finance_company = 'bajaj',
      expected_deposit,
      bank_account_id,
      reference,
      notes
    } = body;

    // Validate required fields
    if (!sales_order_id || !expected_deposit || !bank_account_id) {
      return NextResponse.json(
        { error: 'Missing required fields: sales_order_id, expected_deposit, bank_account_id' },
        { status: 400 }
      );
    }

    // Check if expected deposit already exists for this order
    const { data: existingDeposit } = await supabase
      .from('bajaj_expected_deposits')
      .select('id, expected_deposit, status')
      .eq('sales_order_id', sales_order_id)
      .maybeSingle();

    if (existingDeposit) {
      console.log(`⚠️ Expected deposit already exists for order ${sales_order_id}`);
      return NextResponse.json({
        success: true,
        data: existingDeposit,
        message: 'Expected deposit already exists for this order',
        duplicate: true
      }, { status: 200 });
    }

    // Get customer_id and order details from sales_order
    const { data: order, error: orderError } = await supabase
      .from('sales_orders')
      .select('customer_id, id, final_price')
      .eq('id', sales_order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Sales order not found' },
        { status: 404 }
      );
    }

    // Calculate expected date (7 days from now by default)
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + 7);

    // Create expected deposit record
    const { data: expectedDeposit, error: insertError } = await supabase
      .from('bajaj_expected_deposits')
      .insert({
        sales_order_id,
        customer_id: order.customer_id,
        finance_company,
        order_total: order.final_price || expected_deposit,
        finance_amount: expected_deposit,
        expected_deposit,
        expected_date: expectedDate.toISOString().split('T')[0],
        status: 'pending',
        notes: notes || `Expected Bajaj deposit for Order ID: ${sales_order_id}`
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating expected deposit:', insertError);
      return NextResponse.json(
        { error: 'Failed to create expected deposit record: ' + insertError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Created expected deposit: Order ${sales_order_id}, Expected: ₹${expected_deposit}`);

    return NextResponse.json({
      success: true,
      data: expectedDeposit,
      message: 'Expected deposit record created successfully'
    });

  } catch (error) {
    console.error('Error in POST /api/finance/bajaj/expected-deposits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get expected deposits (optionally filter by status)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const sales_order_id = searchParams.get('sales_order_id');

    let query = supabase
      .from('bajaj_expected_deposits')
      .select(`
        *,
        sales_orders!inner (
          id,
          final_price,
          customer_id,
          customers!inner (
            id,
            name,
            phone
          )
        ),
        bank_transactions (
          id,
          date,
          amount,
          reference
        )
      `)
      .order('expected_date', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (sales_order_id) {
      query = query.eq('sales_order_id', sales_order_id);
    }

    const { data: deposits, error } = await query;

    if (error) {
      console.error('Error fetching expected deposits:', error);
      return NextResponse.json(
        { error: 'Failed to fetch expected deposits' },
        { status: 500 }
      );
    }

    // Transform data to flatten customer info
    const transformedDeposits = deposits?.map(deposit => ({
      ...deposit,
      order_number: deposit.sales_orders?.id?.slice(-8) || 'N/A', // Use last 8 chars of ID as order number
      customer_name: deposit.sales_orders?.customers?.name,
      customer_phone: deposit.sales_orders?.customers?.phone,
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedDeposits,
      count: transformedDeposits.length
    });

  } catch (error) {
    console.error('Error in GET /api/finance/bajaj/expected-deposits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
