import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LedgerTransaction {
  id: string;
  date: string;
  description: string;
  reference_number?: string;
  transaction_type: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  source_document?: string;
  status?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const ledgerType = searchParams.get('type');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    if (!ledgerType) {
      return NextResponse.json({ error: 'Ledger type is required' }, { status: 400 });
    }

    const transactions: LedgerTransaction[] = [];

    if (ledgerType === 'customer') {
      // Get customer transactions from sales orders, payments, journal entries
      
      // Sales orders (invoices)
      const { data: salesData } = await supabase
        .from('sales_orders')
        .select(`
          id,
          created_at,
          final_price,
          status,
          order_number
        `)
        .eq('customer_id', id)
        .gte('created_at', dateFrom || '1900-01-01')
        .lte('created_at', dateTo || '2100-12-31')
        .order('created_at', { ascending: false });

      if (salesData) {
        for (const sale of salesData) {
          transactions.push({
            id: sale.id,
            date: sale.created_at,
            description: `Sales Order #${sale.order_number}`,
            reference_number: sale.order_number,
            transaction_type: 'invoice',
            debit_amount: sale.final_price,
            credit_amount: 0,
            balance: 0, // Will be calculated later
            source_document: 'sales_order',
            status: sale.status
          });
        }
      }

      // Customer payments
      const { data: paymentData } = await supabase
        .from('payments')
        .select(`
          id,
          payment_date,
          amount,
          payment_method,
          reference_number,
          sales_orders!inner(customer_id)
        `)
        .eq('sales_orders.customer_id', id)
        .gte('payment_date', dateFrom || '1900-01-01')
        .lte('payment_date', dateTo || '2100-12-31')
        .order('payment_date', { ascending: false });

      if (paymentData) {
        for (const payment of paymentData) {
          transactions.push({
            id: payment.id,
            date: payment.payment_date,
            description: `Payment received - ${payment.payment_method}`,
            reference_number: payment.reference_number,
            transaction_type: 'payment',
            debit_amount: 0,
            credit_amount: payment.amount,
            balance: 0, // Will be calculated later
            source_document: 'payment'
          });
        }
      }
    }

    if (ledgerType === 'supplier') {
      // Get supplier transactions from purchase orders, vendor bills, payments
      
      // Purchase orders
      const { data: purchaseData } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          created_at,
          total,
          status,
          purchase_order_number
        `)
        .eq('supplier_id', id)
        .gte('created_at', dateFrom || '1900-01-01')
        .lte('created_at', dateTo || '2100-12-31')
        .order('created_at', { ascending: false });

      if (purchaseData) {
        for (const purchase of purchaseData) {
          transactions.push({
            id: purchase.id,
            date: purchase.created_at,
            description: `Purchase Order #${purchase.purchase_order_number}`,
            reference_number: purchase.purchase_order_number,
            transaction_type: 'bill',
            debit_amount: 0,
            credit_amount: purchase.total,
            balance: 0, // Will be calculated later
            source_document: 'purchase_order',
            status: purchase.status
          });
        }
      }

      // Vendor payments
      const { data: vendorPaymentData } = await supabase
        .from('vendor_payment_history')
        .select(`
          id,
          payment_date,
          amount_paid,
          payment_method,
          reference_number
        `)
        .eq('supplier_id', id)
        .gte('payment_date', dateFrom || '1900-01-01')
        .lte('payment_date', dateTo || '2100-12-31')
        .order('payment_date', { ascending: false });

      if (vendorPaymentData) {
        for (const payment of vendorPaymentData) {
          transactions.push({
            id: payment.id,
            date: payment.payment_date,
            description: `Payment made - ${payment.payment_method}`,
            reference_number: payment.reference_number,
            transaction_type: 'payment',
            debit_amount: payment.amount_paid,
            credit_amount: 0,
            balance: 0, // Will be calculated later
            source_document: 'vendor_payment'
          });
        }
      }
    }

    if (ledgerType === 'employee') {
      // Get employee transactions from salaries, expenses, advances
      
      // Salary payments (if there's a payroll system)
      const { data: salaryData } = await supabase
        .from('journal_entry_lines')
        .select(`
          id,
          debit_amount,
          credit_amount,
          description,
          journal_entries!inner(
            entry_date,
            description,
            reference_number,
            status
          ),
          chart_of_accounts!inner(
            account_name,
            account_code
          )
        `)
        .or(`chart_of_accounts.account_name.ilike.%salary%,chart_of_accounts.account_name.ilike.%wage%,chart_of_accounts.account_name.ilike.%payroll%`)
        .ilike('description', `%${id}%`)
        .gte('journal_entries.entry_date', dateFrom || '1900-01-01')
        .lte('journal_entries.entry_date', dateTo || '2100-12-31')
        .order('journal_entries.entry_date', { ascending: false });

      if (salaryData) {
        for (const salary of salaryData) {
          const journalEntry = Array.isArray(salary.journal_entries) ? salary.journal_entries[0] : salary.journal_entries;
          if (journalEntry) {
            transactions.push({
              id: salary.id,
              date: journalEntry.entry_date,
              description: salary.description || journalEntry.description,
              reference_number: journalEntry.reference_number,
              transaction_type: 'salary',
              debit_amount: salary.debit_amount || 0,
              credit_amount: salary.credit_amount || 0,
              balance: 0, // Will be calculated later
              source_document: 'journal_entry',
              status: journalEntry.status
            });
          }
        }
      }
    }

    // Sort transactions by date (newest first)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate running balance
    let runningBalance = 0;
    for (const transaction of transactions.reverse()) {
      runningBalance += transaction.debit_amount - transaction.credit_amount;
      transaction.balance = runningBalance;
    }
    transactions.reverse(); // Return to newest first order

    return NextResponse.json({ data: transactions });
  } catch (error) {
    console.error('Error fetching ledger transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
