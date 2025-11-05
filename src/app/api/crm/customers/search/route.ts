import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query) {
      return NextResponse.json({
        customers: [],
        count: 0
      });
    }

    // Search customers by name, phone, or email with address info
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, name, phone, email, address, city, state, pincode, floor, formatted_address, status, source, tags, assigned_sales_rep_id, customer_visit_date, notes')
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Customer search error:', error);
      return NextResponse.json(
        { error: 'Failed to search customers' },
        { status: 500 }
      );
    }

    // For each customer, get their sales orders count and recent items
    const enrichedCustomers = await Promise.all(
      (customers || []).map(async (customer) => {
        // Get sales orders count
        const { count: ordersCount } = await supabase
          .from('sales_orders')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customer.id);

        // Get recent sales order items (last 5 unique products)
        const { data: recentItems } = await supabase
          .from('sales_order_items')
          .select(`
            name,
            quantity,
            sales_orders!inner(customer_id, created_at)
          `)
          .eq('sales_orders.customer_id', customer.id)
          .order('sales_orders.created_at', { ascending: false })
          .limit(5);

        // Format address for display
        let displayAddress = '';
        if (customer.formatted_address) {
          displayAddress = customer.formatted_address;
        } else {
          const addressParts = [
            customer.address,
            customer.city,
            customer.state,
            customer.pincode
          ].filter(Boolean);
          displayAddress = addressParts.join(', ');
        }

        // Add floor info if present
        if (customer.floor && customer.floor !== 'ground') {
          displayAddress = `Floor: ${customer.floor}, ${displayAddress}`;
        }

        return {
          ...customer,
          displayAddress,
          previousOrdersCount: ordersCount || 0,
          recentItems: (recentItems || []).map((item) => ({
            name: item.name,
            quantity: item.quantity
          }))
        };
      })
    );

    return NextResponse.json({
      customers: enrichedCustomers,
      count: enrichedCustomers.length
    });

  } catch (error) {
    console.error('Customer search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
