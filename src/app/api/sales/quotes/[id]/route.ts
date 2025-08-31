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

    console.log(`Updating quote ${id} with data:`, body);

    // If only status is provided, do a simple status update
    if (Object.keys(body).length === 1 && body.status) {
      const { data, error } = await supabase
        .from('quotes')
        .update({ 
          status: body.status
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

      return NextResponse.json({
        message: 'Quote status updated successfully',
        quote: data
      });
    }

    // Full quote update
    const updateData: Record<string, unknown> = {};
    
    // Only include fields that are provided in the request
    if (body.customer_id !== undefined) updateData.customer_id = body.customer_id;
    if (body.customer !== undefined) updateData.customer = body.customer;
    if (body.items !== undefined) updateData.items = body.items;
    if (body.total_price !== undefined) updateData.total_price = body.total_price;
    if (body.original_price !== undefined) updateData.original_price = body.original_price;
    if (body.final_price !== undefined) updateData.final_price = body.final_price;
    if (body.discount_amount !== undefined) updateData.discount_amount = body.discount_amount;
    if (body.freight_charges !== undefined) updateData.freight_charges = body.freight_charges;
    if (body.tax_percentage !== undefined) updateData.tax_percentage = body.tax_percentage;
    if (body.tax_amount !== undefined) updateData.tax_amount = body.tax_amount;
    if (body.taxable_amount !== undefined) updateData.taxable_amount = body.taxable_amount;
    if (body.grand_total !== undefined) updateData.grand_total = body.grand_total;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.created_by !== undefined) updateData.created_by = body.created_by;
    if (body.emi_enabled !== undefined) updateData.emi_enabled = body.emi_enabled;
    if (body.emi_plan !== undefined) updateData.emi_plan = body.emi_plan;
    if (body.emi_monthly !== undefined) updateData.emi_monthly = body.emi_monthly;
    if (body.bajaj_finance_amount !== undefined) updateData.bajaj_finance_amount = body.bajaj_finance_amount;
    if (body.bajaj_approved_amount !== undefined) updateData.bajaj_approved_amount = body.bajaj_approved_amount;

    // Bajaj Finance charge tracking fields
    if (body.bajaj_processing_fee_rate !== undefined) updateData.bajaj_processing_fee_rate = body.bajaj_processing_fee_rate;
    if (body.bajaj_processing_fee_amount !== undefined) updateData.bajaj_processing_fee_amount = body.bajaj_processing_fee_amount;
    if (body.bajaj_convenience_charges !== undefined) updateData.bajaj_convenience_charges = body.bajaj_convenience_charges;
    if (body.bajaj_total_customer_payment !== undefined) updateData.bajaj_total_customer_payment = body.bajaj_total_customer_payment;
    if (body.bajaj_merchant_receivable !== undefined) updateData.bajaj_merchant_receivable = body.bajaj_merchant_receivable;

    console.log('Update data prepared:', updateData);

    const { data, error } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update quote' },
        { status: 500 }
      );
    }

    console.log(`Quote ${id} updated successfully`);

    return NextResponse.json({
      message: 'Quote updated successfully',
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
