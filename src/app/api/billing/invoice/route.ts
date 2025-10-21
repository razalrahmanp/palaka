import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

interface BajajFinanceData {
  orderAmount: number;
  financeAmount: number;
  downPayment: number;
  plan: {
    months: number;
    interestRate: number;
    processingFee: number;
    minAmount: number;
  };
  monthlyEMI: number;
  totalAmount: number;
  totalInterest: number;
  processingFee: number;
}

interface BillingItem {
  id: string;
  product?: {
    product_id: string;
    product_name: string;
  };
  customProduct?: {
    id: string;
    name: string;
    description: string;
  };
  quantity: number;
  originalPrice: number;
  finalPrice: number;
  discountAmount?: number;
  discountPercentage?: number;
  tax: number;
  totalPrice: number;
  isCustom?: boolean;
}

interface BillingCustomer {
  customer_id: string;
  full_name: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface BillingTotals {
  original_price: number;  // Sum of MRP prices
  total_price: number;     // After individual discounts
  final_price: number;     // After all discounts (what customer pays)
  discount_amount: number; // Total discount amount
  subtotal: number;
  tax: number;
  freight_charges?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customer,
      items,
      customItems = [],
      totals,
      paymentMethod,
      billingType = 'invoice',
      bajajFinanceData,
      notes,
      invoiceDate
    }: {
      customer: BillingCustomer;
      items: BillingItem[];
      customItems?: BillingItem[];
      totals: BillingTotals;
      paymentMethod?: string;
      billingType?: string;
      bajajFinanceData?: BajajFinanceData;
      notes?: string;
      invoiceDate?: string;
    } = body;

    // Convert invoice date to ISO timestamp for created_at
    let createdAt = new Date().toISOString();
    if (invoiceDate) {
      try {
        // Parse the invoice date properly to preserve the exact date
        const dateMatch = invoiceDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateMatch) {
          const [, year, month, day] = dateMatch;
          // Create date using local timezone to avoid UTC shifts
          const invoiceDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          const currentTime = new Date();
          invoiceDateObj.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());
          createdAt = invoiceDateObj.toISOString();
          console.log('Fixed invoice date logic:', {
            originalInvoiceDate: invoiceDate,
            parsedDate: invoiceDateObj.toISOString(),
            dateOnly: invoiceDateObj.toISOString().split('T')[0]
          });
        } else {
          // Fallback to original logic for non-standard date formats
          const invoiceDateObj = new Date(invoiceDate);
          const currentTime = new Date();
          invoiceDateObj.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());
          createdAt = invoiceDateObj.toISOString();
        }
      } catch (error) {
        console.warn('Invalid invoice date provided, using current timestamp:', error);
      }
    }

    // Validate required fields
    if (!customer || (!items?.length && !customItems?.length)) {
      return NextResponse.json(
        { error: 'Customer and items are required' },
        { status: 400 }
      );
    }

    // For demo purposes, we'll use null for created_by
    // In production, get this from authentication
    const currentUserId = null;

    if (billingType === 'quote') {
      // Create quote with correct pricing structure
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          customer_id: customer.customer_id,
          customer: customer.full_name, // Using 'customer' field as per schema
          original_price: totals.original_price,
          total_price: totals.total_price,     // After individual discounts
          final_price: totals.final_price,     // After all discounts
          discount_amount: totals.discount_amount,
          freight_charges: totals.freight_charges || 0,
          status: 'ready_for_delivery',
          items: [...items, ...customItems], // All items in JSON array
          emi_enabled: bajajFinanceData ? true : false,
          emi_plan: bajajFinanceData?.plan || {},
          emi_monthly: bajajFinanceData?.monthlyEMI || 0,
          bajaj_finance_amount: bajajFinanceData?.financeAmount || 0,
          notes: notes,
          created_by: currentUserId,
          created_at: createdAt // Use invoice date as created_at
        })
        .select()
        .single();

      if (quoteError) {
        console.error('Quote creation error:', quoteError);
        return NextResponse.json(
          { error: 'Failed to create quote' },
          { status: 500 }
        );
      }

      // Following the existing pattern from /api/sales/quotes/route.ts
      // Insert custom items (items with type: "custom") into quote_custom_items
      const allItems = [...items, ...customItems];
      const customLines = allItems.filter((item: BillingItem) => item.isCustom);

      if (customLines.length > 0) {
        const insertPayload = customLines.map((item: BillingItem) => ({
          quote_id: quote.id,
          name: item.customProduct?.name || 'Custom Product',
          quantity: item.quantity,
          unit_price: item.originalPrice,
          discount_percentage: item.discountPercentage || 0,
          item_type: 'custom',
          specifications: item.customProduct?.description || '',
          configuration: {
            originalPrice: item.originalPrice,
            finalPrice: item.finalPrice,
            discountAmount: item.discountAmount,
            ...item.customProduct
          }
        }));

        const { error: customItemsError } = await supabase
          .from('quote_custom_items')
          .insert(insertPayload);

        if (customItemsError) {
          console.error('Custom items creation error:', customItemsError);
          return NextResponse.json(
            { error: 'Failed to create custom items' },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        quote_id: quote.id,
        message: 'Quote created successfully'
      });
    }

    if (billingType === 'salesOrder') {
      // First get the quote data to convert to sales order
      const quoteId = body.quoteId;
      if (!quoteId) {
        return NextResponse.json(
          { error: 'Quote ID is required for sales order' },
          { status: 400 }
        );
      }

      // Create sales order from quote
      const { data: salesOrder, error: salesOrderError } = await supabase
        .from('sales_orders')
        .insert({
          quote_id: quoteId,
          customer_id: customer.customer_id,
          customer: customer.full_name,
          original_price: totals.original_price,
          total_price: totals.total_price,
          final_price: totals.final_price,
          discount_amount: totals.discount_amount,
          freight_charges: totals.freight_charges || 0,
          payment_method: paymentMethod || 'cash',
          status: 'ready_for_delivery',
          items: items.filter(item => !item.isCustom),
          emi_enabled: bajajFinanceData ? true : false,
          emi_plan: bajajFinanceData?.plan || {},
          emi_monthly: bajajFinanceData?.monthlyEMI || 0,
          bajaj_finance_amount: bajajFinanceData?.financeAmount || 0,
          notes: notes,
          created_by: currentUserId,
          created_at: createdAt // Use invoice date as created_at
        })
        .select()
        .single();

      if (salesOrderError) {
        console.error('Sales order creation error:', salesOrderError);
        return NextResponse.json(
          { error: 'Failed to create sales order' },
          { status: 500 }
        );
      }

      // Insert custom products into sales_order_items if any
      const allCustomItems = [
        ...customItems,
        ...items.filter(item => item.isCustom)
      ];

      if (allCustomItems.length > 0) {
        const customItemsData = allCustomItems.map((item: BillingItem) => ({
          sales_order_id: salesOrder.id,
          custom_product_id: item.customProduct?.id || item.id,
          product_name: item.customProduct?.name || 'Custom Product',
          quantity: item.quantity,
          unit_price: item.originalPrice,
          discount_amount: item.discountAmount || 0,
          tax_amount: item.tax,
          total_price: item.totalPrice,
          specifications: item.customProduct?.description || ''
        }));

        const { error: customItemsError } = await supabase
          .from('sales_order_items')
          .insert(customItemsData);

        if (customItemsError) {
          console.error('Sales order custom items creation error:', customItemsError);
          return NextResponse.json(
            { error: 'Failed to create sales order custom items' },
            { status: 500 }
          );
        }
      }

      // Adjust inventory for regular products (not custom products)
      const regularProducts = items.filter(item => !item.isCustom && item.product?.product_id);
      if (regularProducts.length > 0) {
        console.log(`Adjusting inventory for ${regularProducts.length} regular products`);
        
        try {
          await Promise.all(
            regularProducts.map(async (item: BillingItem) => {
              const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/inventory/adjust`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  product_id: item.product?.product_id,
                  quantity: item.quantity,
                  type: 'decrease',
                }),
              });

              if (!response.ok) {
                console.error(`Failed to adjust inventory for product ${item.product?.product_id}:`, await response.text());
              } else {
                console.log(`✅ Inventory adjusted for product ${item.product?.product_id}: -${item.quantity}`);
              }
            })
          );
        } catch (inventoryError) {
          console.error('Error adjusting inventory:', inventoryError);
          // Don't fail the sales order creation if inventory adjustment fails
        }
      }

      return NextResponse.json({
        success: true,
        sales_order_id: salesOrder.id,
        message: 'Sales order created successfully'
      });
    }

    // Default invoice creation (legacy support)
    return NextResponse.json({
      success: true,
      message: 'Invoice type not specified, use quote or salesOrder'
    });

  } catch (error) {
    console.error('Billing API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
