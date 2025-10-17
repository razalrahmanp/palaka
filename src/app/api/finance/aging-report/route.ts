import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface AgingBucket {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
}

interface ReceivableDetail {
  customer: string;
  customerId: string;
  contact: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  totalDue: number;
  orderTotal: number;
  paidAmount: number;
  oldestInvoiceDate: string | null;
  oldestDays: number;
}

interface PayableDetail {
  vendor: string;
  vendorId: string;
  contact: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  totalDue: number;
  billTotal: number;
  paidAmount: number;
  oldestBillDate: string | null;
  oldestDays: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get('asOfDate') || new Date().toISOString().split('T')[0];
    const type = searchParams.get('type'); // 'receivables', 'payables', or null (both)

    // If specific type requested, return only that data
    if (type === 'receivables') {
      const receivables = await calculateReceivablesAging(asOfDate);
      return NextResponse.json({
        asOfDate,
        summary: receivables.summary,
        accounts: receivables.details,
        generatedAt: new Date().toISOString()
      });
    }

    if (type === 'payables') {
      const payables = await calculatePayablesAging(asOfDate);
      return NextResponse.json({
        asOfDate,
        summary: payables.summary,
        accounts: payables.details,
        generatedAt: new Date().toISOString()
      });
    }

    // Calculate aging for both receivables and payables
    const [receivables, payables] = await Promise.all([
      calculateReceivablesAging(asOfDate),
      calculatePayablesAging(asOfDate)
    ]);

    return NextResponse.json({
      asOfDate,
      receivables,
      payables,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating aging report:', error);
    return NextResponse.json(
      { error: 'Failed to generate aging report' },
      { status: 500 }
    );
  }
}

async function calculateReceivablesAging(asOfDate: string) {
  // Get all sales orders with customer details and their related invoices/payments
  // Status options: draft, confirmed, shipped, delivered, ready_for_delivery, partial_delivery_ready
  const { data: salesOrders, error: ordersError } = await supabaseAdmin
    .from('sales_orders')
    .select(`
      id,
      customer_id,
      grand_total,
      created_at,
      status,
      customers (
        id,
        name,
        email,
        phone
      )
    `)
    .in('status', ['confirmed', 'shipped', 'delivered', 'ready_for_delivery', 'partial_delivery_ready'])
    .order('created_at', { ascending: true });

  if (ordersError) {
    console.error('Error fetching sales orders:', ordersError);
    throw ordersError;
  }

  console.log(`[Receivables] Found ${salesOrders?.length || 0} sales orders`);
  if (salesOrders && salesOrders.length > 0) {
    console.log('[Receivables] Sample order:', salesOrders[0]);
  }

  // Get all invoices with payment information
  const { data: invoices, error: invoicesError } = await supabaseAdmin
    .from('invoices')
    .select('id, sales_order_id, total, paid_amount, waived_amount')
    .neq('status', 'paid');

  if (invoicesError) {
    console.error('Error fetching invoices:', invoicesError);
    throw invoicesError;
  }

  console.log(`[Receivables] Found ${invoices?.length || 0} unpaid invoices`);
  if (invoices && invoices.length > 0) {
    console.log('[Receivables] Sample invoice:', invoices[0]);
  }

  // Create a map of sales_order_id to invoice payment info
  const invoiceMap = new Map<string, { total: number; paid: number; waived: number }>();
  invoices?.forEach((inv: Record<string, unknown>) => {
    const orderId = inv.sales_order_id as string;
    if (!orderId) return;
    
    if (!invoiceMap.has(orderId)) {
      invoiceMap.set(orderId, { total: 0, paid: 0, waived: 0 });
    }
    const invData = invoiceMap.get(orderId)!;
    invData.total += (inv.total as number) || 0;
    invData.paid += (inv.paid_amount as number) || 0;
    invData.waived += (inv.waived_amount as number) || 0;
  });

  const asOfDateObj = new Date(asOfDate);
  const customerMap = new Map<string, ReceivableDetail>();
  
  const totals: AgingBucket = {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    days90plus: 0
  };

  salesOrders?.forEach((order: Record<string, unknown>) => {
    const orderId = order.id as string;
    const grandTotal = (order.grand_total as number) || 0;
    
    // Get invoice/payment data for this order
    const invoiceData = invoiceMap.get(orderId);
    const paidAmount = invoiceData?.paid || 0;
    const waivedAmount = invoiceData?.waived || 0;
    
    // Outstanding = Grand Total - Paid - Waived
    // (We use grand_total as the actual amount owed)
    const remainingAmount = grandTotal - paidAmount - waivedAmount;

    if (remainingAmount <= 0) return;

    const orderDate = new Date(order.created_at as string);
    const daysOutstanding = Math.floor((asOfDateObj.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = (order as any).customers;
    const customerId = customer?.id || order.customer_id;
    const customerName = customer?.name || 'Unknown Customer';
    const customerContact = customer?.phone || customer?.email || 'N/A';

    if (!customerMap.has(customerId as string)) {
      customerMap.set(customerId as string, {
        customer: customerName as string,
        customerId: customerId as string,
        contact: customerContact as string,
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90plus: 0,
        totalDue: 0,
        orderTotal: 0,
        paidAmount: 0,
        oldestInvoiceDate: orderDate.toISOString().split('T')[0],
        oldestDays: daysOutstanding
      });
    }

    const customerDetail = customerMap.get(customerId as string)!;
    
    // Track order total and paid amount
    customerDetail.orderTotal += grandTotal;
    customerDetail.paidAmount += paidAmount;

    // Categorize by aging bucket
    if (daysOutstanding <= 0) {
      customerDetail.current += remainingAmount;
      totals.current += remainingAmount;
    } else if (daysOutstanding <= 30) {
      customerDetail.days1to30 += remainingAmount;
      totals.days1to30 += remainingAmount;
    } else if (daysOutstanding <= 60) {
      customerDetail.days31to60 += remainingAmount;
      totals.days31to60 += remainingAmount;
    } else if (daysOutstanding <= 90) {
      customerDetail.days61to90 += remainingAmount;
      totals.days61to90 += remainingAmount;
    } else {
      customerDetail.days90plus += remainingAmount;
      totals.days90plus += remainingAmount;
    }

    customerDetail.totalDue += remainingAmount;

    // Update oldest order date
    if (daysOutstanding > customerDetail.oldestDays) {
      customerDetail.oldestInvoiceDate = orderDate.toISOString().split('T')[0];
      customerDetail.oldestDays = daysOutstanding;
    }
  });

  const details = Array.from(customerMap.values()).sort((a, b) => b.totalDue - a.totalDue);

  const summary = {
    ...totals,
    total: totals.current + totals.days1to30 + totals.days31to60 + totals.days61to90 + totals.days90plus
  };

  console.log('[Receivables] Summary:', summary);
  console.log('[Receivables] Details count:', details.length);

  return {
    summary,
    details
  };
}

async function calculatePayablesAging(asOfDate: string) {
  // Get all vendor bills with supplier details
  const { data: bills, error: billsError } = await supabaseAdmin
    .from('vendor_bills')
    .select(`
      id,
      supplier_id,
      total_amount,
      paid_amount,
      due_date,
      bill_date,
      status,
      suppliers (
        id,
        name,
        email,
        contact
      )
    `)
    .in('status', ['pending', 'partial', 'overdue'])
    .order('bill_date', { ascending: true });

  if (billsError) {
    console.error('Error fetching vendor bills:', billsError);
    throw billsError;
  }

  console.log(`[Payables] Found ${bills?.length || 0} unpaid vendor bills`);
  if (bills && bills.length > 0) {
    console.log('[Payables] Sample bill:', bills[0]);
  }

  // Get all vendor payments to cross-reference with bills
  const { data: payments, error: paymentsError } = await supabaseAdmin
    .from('vendor_payment_history')
    .select('id, vendor_bill_id, amount, payment_date, status')
    .eq('status', 'completed');

  if (paymentsError) {
    console.error('Error fetching vendor payments:', paymentsError);
    throw paymentsError;
  }

  // Create a map of vendor_bill_id to total payments
  const paymentMap = new Map<string, number>();
  payments?.forEach((payment: Record<string, unknown>) => {
    const billId = payment.vendor_bill_id as string;
    if (!billId) return;
    
    const amount = (payment.amount as number) || 0;
    paymentMap.set(billId, (paymentMap.get(billId) || 0) + amount);
  });

  const asOfDateObj = new Date(asOfDate);
  const vendorMap = new Map<string, PayableDetail>();
  
  const totals: AgingBucket = {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    days90plus: 0
  };

  bills?.forEach((bill: Record<string, unknown>) => {
    const billId = bill.id as string;
    const totalAmount = (bill.total_amount as number) || 0;
    
    // Get actual paid amount from vendor_payment_history
    const paidFromHistory = paymentMap.get(billId) || 0;
    
    // Use the maximum of bill.paid_amount or actual payment history
    // (in case they get out of sync)
    const paidAmount = Math.max((bill.paid_amount as number) || 0, paidFromHistory);
    
    const remainingAmount = totalAmount - paidAmount;

    if (remainingAmount <= 0) return;

    const billDate = new Date(bill.bill_date as string);
    const daysOutstanding = Math.floor((asOfDateObj.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supplier = (bill as any).suppliers;
    const supplierId = supplier?.id || bill.supplier_id;
    const supplierName = supplier?.name || 'Unknown Vendor';
    const supplierContact = supplier?.contact || supplier?.email || 'N/A';

    if (!vendorMap.has(supplierId as string)) {
      vendorMap.set(supplierId as string, {
        vendor: supplierName as string,
        vendorId: supplierId as string,
        contact: supplierContact as string,
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90plus: 0,
        totalDue: 0,
        billTotal: 0,
        paidAmount: 0,
        oldestBillDate: billDate.toISOString().split('T')[0],
        oldestDays: daysOutstanding
      });
    }

    const vendorDetail = vendorMap.get(supplierId as string)!;
    
    // Track bill total and paid amount
    vendorDetail.billTotal += totalAmount;
    vendorDetail.paidAmount += paidAmount;

    // Categorize by aging bucket based on days outstanding (since bill date)
    if (daysOutstanding <= 0) {
      vendorDetail.current += remainingAmount;
      totals.current += remainingAmount;
    } else if (daysOutstanding <= 30) {
      vendorDetail.days1to30 += remainingAmount;
      totals.days1to30 += remainingAmount;
    } else if (daysOutstanding <= 60) {
      vendorDetail.days31to60 += remainingAmount;
      totals.days31to60 += remainingAmount;
    } else if (daysOutstanding <= 90) {
      vendorDetail.days61to90 += remainingAmount;
      totals.days61to90 += remainingAmount;
    } else {
      vendorDetail.days90plus += remainingAmount;
      totals.days90plus += remainingAmount;
    }

    vendorDetail.totalDue += remainingAmount;

    // Update oldest bill date
    if (daysOutstanding > vendorDetail.oldestDays) {
      vendorDetail.oldestBillDate = billDate.toISOString().split('T')[0];
      vendorDetail.oldestDays = daysOutstanding;
    }
  });

  const details = Array.from(vendorMap.values()).sort((a, b) => b.totalDue - a.totalDue);

  const summary = {
    ...totals,
    total: totals.current + totals.days1to30 + totals.days31to60 + totals.days61to90 + totals.days90plus
  };

  console.log('[Payables] Summary:', summary);
  console.log('[Payables] Details count:', details.length);

  return {
    summary,
    details
  };
}
