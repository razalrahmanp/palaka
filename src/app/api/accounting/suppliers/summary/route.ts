import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    // Get all suppliers
    const { data: suppliers, error: suppliersError } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .order('name');

    if (suppliersError) {
      console.error('Suppliers error:', suppliersError);
      return NextResponse.json({
        success: true,
        suppliers: []
      });
    }

    const supplierSummaries = await Promise.all(
      (suppliers || []).map(async (supplier) => {
        // Get inventory items for this supplier to calculate current product info and profit potential
        const { data: inventoryItems } = await supabaseAdmin
          .from('inventory_items')
          .select(`
            id,
            quantity,
            reorder_point,
            updated_at,
            products!inner(
              id,
              name,
              sku,
              description,
              category,
              price,
              cost,
              supplier_id,
              image_url
            )
          `)
          .eq('products.supplier_id', supplier.id);

        // Calculate product totals from current inventory
        const products = (inventoryItems || []).map((item) => {
          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          if (!product) return null;
          
          const quantity = item.quantity || 0;
          const cost_price = product.cost || 0;
          const mrp = product.price || 0;
          
          return {
            id: item.id,
            supplier_id: supplier.id,
            product_name: product.name || 'Unknown Product',
            quantity: quantity,
            cost_price: cost_price,
            mrp: mrp,
            total_cost: quantity * cost_price,
            total_mrp_value: quantity * mrp,
            delivery_date: item.updated_at || new Date().toISOString()
          };
        }).filter(Boolean);

        const total_products = products.length;
        const total_cost = products.reduce((sum, p) => sum + (p?.total_cost || 0), 0);
        const total_mrp = products.reduce((sum, p) => sum + (p?.total_mrp_value || 0), 0);

        // Get vendor bills for outstanding amounts
        const { data: vendorBills } = await supabaseAdmin
          .from('vendor_bills')
          .select('*')
          .eq('supplier_id', supplier.id)
          .in('status', ['pending', 'partial', 'overdue']);

        const total_outstanding = (vendorBills || []).reduce((sum, bill) => 
          sum + (bill.remaining_amount || 0), 0);

        // Get payment history
        const { data: paymentHistory } = await supabaseAdmin
          .from('vendor_payment_history')
          .select('*')
          .eq('supplier_id', supplier.id)
          .eq('status', 'completed')
          .order('payment_date', { ascending: false })
          .limit(5);

        const amount_paid = (paymentHistory || []).reduce((sum, payment) => 
          sum + (payment.amount || 0), 0);

        // Get payment terms for scheduling
        const { data: paymentTerms } = await supabaseAdmin
          .from('vendor_payment_terms')
          .select('*')
          .eq('supplier_id', supplier.id)
          .eq('is_active', true)
          .single();

        // Create a payment schedule based on payment terms
        let payment_schedule = undefined;
        if (total_outstanding > 0 && paymentTerms) {
          const nextPaymentDate = new Date();
          nextPaymentDate.setDate(nextPaymentDate.getDate() + (paymentTerms.payment_terms_days || 30));
          
          payment_schedule = {
            id: `schedule-${supplier.id}`,
            supplier_id: supplier.id,
            scheduled_date: nextPaymentDate.toISOString().split('T')[0],
            amount: total_outstanding,
            payment_method: 'BANK',
            status: 'SCHEDULED'
          };
        }

        const remaining_amount = total_outstanding;

        return {
          supplier,
          products,
          total_products,
          total_cost,
          total_mrp,
          amount_paid,
          remaining_amount,
          payment_schedule,
          recent_payments: paymentHistory || []
        };
      })
    );

    return NextResponse.json({
      success: true,
      suppliers: supplierSummaries
    });

  } catch (error) {
    console.error('Error fetching supplier summary:', error);
    return NextResponse.json({
      success: true,
      suppliers: []
    });
  }
}

// Create or update supplier with payment terms
export async function POST(request: NextRequest) {
  try {
    const { 
      name, 
      email, 
      contact, 
      address, 
      payment_terms_days, 
      credit_limit,
      preferred_payment_method 
    } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Supplier name is required' },
        { status: 400 }
      );
    }

    const supplierData = {
      name,
      email,
      contact,
      address,
      is_deleted: false,
      created_at: new Date().toISOString()
    };

    const { data: supplier, error } = await supabaseAdmin
      .from('suppliers')
      .insert(supplierData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create supplier: ${error.message}`);
    }

    // Create payment terms if provided
    if (payment_terms_days || credit_limit || preferred_payment_method) {
      const paymentTermsData = {
        supplier_id: supplier.id,
        payment_terms_days: payment_terms_days || 30,
        credit_limit: credit_limit || 0,
        is_active: true,
        created_at: new Date().toISOString()
      };

      await supabaseAdmin
        .from('vendor_payment_terms')
        .insert(paymentTermsData);
    }

    return NextResponse.json({
      success: true,
      supplier,
      message: 'Supplier created successfully'
    });

  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create supplier' },
      { status: 500 }
    );
  }
}
