import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

interface WaiveOffRequest {
  sales_order_id?: string;
  invoice_id?: string;
  waived_amount: number;
  reason?: string;
  waived_by?: string;
}

export async function POST(req: Request) {
  try {
    const body: WaiveOffRequest = await req.json();
    const { sales_order_id, invoice_id, waived_amount, reason } = body;

    if (!sales_order_id && !invoice_id) {
      return NextResponse.json({ 
        error: "Either sales_order_id or invoice_id is required" 
      }, { status: 400 });
    }

    if (!waived_amount || waived_amount <= 0) {
      return NextResponse.json({ 
        error: "waived_amount must be greater than 0" 
      }, { status: 400 });
    }

    console.log(`🔄 Processing waive-off request: ${JSON.stringify(body)}`);

    // If waiving off from sales order
    if (sales_order_id) {
      // 1. Get current sales order details
      const { data: salesOrder, error: orderError } = await supabase
        .from("sales_orders")
        .select("id, final_price, original_price, discount_amount, waived_amount, status")
        .eq("id", sales_order_id)
        .single();

      if (orderError || !salesOrder) {
        return NextResponse.json({ 
          error: "Sales order not found" 
        }, { status: 404 });
      }

      // 2. Calculate new amounts
      const currentWaived = Number(salesOrder.waived_amount) || 0;
      const newWaivedAmount = currentWaived + waived_amount;
      const originalPrice = Number(salesOrder.original_price) || 0;
      const currentDiscount = Number(salesOrder.discount_amount) || 0;
      
      // Calculate new final price: original_price - discount_amount - waived_amount
      const newFinalPrice = originalPrice - currentDiscount - newWaivedAmount;

      if (newFinalPrice < 0) {
        return NextResponse.json({ 
          error: "Cannot waive more than the remaining amount" 
        }, { status: 400 });
      }

      // 3. Get current payment information to determine if order should be marked as complete
      const { data: orderPayments } = await supabase
        .from("payments")
        .select("amount")
        .in("invoice_id", (await supabase
          .from("invoices")
          .select("id")
          .eq("sales_order_id", sales_order_id)
        ).data?.map(inv => inv.id) || []);

      const totalPaid = orderPayments?.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0) || 0;
      const remainingBalance = newFinalPrice - totalPaid;

      // Prepare order updates
      const orderUpdates: {
        waived_amount: number;
        final_price: number;
        updated_at: string;
        status?: string;
      } = {
        waived_amount: newWaivedAmount,
        final_price: newFinalPrice,
        updated_at: new Date().toISOString()
      };

      // If no balance remains after waive-off, mark as completed
      if (remainingBalance <= 0) {
        // Check current status and update appropriately
        const currentStatus = salesOrder.status;
        if (currentStatus !== 'completed' && currentStatus !== 'delivered') {
          orderUpdates.status = 'ready_for_delivery'; // or 'completed' based on your business logic
          console.log(`🎉 Sales order ${sales_order_id} will be marked as ready for delivery (fully paid after waive-off)`);
        }
      }

      // 4. Update sales order
      const { error: updateError } = await supabase
        .from("sales_orders")
        .update(orderUpdates)
        .eq("id", sales_order_id);

      if (updateError) {
        console.error('❌ Error updating sales order:', updateError);
        return NextResponse.json({ 
          error: updateError.message 
        }, { status: 500 });
      }

      // 4. Update all related invoices to reflect the waived amount
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, total, waived_amount")
        .eq("sales_order_id", sales_order_id);

      if (invoices && invoices.length > 0) {
        // Distribute the waived amount proportionally across invoices
        const totalInvoiced = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
        
        for (const invoice of invoices) {
          const invoiceTotal = Number(invoice.total) || 0;
          const proportionalWaived = totalInvoiced > 0 ? (invoiceTotal / totalInvoiced) * waived_amount : 0;
          const currentInvoiceWaived = Number(invoice.waived_amount) || 0;
          
          await supabase
            .from("invoices")
            .update({
              waived_amount: currentInvoiceWaived + proportionalWaived
            })
            .eq("id", invoice.id);
        }
      }

      console.log(`✅ Waived off ₹${waived_amount} from sales order ${sales_order_id}`);
      
      return NextResponse.json({
        success: true,
        message: `Successfully waived off ₹${waived_amount} from sales order`,
        sales_order_id,
        waived_amount,
        new_final_price: newFinalPrice,
        reason
      });
    }

    // If waiving off from invoice
    if (invoice_id) {
      // 1. Get current invoice details
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("id, total, waived_amount, sales_order_id, paid_amount, status")
        .eq("id", invoice_id)
        .single();

      if (invoiceError || !invoice) {
        return NextResponse.json({ 
          error: "Invoice not found" 
        }, { status: 404 });
      }

      // 2. Calculate new amounts and determine status
      const currentWaived = Number(invoice.waived_amount) || 0;
      const newWaivedAmount = currentWaived + waived_amount;
      const invoiceTotal = Number(invoice.total) || 0;
      const paidAmount = Number(invoice.paid_amount) || 0;
      
      // Check if waiving more than outstanding amount
      const outstandingAmount = invoiceTotal - paidAmount - currentWaived;
      if (waived_amount > outstandingAmount) {
        return NextResponse.json({ 
          error: `Cannot waive ₹${waived_amount}. Outstanding amount is only ₹${outstandingAmount}` 
        }, { status: 400 });
      }

      // Calculate remaining balance after waive-off
      const remainingBalance = invoiceTotal - paidAmount - newWaivedAmount;

      // Prepare invoice updates
      const invoiceUpdates: {
        waived_amount: number;
        status?: string;
      } = {
        waived_amount: newWaivedAmount
      };

      // If no balance remains, mark invoice as paid
      if (remainingBalance <= 0) {
        invoiceUpdates.status = 'paid';
        console.log(`🎉 Invoice ${invoice_id} will be marked as paid (fully settled after waive-off)`);
      }

      // 3. Update invoice
      const { error: updateInvoiceError } = await supabase
        .from("invoices")
        .update(invoiceUpdates)
        .eq("id", invoice_id);

      if (updateInvoiceError) {
        console.error('❌ Error updating invoice:', updateInvoiceError);
        return NextResponse.json({ 
          error: updateInvoiceError.message 
        }, { status: 500 });
      }

      // 4. Update related sales order waived amount
      if (invoice.sales_order_id) {
        const { data: salesOrder } = await supabase
          .from("sales_orders")
          .select("waived_amount, final_price, original_price, discount_amount")
          .eq("id", invoice.sales_order_id)
          .single();

        if (salesOrder) {
          const currentOrderWaived = Number(salesOrder.waived_amount) || 0;
          const newOrderWaivedAmount = currentOrderWaived + waived_amount;
          const originalPrice = Number(salesOrder.original_price) || 0;
          const discountAmount = Number(salesOrder.discount_amount) || 0;
          const newFinalPrice = originalPrice - discountAmount - newOrderWaivedAmount;

          await supabase
            .from("sales_orders")
            .update({
              waived_amount: newOrderWaivedAmount,
              final_price: newFinalPrice,
              updated_at: new Date().toISOString()
            })
            .eq("id", invoice.sales_order_id);
        }
      }

      console.log(`✅ Waived off ₹${waived_amount} from invoice ${invoice_id}`);
      
      return NextResponse.json({
        success: true,
        message: `Successfully waived off ₹${waived_amount} from invoice`,
        invoice_id,
        waived_amount,
        new_waived_total: newWaivedAmount,
        reason
      });
    }

  } catch (error) {
    console.error('💥 Waive-off API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get waive-off history
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sales_order_id = searchParams.get('sales_order_id');
    const invoice_id = searchParams.get('invoice_id');

    if (!sales_order_id && !invoice_id) {
      return NextResponse.json({ 
        error: "Either sales_order_id or invoice_id parameter is required" 
      }, { status: 400 });
    }

    let waiveData: Array<{
      type: 'sales_order' | 'invoice';
      id: number;
      waived_amount: number;
      final_price?: number;
      original_price?: number;
      discount_amount?: number;
      total?: number;
      paid_amount?: number;
    }> = [];

    if (sales_order_id) {
      const { data: orderData, error } = await supabase
        .from("sales_orders")
        .select("id, waived_amount, final_price, original_price, discount_amount")
        .eq("id", sales_order_id)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      waiveData = [{
        type: 'sales_order',
        id: orderData.id,
        waived_amount: orderData.waived_amount || 0,
        final_price: orderData.final_price,
        original_price: orderData.original_price,
        discount_amount: orderData.discount_amount
      }];
    }

    if (invoice_id) {
      const { data: invoiceData, error } = await supabase
        .from("invoices")
        .select("id, waived_amount, total, paid_amount")
        .eq("id", invoice_id)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      waiveData = [{
        type: 'invoice',
        id: invoiceData.id,
        waived_amount: invoiceData.waived_amount || 0,
        total: invoiceData.total,
        paid_amount: invoiceData.paid_amount
      }];
    }

    return NextResponse.json({ data: waiveData });

  } catch (error) {
    console.error('💥 Waive-off History API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
