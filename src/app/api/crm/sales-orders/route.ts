// src/app/api/crm/sales-orders/route.ts - CRM specific sales orders API
import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

interface SalesOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  final_price: number;
  custom_product_id?: string;
  name?: string;
  product?: {
    id: string;
    name: string;
    sku?: string;
  } | null;
  custom_product?: {
    id: string;
    name: string;
  } | null;
}

export async function GET() {
  try {
    // Fetch sales orders with customer information and items
    const { data: salesOrders, error } = await supabase
      .from('sales_orders')
      .select(`
        id,
        customer_id,
        quote_id,
        status,
        created_at,
        updated_at,
        expected_delivery_date,
        address,
        notes,
        po_created,
        emi_enabled,
        emi_plan,
        emi_monthly,
        delivery_floor,
        first_floor_awareness,
        final_price,
        original_price,
        discount_amount,
        grand_total,
        tax_percentage,
        tax_amount,
        taxable_amount,
        bajaj_finance_amount,
        bajaj_processing_fee_amount,
        bajaj_convenience_charges,
        bajaj_total_customer_payment,
        bajaj_merchant_receivable,
        freight_charges,
        waived_amount,
        sales_representative_id,
        created_by,
        updated_by,
        customers!inner(
          id,
          name,
          email,
          phone
        ),
        sales_representative:users!sales_representative_id(
          id,
          name,
          email
        ),
        sales_order_items(
          id,
          product_id,
          quantity,
          unit_price,
          final_price,
          custom_product_id,
          name,
          product:products(
            id,
            name,
            sku
          ),
          custom_product:custom_products(
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase sales orders error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data to match the expected format
    const transformedOrders = salesOrders?.map(order => ({
      id: order.id,
      customer_id: order.customer_id,
      quote_id: order.quote_id,
      status: order.status,
      created_at: order.created_at,
      updated_at: order.updated_at,
      expected_delivery_date: order.expected_delivery_date,
      address: order.address,
      notes: order.notes,
      po_created: order.po_created,
      emi_enabled: order.emi_enabled,
      emi_plan: order.emi_plan,
      emi_monthly: order.emi_monthly,
      delivery_floor: order.delivery_floor,
      first_floor_awareness: order.first_floor_awareness,
      
      // Pricing
      final_price: order.final_price,
      original_price: order.original_price,
      discount_amount: order.discount_amount,
      grand_total: order.grand_total,
      tax_percentage: order.tax_percentage,
      tax_amount: order.tax_amount,
      taxable_amount: order.taxable_amount,
      
      // Bajaj Finance
      bajaj_finance_amount: order.bajaj_finance_amount,
      bajaj_processing_fee_amount: order.bajaj_processing_fee_amount,
      bajaj_convenience_charges: order.bajaj_convenience_charges,
      bajaj_total_customer_payment: order.bajaj_total_customer_payment,
      bajaj_merchant_receivable: order.bajaj_merchant_receivable,
      
      // Other charges
      freight_charges: order.freight_charges,
      waived_amount: order.waived_amount,
      
      // Relations
      sales_representative_id: order.sales_representative_id,
      created_by: order.created_by,
      updated_by: order.updated_by,
      
      // Customer info
      customer: order.customers,
      sales_representative: order.sales_representative,
      
      // Order items
      items: ((order.sales_order_items as unknown as SalesOrderItem[]) || []).map((item) => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.unit_price,
        name: item.name || item.custom_product?.name || item.product?.name || 'Unknown Product',
        sku: item.product?.sku
      }))
    })) || [];

    console.log(`CRM Sales Orders API: Fetched ${transformedOrders.length} orders`);
    
    // Log some sample data for debugging
    if (transformedOrders.length > 0) {
      console.log('Sample order:', JSON.stringify(transformedOrders[0], null, 2));
    }

    return NextResponse.json(transformedOrders);

  } catch (error) {
    console.error('CRM Sales orders fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales orders for CRM' }, 
      { status: 500 }
    );
  }
}
