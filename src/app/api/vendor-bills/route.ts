import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Disable Next.js caching for real-time data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface VendorBillLineItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  total_returned_quantity?: number;
}

// Database bill shape before transformation
interface VendorBillRaw {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  remaining_amount: number;
  status: string;
  vendor_bill_line_items: VendorBillLineItem[];
  suppliers: {
    id: string;
    name: string;
    email?: string;
  } | null;
}

// Transformed bill shape for API response
interface VendorBillData {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  remaining_amount: number;
  status: string;
  vendor: {
    id?: string;
    name?: string;
    email?: string;
  };
  vendor_bill_line_items: VendorBillLineItem[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const returnable = searchParams.get('returnable');

    let query = supabase
      .from('vendor_bills')
      .select(`
        *,
        vendor_bill_line_items(
          id,
          product_name,
          quantity,
          unit_price,
          total_amount,
          total_returned_quantity
        ),
        suppliers(
          id,
          name,
          email
        )
      `)
      .order('bill_date', { ascending: false });

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Filter for returnable bills (bills with line items that have returnable quantities)
    if (returnable === 'true') {
      // Only include bills that have line items and are not fully paid
      query = query.in('status', ['pending', 'partial']);
    }

    const { data: bills, error } = await query;

    if (error) {
      throw error;
    }

    // Filter bills to only include those with returnable items
    const returnableBills = returnable === 'true' 
      ? bills?.filter(bill => 
          bill.vendor_bill_line_items && 
          bill.vendor_bill_line_items.length > 0 &&
          bill.vendor_bill_line_items.some((item: VendorBillLineItem) => 
            item.quantity > (item.total_returned_quantity || 0)
          )
        ) || []
      : bills || [];

    // Transform the data to match the expected format
    const transformedBills: VendorBillData[] = returnableBills.map((bill: VendorBillRaw): VendorBillData => ({
      id: bill.id,
      bill_number: bill.bill_number,
      bill_date: bill.bill_date,
      due_date: bill.due_date,
      total_amount: bill.total_amount,
      remaining_amount: bill.remaining_amount,
      status: bill.status,
      vendor: {
        id: bill.suppliers?.id,
        name: bill.suppliers?.name,
        email: bill.suppliers?.email
      },
      vendor_bill_line_items: bill.vendor_bill_line_items || []
    }));

    return NextResponse.json({
      bills: transformedBills,
      total: transformedBills.length
    });

  } catch (error) {
    console.error('Error fetching vendor bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor bills' },
      { status: 500 }
    );
  }
}