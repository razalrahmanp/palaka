import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

interface LedgerTransaction {
  id: string;
  date: string;
       // Third try: Through invoices relationship (if exists)
      const { data: paymentsViaInvoices, error: invoicesError } = await supabaseAdmin
        .from('payments')
        .select('*')
        .gte('payment_date', dateFrom || '1900-01-01')
        .lte('payment_date', dateTo || '2100-12-31')
        .order('payment_date', { ascending: false });ing;
  reference_number?: string;
  transaction_type: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  source_document?: string;
  status?: string;
  document_id?: string;
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

    console.log(`Fetching transactions for ${ledgerType} ledger:`, id);

    if (!ledgerType) {
      return NextResponse.json({ error: 'Ledger type is required' }, { status: 400 });
    }

    const transactions: LedgerTransaction[] = [];

    if (ledgerType === 'customer') {
      await fetchCustomerTransactions(id, dateFrom, dateTo, transactions);
    } else if (ledgerType === 'supplier') {
      await fetchSupplierTransactions(id, dateFrom, dateTo, transactions);
    } else if (ledgerType === 'employee') {
      await fetchEmployeeTransactions(id, dateFrom, dateTo, transactions);
    }

    // Sort all transactions by date (newest first)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate running balance
    let runningBalance = 0;
    for (let i = transactions.length - 1; i >= 0; i--) {
      const transaction = transactions[i];
      runningBalance += transaction.debit_amount - transaction.credit_amount;
      transaction.balance = runningBalance;
    }

    console.log(`Found ${transactions.length} transactions for ${ledgerType} ${id}`);

    return NextResponse.json({
      success: true,
      data: transactions,
      meta: {
        ledger_id: id,
        ledger_type: ledgerType,
        transaction_count: transactions.length,
        date_range: { from: dateFrom, to: dateTo }
      }
    });

  } catch (error) {
    console.error('Error fetching ledger transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// Customer transactions from sales orders, invoices, and payments
async function fetchCustomerTransactions(
  customerId: string,
  dateFrom: string | null,
  dateTo: string | null,
  transactions: LedgerTransaction[]
) {
  console.log('Fetching customer transactions for:', customerId);

  try {
    // 1. SALES ORDERS (Invoices/Receivables)
    const { data: salesOrders } = await supabaseAdmin
      .from('sales_orders')
      .select(`
        id,
        created_at,
        final_price,
        original_price,
        discount_amount,
        freight_charges,
        tax_amount,
        status,
        notes
      `)
      .eq('customer_id', customerId)
      .gte('created_at', dateFrom || '1900-01-01')
      .lte('created_at', dateTo || '2100-12-31')
      .order('created_at', { ascending: false });

    if (salesOrders) {
      salesOrders.forEach((order, index) => {
        transactions.push({
          id: `so_${order.id}`,
          date: order.created_at,
          description: `Sales Order #${index + 1} - ${order.notes || 'Sale'}`,
          reference_number: `SO-${order.id.slice(-8)}`,
          transaction_type: 'invoice',
          debit_amount: order.final_price || 0,
          credit_amount: 0,
          balance: 0,
          source_document: 'sales_order',
          status: order.status,
          document_id: order.id
        });

        // Add discount as separate transaction if exists
        if (order.discount_amount && order.discount_amount > 0) {
          transactions.push({
            id: `disc_${order.id}`,
            date: order.created_at,
            description: `Discount on Sales Order #${index + 1}`,
            reference_number: `DISC-${order.id.slice(-8)}`,
            transaction_type: 'discount',
            debit_amount: 0,
            credit_amount: order.discount_amount,
            balance: 0,
            source_document: 'sales_order',
            status: 'applied',
            document_id: order.id
          });
        }

        // Add freight charges if exists
        if (order.freight_charges && order.freight_charges > 0) {
          transactions.push({
            id: `freight_${order.id}`,
            date: order.created_at,
            description: `Freight Charges - Sales Order #${index + 1}`,
            reference_number: `FRT-${order.id.slice(-8)}`,
            transaction_type: 'freight',
            debit_amount: order.freight_charges,
            credit_amount: 0,
            balance: 0,
            source_document: 'sales_order',
            status: 'charged',
            document_id: order.id
          });
        }
      });
    }

    // 2. PAYMENTS RECEIVED (try multiple approaches to find payments)
    let payments = null;
    
    console.log(`Searching for payments for customer: ${customerId}`);
    
    // First try: Direct customer_id match (selecting only columns that exist)
    const { data: paymentsDirects, error: directError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('customer_id', customerId)
      .gte('payment_date', dateFrom || '1900-01-01')
      .lte('payment_date', dateTo || '2100-12-31')
      .order('payment_date', { ascending: false });

    console.log(`Direct payments query result:`, { count: paymentsDirects?.length || 0, error: directError });

    // Second try: Through sales_orders relationship (if the relationship exists)
    if (!paymentsDirects || paymentsDirects.length === 0) {
      const { data: paymentsViaOrders, error: ordersError } = await supabaseAdmin
        .from('payments')
        .select('*')
        .gte('payment_date', dateFrom || '1900-01-01')
        .lte('payment_date', dateTo || '2100-12-31')
        .order('payment_date', { ascending: false });
      
      console.log(`Via sales_orders query result:`, { count: paymentsViaOrders?.length || 0, error: ordersError });
      payments = paymentsViaOrders;
    } else {
      payments = paymentsDirects;
    }

    // Third try: Through invoices relationship
    if (!payments || payments.length === 0) {
      const { data: paymentsViaInvoices, error: invoicesError } = await supabaseAdmin
        .from('payments')
        .select(`
          id,
          payment_date,
          amount,
          payment_method,
          reference_number,
          notes,
          status,
          invoices!inner(customer_id)
        `)
        .eq('invoices.customer_id', customerId)
        .gte('payment_date', dateFrom || '1900-01-01')
        .lte('payment_date', dateTo || '2100-12-31')
        .order('payment_date', { ascending: false });
      
      console.log(`Via invoices query result:`, { count: paymentsViaInvoices?.length || 0, error: invoicesError });
      payments = paymentsViaInvoices;
    }

    // Fourth try: Find payments by sales order IDs from this customer
    if (!payments || payments.length === 0) {
      // Get all sales order IDs for this customer
      const salesOrderIds = salesOrders?.map(order => order.id) || [];
      
      if (salesOrderIds.length > 0) {
        const { data: paymentsBySalesOrder, error: salesOrderError } = await supabaseAdmin
          .from('payments')
          .select(`
            id,
            payment_date,
            amount,
            payment_method,
            reference_number,
            notes,
            status,
            sales_order_id
          `)
          .in('sales_order_id', salesOrderIds)
          .gte('payment_date', dateFrom || '1900-01-01')
          .lte('payment_date', dateTo || '2100-12-31')
          .order('payment_date', { ascending: false });
        
        console.log(`Via sales_order_id query result:`, { count: paymentsBySalesOrder?.length || 0, error: salesOrderError });
        payments = paymentsBySalesOrder;
      }
    }

    // Fifth try: Get ALL payments and filter by description/notes containing customer ID
    if (!payments || payments.length === 0) {
      console.log(`Trying to find payments by customer ID in description/notes...`);
      const { data: allPayments, error: allPaymentsError } = await supabaseAdmin
        .from('payments')
        .select(`
          id,
          payment_date,
          amount,
          payment_method,
          reference_number,
          notes,
          status
        `)
        .gte('payment_date', dateFrom || '1900-01-01')
        .lte('payment_date', dateTo || '2100-12-31')
        .order('payment_date', { ascending: false })
        .limit(100); // Limit to avoid too many results

      console.log(`All payments query result:`, { count: allPayments?.length || 0, error: allPaymentsError });
      
      // Filter payments that might be related to this customer
      if (allPayments) {
        const customerPayments = allPayments.filter(payment => 
          payment.notes?.includes(customerId) || 
          payment.reference_number?.includes(customerId)
        );
        console.log(`Filtered customer payments:`, { count: customerPayments.length });
        if (customerPayments.length > 0) {
          payments = customerPayments;
        }
      }
    }

    console.log(`Final payments result for customer ${customerId}:`, { count: payments?.length || 0 });

    if (payments) {
      payments.forEach((payment) => {
        transactions.push({
          id: `pay_${payment.id}`,
          date: payment.payment_date,
          description: `Payment Received - ${payment.payment_method} ${payment.notes ? `(${payment.notes})` : ''}`,
          reference_number: payment.reference_number || `PAY-${payment.id.slice(-8)}`,
          transaction_type: 'payment',
          debit_amount: 0,
          credit_amount: payment.amount || 0,
          balance: 0,
          source_document: 'payment',
          status: payment.status,
          document_id: payment.id
        });
      });
    }

    // 3. INVOICES (if separate from sales orders)
    const { data: invoices } = await supabaseAdmin
      .from('invoices')
      .select(`
        id,
        invoice_date,
        total_amount,
        invoice_number,
        status,
        notes
      `)
      .eq('customer_id', customerId)
      .gte('invoice_date', dateFrom || '1900-01-01')
      .lte('invoice_date', dateTo || '2100-12-31')
      .order('invoice_date', { ascending: false });

    if (invoices) {
      invoices.forEach((invoice) => {
        transactions.push({
          id: `inv_${invoice.id}`,
          date: invoice.invoice_date,
          description: `Invoice ${invoice.invoice_number} - ${invoice.notes || 'Invoice'}`,
          reference_number: invoice.invoice_number,
          transaction_type: 'invoice',
          debit_amount: invoice.total_amount || 0,
          credit_amount: 0,
          balance: 0,
          source_document: 'invoice',
          status: invoice.status,
          document_id: invoice.id
        });
      });
    }

  } catch (error) {
    console.error('Error fetching customer transactions:', error);
  }
}

// Supplier transactions from purchase orders, vendor bills, and payments
async function fetchSupplierTransactions(
  supplierId: string,
  dateFrom: string | null,
  dateTo: string | null,
  transactions: LedgerTransaction[]
) {
  console.log('Fetching supplier transactions for:', supplierId);

  try {
    // 1. PURCHASE ORDERS (Bills/Payables)
    const { data: purchaseOrders } = await supabaseAdmin
      .from('purchase_orders')
      .select(`
        id,
        created_at,
        total,
        subtotal,
        tax_amount,
        status,
        notes,
        purchase_order_number
      `)
      .eq('supplier_id', supplierId)
      .gte('created_at', dateFrom || '1900-01-01')
      .lte('created_at', dateTo || '2100-12-31')
      .order('created_at', { ascending: false });

    if (purchaseOrders) {
      purchaseOrders.forEach((order) => {
        transactions.push({
          id: `po_${order.id}`,
          date: order.created_at,
          description: `Purchase Order ${order.purchase_order_number || `#${order.id.slice(-8)}`} - ${order.notes || 'Purchase'}`,
          reference_number: order.purchase_order_number || `PO-${order.id.slice(-8)}`,
          transaction_type: 'bill',
          debit_amount: 0,
          credit_amount: order.total || 0,
          balance: 0,
          source_document: 'purchase_order',
          status: order.status,
          document_id: order.id
        });

        // Add tax as separate transaction if exists
        if (order.tax_amount && order.tax_amount > 0) {
          transactions.push({
            id: `tax_${order.id}`,
            date: order.created_at,
            description: `Tax on Purchase Order ${order.purchase_order_number || `#${order.id.slice(-8)}`}`,
            reference_number: `TAX-${order.id.slice(-8)}`,
            transaction_type: 'tax',
            debit_amount: 0,
            credit_amount: order.tax_amount,
            balance: 0,
            source_document: 'purchase_order',
            status: 'charged',
            document_id: order.id
          });
        }
      });
    }

    // 2. VENDOR PAYMENTS
    const { data: vendorPayments } = await supabaseAdmin
      .from('vendor_payment_history')
      .select(`
        id,
        payment_date,
        amount,
        payment_method,
        reference_number,
        notes,
        status
      `)
      .eq('vendor_id', supplierId)
      .gte('payment_date', dateFrom || '1900-01-01')
      .lte('payment_date', dateTo || '2100-12-31')
      .order('payment_date', { ascending: false });

    if (vendorPayments) {
      vendorPayments.forEach((payment) => {
        transactions.push({
          id: `vp_${payment.id}`,
          date: payment.payment_date,
          description: `Payment Made - ${payment.payment_method} ${payment.notes ? `(${payment.notes})` : ''}`,
          reference_number: payment.reference_number || `VP-${payment.id.slice(-8)}`,
          transaction_type: 'payment',
          debit_amount: payment.amount || 0,
          credit_amount: 0,
          balance: 0,
          source_document: 'vendor_payment',
          status: payment.status,
          document_id: payment.id
        });
      });
    }

    // 3. EXPENSES related to supplier
    const { data: expenses } = await supabaseAdmin
      .from('expenses')
      .select(`
        id,
        expense_date,
        amount,
        description,
        category,
        payment_method,
        reference_number,
        status
      `)
      .eq('vendor_id', supplierId)
      .gte('expense_date', dateFrom || '1900-01-01')
      .lte('expense_date', dateTo || '2100-12-31')
      .order('expense_date', { ascending: false });

    if (expenses) {
      expenses.forEach((expense) => {
        transactions.push({
          id: `exp_${expense.id}`,
          date: expense.expense_date,
          description: `Expense: ${expense.description} (${expense.category})`,
          reference_number: expense.reference_number || `EXP-${expense.id.slice(-8)}`,
          transaction_type: 'expense',
          debit_amount: 0,
          credit_amount: expense.amount || 0,
          balance: 0,
          source_document: 'expense',
          status: expense.status,
          document_id: expense.id
        });
      });
    }

    // 4. VENDOR BILLS (if separate table exists)
    const { data: vendorBills } = await supabaseAdmin
      .from('vendor_bills')
      .select(`
        id,
        bill_date,
        total_amount,
        bill_number,
        status,
        notes
      `)
      .eq('vendor_id', supplierId)
      .gte('bill_date', dateFrom || '1900-01-01')
      .lte('bill_date', dateTo || '2100-12-31')
      .order('bill_date', { ascending: false });

    if (vendorBills) {
      vendorBills.forEach((bill) => {
        transactions.push({
          id: `vb_${bill.id}`,
          date: bill.bill_date,
          description: `Vendor Bill ${bill.bill_number} - ${bill.notes || 'Bill'}`,
          reference_number: bill.bill_number,
          transaction_type: 'bill',
          debit_amount: 0,
          credit_amount: bill.total_amount || 0,
          balance: 0,
          source_document: 'vendor_bill',
          status: bill.status,
          document_id: bill.id
        });
      });
    }

  } catch (error) {
    console.error('Error fetching supplier transactions:', error);
  }
}

// Employee transactions from payroll and expenses
async function fetchEmployeeTransactions(
  employeeId: string,
  dateFrom: string | null,
  dateTo: string | null,
  transactions: LedgerTransaction[]
) {
  console.log('Fetching employee transactions for:', employeeId);

  try {
    // 1. PAYROLL ENTRIES
    const { data: payrollEntries } = await supabaseAdmin
      .from('payroll_entries')
      .select(`
        id,
        pay_period_start,
        pay_period_end,
        gross_salary,
        deductions,
        net_salary,
        status,
        payment_date
      `)
      .eq('employee_id', employeeId)
      .gte('pay_period_start', dateFrom || '1900-01-01')
      .lte('pay_period_end', dateTo || '2100-12-31')
      .order('pay_period_start', { ascending: false });

    if (payrollEntries) {
      payrollEntries.forEach((payroll) => {
        transactions.push({
          id: `pr_${payroll.id}`,
          date: payroll.payment_date || payroll.pay_period_end,
          description: `Salary Payment - ${payroll.pay_period_start} to ${payroll.pay_period_end}`,
          reference_number: `SAL-${payroll.id.slice(-8)}`,
          transaction_type: 'salary',
          debit_amount: 0,
          credit_amount: payroll.net_salary || 0,
          balance: 0,
          source_document: 'payroll',
          status: payroll.status,
          document_id: payroll.id
        });

        // Add deductions as separate transaction if exists
        if (payroll.deductions && payroll.deductions > 0) {
          transactions.push({
            id: `ded_${payroll.id}`,
            date: payroll.payment_date || payroll.pay_period_end,
            description: `Salary Deductions - ${payroll.pay_period_start} to ${payroll.pay_period_end}`,
            reference_number: `DED-${payroll.id.slice(-8)}`,
            transaction_type: 'deduction',
            debit_amount: payroll.deductions,
            credit_amount: 0,
            balance: 0,
            source_document: 'payroll',
            status: 'deducted',
            document_id: payroll.id
          });
        }
      });
    }

    // 2. EMPLOYEE EXPENSES
    const { data: empExpenses } = await supabaseAdmin
      .from('expenses')
      .select(`
        id,
        expense_date,
        amount,
        description,
        category,
        payment_method,
        reference_number,
        status
      `)
      .eq('employee_id', employeeId)
      .gte('expense_date', dateFrom || '1900-01-01')
      .lte('expense_date', dateTo || '2100-12-31')
      .order('expense_date', { ascending: false });

    if (empExpenses) {
      empExpenses.forEach((expense) => {
        transactions.push({
          id: `emp_exp_${expense.id}`,
          date: expense.expense_date,
          description: `Employee Expense: ${expense.description} (${expense.category})`,
          reference_number: expense.reference_number || `EEXP-${expense.id.slice(-8)}`,
          transaction_type: 'expense',
          debit_amount: expense.amount || 0,
          credit_amount: 0,
          balance: 0,
          source_document: 'employee_expense',
          status: expense.status,
          document_id: expense.id
        });
      });
    }

  } catch (error) {
    console.error('Error fetching employee transactions:', error);
  }
}
