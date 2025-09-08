import { NextResponse, NextRequest } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

interface LedgerSummary {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'employee' | 'bank' | 'product';
  email?: string;
  phone?: string;
  total_transactions: number;
  total_amount: number;
  balance_due: number;
  last_transaction_date?: string;
  status?: string;
}

interface SalesOrder {
  id: string;
  final_price: number;
  waived_amount: number;
  created_at: string;
}

interface PaymentSummary {
  amount: number;
  invoices: {
    customer_id: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type') || 'all';
    const hideZeroBalances = searchParams.get('hide_zero_balances') === 'true';
    
    const offset = (page - 1) * limit;
    
    console.log('Fetching ledger summary with pagination:', { 
      search, page, limit, type, hideZeroBalances, offset 
    });

    const ledgers: LedgerSummary[] = [];
    let totalCount = 0;

    // OPTIMIZED CUSTOMER LEDGERS
    if (type === 'all' || type === 'customer') {
      console.log('Fetching customer ledgers...');
      
      // Pre-aggregate data using raw SQL for better performance
      const { data: customerSummary, error } = await supabaseAdmin.rpc('get_customer_ledger_summary', {
        search_term: search,
        hide_zero: hideZeroBalances,
        page_offset: type === 'customer' ? offset : 0,
        page_limit: type === 'customer' ? limit : 1000
      });

      if (error) {
        console.error('Error fetching customer summary:', error);
        // Fallback to direct query if RPC fails
        const customerLedgers = await getCustomerLedgersDirect(search, hideZeroBalances);
        ledgers.push(...customerLedgers);
      } else {
        ledgers.push(...(customerSummary || []));
      }
    }

    // OPTIMIZED SUPPLIER LEDGERS
    if (type === 'all' || type === 'supplier') {
      console.log('Fetching supplier ledgers...');
      const supplierLedgers = await getSupplierLedgers(search, hideZeroBalances);
      ledgers.push(...supplierLedgers);
    }

    // OPTIMIZED EMPLOYEE LEDGERS
    if (type === 'all' || type === 'employee') {
      console.log('Fetching employee ledgers...');
      const employeeLedgers = await getEmployeeLedgers(search);
      ledgers.push(...employeeLedgers);
    }

    // Apply pagination if fetching all types
    let paginatedLedgers = ledgers;
    totalCount = ledgers.length;
    
    if (type === 'all') {
      paginatedLedgers = ledgers.slice(offset, offset + limit);
    }

    console.log(`Returning ${paginatedLedgers.length} ledgers out of ${totalCount} total`);

    return NextResponse.json({
      success: true,
      data: paginatedLedgers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: (page * limit) < totalCount
      }
    });

  } catch (error) {
    console.error('Error in ledgers-summary API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ledger summary' },
      { status: 500 }
    );
  }
}

// Optimized customer ledgers with minimal data
async function getCustomerLedgersDirect(search: string, hideZeroBalances: boolean): Promise<LedgerSummary[]> {
  try {
    // Use a more efficient query by pre-joining and aggregating
    let query = supabaseAdmin
      .from('customers')
      .select(`
        id,
        name,
        email,
        phone,
        created_at,
        sales_orders!inner (
          id,
          final_price,
          waived_amount,
          created_at
        )
      `)
      .eq('is_deleted', false)
      .limit(200); // Reasonable limit

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: customersWithOrders } = await query;
    
    if (!customersWithOrders?.length) return [];

    // Get payment summaries in one query
    const customerIds = customersWithOrders.map(c => c.id);
    const { data: paymentSummaries } = await supabaseAdmin
      .from('payments')
      .select(`
        amount,
        invoices!inner (
          customer_id
        )
      `)
      .in('invoices.customer_id', customerIds);

    // Process data efficiently
    const customerLedgers: LedgerSummary[] = [];
    
    for (const customer of customersWithOrders) {
      const orders = customer.sales_orders || [];
      const totalSales = orders.reduce((sum: number, order: SalesOrder) => sum + (order.final_price || 0), 0);
      const totalWaived = orders.reduce((sum: number, order: SalesOrder) => sum + (order.waived_amount || 0), 0);
      
      const customerPayments = paymentSummaries?.filter((p: any) => p.invoices?.customer_id === customer.id) || [];
      const totalPaid = customerPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      
      const balanceDue = totalSales - totalPaid - totalWaived;
      
      if (hideZeroBalances && Math.abs(balanceDue) < 0.10) continue;
      
      const lastTransactionDate = orders.length > 0 
        ? Math.max(...orders.map((o: SalesOrder) => new Date(o.created_at).getTime()))
        : new Date(customer.created_at).getTime();

      customerLedgers.push({
        id: customer.id,
        name: customer.name,
        type: 'customer',
        email: customer.email,
        phone: customer.phone,
        total_transactions: orders.length,
        total_amount: totalSales,
        balance_due: balanceDue,
        last_transaction_date: new Date(lastTransactionDate).toISOString(),
        status: Math.abs(balanceDue) < 0.10 ? 'settled' : 'outstanding'
      });
    }

    return customerLedgers;
  } catch (error) {
    console.error('Error fetching customer ledgers direct:', error);
    return [];
  }
}

// Simplified supplier ledgers
async function getSupplierLedgers(search: string, _hideZeroBalances: boolean): Promise<LedgerSummary[]> {
  try {
    let query = supabaseAdmin
      .from('vendors')
      .select('id, name, email, phone, created_at')
      .eq('is_deleted', false)
      .limit(100);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: vendors } = await query;
    
    return (vendors || []).map(vendor => ({
      id: vendor.id,
      name: vendor.name,
      type: 'supplier' as const,
      email: vendor.email,
      phone: vendor.phone,
      total_transactions: 0, // Simplified for now
      total_amount: 0,
      balance_due: 0,
      last_transaction_date: vendor.created_at,
      status: 'active'
    }));
  } catch (error) {
    console.error('Error fetching supplier ledgers:', error);
    return [];
  }
}

// Simplified employee ledgers
async function getEmployeeLedgers(search: string): Promise<LedgerSummary[]> {
  try {
    let query = supabaseAdmin
      .from('employees')
      .select('id, name, email, phone, created_at')
      .eq('is_deleted', false)
      .limit(100);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: employees } = await query;
    
    return (employees || []).map(employee => ({
      id: employee.id,
      name: employee.name,
      type: 'employee' as const,
      email: employee.email,
      phone: employee.phone,
      total_transactions: 0, // Simplified for now
      total_amount: 0,
      balance_due: 0,
      last_transaction_date: employee.created_at,
      status: 'active'
    }));
  } catch (error) {
    console.error('Error fetching employee ledgers:', error);
    return [];
  }
}
