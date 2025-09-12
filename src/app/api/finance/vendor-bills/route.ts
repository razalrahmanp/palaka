import { NextResponse, NextRequest } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      supplier_id,
      total_amount,
      description,
      reference_number,
      due_date,
      status = 'pending',
      bill_date
    } = data;

    // Validate required fields
    if (!supplier_id || !total_amount) {
      return NextResponse.json(
        { success: false, error: 'Supplier ID and amount are required' },
        { status: 400 }
      );
    }

    // Get a system user for created_by
    const { data: systemUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1)
      .single();

    if (!systemUser) {
      return NextResponse.json(
        { success: false, error: 'No system user found' },
        { status: 500 }
      );
    }

    // Generate unique bill number
    const billNumber = `VB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-6)}`;

    // Create new vendor bill with all required fields
    const { data: newBill, error } = await supabaseAdmin
      .from('vendor_bills')
      .insert({
        supplier_id,
        bill_number: billNumber,
        bill_date: bill_date || new Date().toISOString().split('T')[0],
        due_date: due_date || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        total_amount,
        remaining_amount: total_amount, // Initially, full amount is remaining
        paid_amount: 0,
        description,
        reference_number,
        status,
        created_by: systemUser.id,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        suppliers(
          id,
          name,
          email,
          contact
        )
      `)
      .single();

    if (error) {
      console.error('Error creating vendor bill:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create vendor bill' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newBill,
      message: 'Vendor bill created successfully'
    });

  } catch (error) {
    console.error('Error in vendor bills API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplier_id = searchParams.get('supplier_id');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('vendor_bills')
      .select(`
        *,
        suppliers(
          id,
          name,
          email,
          contact
        )
      `)
      .order('created_at', { ascending: false });

    if (supplier_id) {
      query = query.eq('supplier_id', supplier_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: vendorBills, error } = await query;

    if (error) {
      console.error('Error fetching vendor bills:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch vendor bills' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: vendorBills
    });

  } catch (error) {
    console.error('Error in vendor bills GET API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      id,
      paid_amount,
      status,
      payment_date,
      payment_reference
    } = data;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    // Get the current bill
    const { data: currentBill, error: fetchError } = await supabaseAdmin
      .from('vendor_bills')
      .select('total_amount, paid_amount')
      .eq('id', id)
      .single();

    if (fetchError || !currentBill) {
      return NextResponse.json(
        { success: false, error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Calculate new paid amount and remaining amount
    const newPaidAmount = paid_amount ?? currentBill.paid_amount;
    const remainingAmount = currentBill.total_amount - newPaidAmount;
    const newStatus = status ?? (remainingAmount <= 0 ? 'paid' : 'partial');

    // Update the bill
    const { data: updatedBill, error } = await supabaseAdmin
      .from('vendor_bills')
      .update({
        paid_amount: newPaidAmount,
        remaining_amount: remainingAmount,
        status: newStatus,
        payment_date,
        payment_reference,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        suppliers(
          id,
          name,
          email,
          contact
        )
      `)
      .single();

    if (error) {
      console.error('Error updating vendor bill:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update vendor bill' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedBill,
      message: 'Vendor bill updated successfully'
    });

  } catch (error) {
    console.error('Error in vendor bills PUT API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
