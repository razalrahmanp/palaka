import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AgingData {
  id: string;
  customer_name?: string;
  supplier_name?: string;
  invoice_number?: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  days_outstanding: number;
  aging_bucket: string;
  status: string;
}

interface AgingSummary {
  current: number;
  days_31_60: number;
  days_61_90: number;
  days_91_120: number;
  over_120: number;
  total_outstanding: number;
}

function calculateDaysOutstanding(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = today.getTime() - due.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getAgingBucket(daysOutstanding: number): string {
  if (daysOutstanding <= 30) return 'Current';
  if (daysOutstanding <= 60) return '31-60 Days';
  if (daysOutstanding <= 90) return '61-90 Days';
  if (daysOutstanding <= 120) return '91-120 Days';
  return '120+ Days';
}

function getStatus(daysOutstanding: number): string {
  if (daysOutstanding <= 0) return 'current';
  if (daysOutstanding <= 30) return 'due';
  return 'overdue';
}

function calculateAgingSummary(data: AgingData[]): AgingSummary {
  const summary = {
    current: 0,
    days_31_60: 0,
    days_61_90: 0,
    days_91_120: 0,
    over_120: 0,
    total_outstanding: 0
  };

  data.forEach(item => {
    const amount = item.outstanding_amount;
    summary.total_outstanding += amount;

    switch (item.aging_bucket) {
      case 'Current':
        summary.current += amount;
        break;
      case '31-60 Days':
        summary.days_31_60 += amount;
        break;
      case '61-90 Days':
        summary.days_61_90 += amount;
        break;
      case '91-120 Days':
        summary.days_91_120 += amount;
        break;
      case '120+ Days':
        summary.over_120 += amount;
        break;
    }
  });

  return summary;
}

export async function GET() {
  try {
    console.log('=== AGING REPORTS API CALLED ===');

    // Get accounts receivable data from sales orders/invoices
    const { data: salesOrders, error: salesError } = await supabase
      .from('sales_orders')
      .select(`
        id,
        customer_name,
        invoice_number,
        created_at,
        due_date,
        final_price,
        total_paid,
        payment_status
      `)
      .not('final_price', 'is', null)
      .gt('final_price', 0);

    if (salesError) {
      console.error('Error fetching sales orders:', salesError);
    }

    // Get accounts payable data from purchase orders/vendor bills
    const { data: purchaseOrders, error: purchaseError } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        supplier_id,
        po_number,
        created_at,
        due_date,
        total,
        paid_amount,
        payment_status,
        suppliers (
          name
        )
      `)
      .not('total', 'is', null)
      .gt('total', 0);

    if (purchaseError) {
      console.error('Error fetching purchase orders:', purchaseError);
    }

    // Get vendor bills for more comprehensive payables data
    const { data: vendorBills, error: vendorBillsError } = await supabase
      .from('vendor_bills')
      .select(`
        id,
        supplier_id,
        bill_number,
        bill_date,
        due_date,
        total_amount,
        paid_amount,
        status,
        suppliers (
          name
        )
      `)
      .not('total_amount', 'is', null)
      .gt('total_amount', 0);

    if (vendorBillsError) {
      console.error('Error fetching vendor bills:', vendorBillsError);
    }

    // Process receivables data
    const receivables: AgingData[] = [];
    
    if (salesOrders) {
      salesOrders.forEach(order => {
        const totalAmount = order.final_price || 0;
        const paidAmount = order.total_paid || 0;
        const outstandingAmount = totalAmount - paidAmount;

        if (outstandingAmount > 0) {
          const dueDate = order.due_date || new Date(new Date(order.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const daysOutstanding = calculateDaysOutstanding(dueDate);
          
          receivables.push({
            id: order.id,
            customer_name: order.customer_name || 'Unknown Customer',
            invoice_number: order.invoice_number || order.id.slice(0, 8),
            invoice_date: order.created_at.split('T')[0],
            due_date: dueDate,
            total_amount: totalAmount,
            paid_amount: paidAmount,
            outstanding_amount: outstandingAmount,
            days_outstanding: daysOutstanding,
            aging_bucket: getAgingBucket(daysOutstanding),
            status: getStatus(daysOutstanding)
          });
        }
      });
    }

    // Process payables data
    const payables: AgingData[] = [];

    // From purchase orders
    if (purchaseOrders) {
      purchaseOrders.forEach(order => {
        const totalAmount = order.total || 0;
        const paidAmount = order.paid_amount || 0;
        const outstandingAmount = totalAmount - paidAmount;

        if (outstandingAmount > 0) {
          const dueDate = order.due_date || new Date(new Date(order.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const daysOutstanding = calculateDaysOutstanding(dueDate);
          
          payables.push({
            id: order.id,
            supplier_name: Array.isArray(order.suppliers) ? order.suppliers[0]?.name || 'Unknown Supplier' : (order.suppliers as { name: string } | null)?.name || 'Unknown Supplier',
            invoice_number: order.po_number || order.id.slice(0, 8),
            invoice_date: order.created_at.split('T')[0],
            due_date: dueDate,
            total_amount: totalAmount,
            paid_amount: paidAmount,
            outstanding_amount: outstandingAmount,
            days_outstanding: daysOutstanding,
            aging_bucket: getAgingBucket(daysOutstanding),
            status: getStatus(daysOutstanding)
          });
        }
      });
    }

    // From vendor bills
    if (vendorBills) {
      vendorBills.forEach(bill => {
        const totalAmount = bill.total_amount || 0;
        const paidAmount = bill.paid_amount || 0;
        const outstandingAmount = totalAmount - paidAmount;

        if (outstandingAmount > 0) {
          const dueDate = bill.due_date || new Date(new Date(bill.bill_date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const daysOutstanding = calculateDaysOutstanding(dueDate);
          
          payables.push({
            id: `bill_${bill.id}`,
            supplier_name: Array.isArray(bill.suppliers) ? bill.suppliers[0]?.name || 'Unknown Supplier' : (bill.suppliers as { name: string } | null)?.name || 'Unknown Supplier',
            invoice_number: bill.bill_number || bill.id.slice(0, 8),
            invoice_date: bill.bill_date,
            due_date: dueDate,
            total_amount: totalAmount,
            paid_amount: paidAmount,
            outstanding_amount: outstandingAmount,
            days_outstanding: daysOutstanding,
            aging_bucket: getAgingBucket(daysOutstanding),
            status: getStatus(daysOutstanding)
          });
        }
      });
    }

    // Sort by days outstanding (highest first)
    receivables.sort((a, b) => b.days_outstanding - a.days_outstanding);
    payables.sort((a, b) => b.days_outstanding - a.days_outstanding);

    // Calculate summaries
    const receivables_summary = calculateAgingSummary(receivables);
    const payables_summary = calculateAgingSummary(payables);

    console.log('=== AGING REPORTS SUMMARY ===');
    console.log('Receivables Count:', receivables.length);
    console.log('Receivables Total Outstanding:', receivables_summary.total_outstanding);
    console.log('Payables Count:', payables.length);
    console.log('Payables Total Outstanding:', payables_summary.total_outstanding);

    const result = {
      receivables,
      payables,
      receivables_summary,
      payables_summary,
      generated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error generating aging reports:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate aging reports',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
