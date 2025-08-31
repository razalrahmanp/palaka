import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Missing quote ID' }, { status: 400 });
  }

  try {
    // Fetch quote with customer details
    const { data: quoteData, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        customers:customer_id (
          id,
          name,
          email,
          phone,
          address,
          city,
          state,
          pincode,
          floor,
          notes,
          formatted_address,
          status,
          source
        ),
        users:created_by (
          id,
          name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (quoteError) {
      console.error('Error fetching quote:', quoteError);
      return NextResponse.json({ error: quoteError.message }, { status: 500 });
    }

    // Enhance the quote with complete customer details
    const quoteWithDetails = {
      ...quoteData,
      customer_details: quoteData.customers, // Provide customer details for easy access
      sales_representative: quoteData.users,
      
      // Keep backward compatibility
      customer: quoteData.customers,
      users: quoteData.users,
      
      // Add flags for easy checking
      has_customer_details: !!quoteData.customers,
      is_financed: quoteData.emi_enabled || quoteData.bajaj_finance_amount > 0
    };

    return NextResponse.json(quoteWithDetails);
  } catch (error) {
    console.error('Get quote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    console.log(`Updating quote ${id} status to: ${status.charAt(0).toUpperCase() + status.slice(1)}`);

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Update quote status (removed updated_at since it doesn't exist in schema)
    const { data, error } = await supabase
      .from('quotes')
      .update({ 
        status
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update quote status' },
        { status: 500 }
      );
    }

    console.log(`Quote ${id} status updated successfully to: ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`);

    return NextResponse.json({
      message: 'Quote status updated successfully',
      quote: data
    });

  } catch (error) {
    console.error('Update quote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
