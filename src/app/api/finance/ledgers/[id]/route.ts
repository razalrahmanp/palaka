import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

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
        // Use original_price as the invoice amount (before discount)
        const billAmount = order.original_price || order.final_price || 0;
        
        transactions.push({
          id: `so_${order.id}`,
          date: order.created_at,
          description: `Sales Order #${index + 1} - ${order.notes || 'Sale'}`,
          reference_number: `SO-${order.id.slice(-8)}`,
          transaction_type: 'invoice',
          debit_amount: billAmount,
          credit_amount: 0,
          balance: 0,
          source_document: 'sales_order',
          status: order.status,
          document_id: order.id
        });

        // Add discount as separate credit transaction if exists
        if (order.discount_amount && order.discount_amount > 0) {
          transactions.push({
            id: `disc_${order.id}`,
            date: order.created_at,
            description: `Discount Applied on Sales Order #${index + 1}`,
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

    // 2. PAYMENTS RECEIVED (through invoices for sales orders)
    let payments = null;
    
    console.log(`Searching for payments for customer: ${customerId} through invoices...`);
    
    if (salesOrders && salesOrders.length > 0) {
      const salesOrderIds = salesOrders.map(order => order.id);
      
      // First get all invoices for this customer's sales orders
      const { data: invoices, error: invoicesError } = await supabaseAdmin
        .from('invoices')
        .select('id, sales_order_id')
        .in('sales_order_id', salesOrderIds);
      
      if (invoicesError) {
        console.error('Error fetching invoices for payments:', invoicesError);
      } else if (invoices && invoices.length > 0) {
        console.log(`Found ${invoices.length} invoices for customer sales orders`);
        
        // Now get payments for these invoices
        const { data: paymentsData, error: paymentsError } = await supabaseAdmin
          .from('payments')
          .select(`
            id,
            payment_date,
            amount,
            method,
            reference,
            description,
            invoice_id
          `)
          .in('invoice_id', invoices.map(inv => inv.id))
          .order('id', { ascending: false }); // Order by ID since payment_date might be null

        if (paymentsError) {
          console.error('Error fetching payment transactions:', paymentsError);
        } else {
          console.log(`Found ${paymentsData?.length || 0} payment transactions for customer ${customerId}`);
          
          // Filter by date range if payment_date is not null
          if (paymentsData && paymentsData.length > 0) {
            const filteredPayments = paymentsData.filter(payment => {
              // Include payments with null payment_date or within date range
              if (!payment.payment_date) return true;
              
              const paymentDate = new Date(payment.payment_date);
              const fromDate = dateFrom ? new Date(dateFrom) : new Date('1900-01-01');
              const toDate = dateTo ? new Date(dateTo) : new Date('2100-12-31');
              
              return paymentDate >= fromDate && paymentDate <= toDate;
            });
            payments = filteredPayments;
            console.log(`After date filtering: ${payments.length} payment transactions`);
          } else {
            payments = paymentsData;
          }
        }
      }
    }

    if (payments) {
      payments.forEach((payment) => {
        // Use current date if payment_date is null
        const paymentDate = payment.payment_date || new Date().toISOString();
        
        transactions.push({
          id: `pay_${payment.id}`,
          date: paymentDate,
          description: `Payment Received - ${payment.method}${payment.reference ? ` (Ref: ${payment.reference})` : ''}${payment.description ? ` - ${payment.description}` : ''}`,
          reference_number: payment.reference || `PAY-${payment.id.slice(-8)}`,
          transaction_type: 'payment',
          debit_amount: 0,
          credit_amount: payment.amount || 0,
          balance: 0,
          source_document: 'payment',
          status: 'received',
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
      .eq('supplier_id', supplierId)
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
      .eq('entity_id', supplierId)
      .eq('entity_type', 'supplier')
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
        description
      `)
      .eq('supplier_id', supplierId)
      .gte('bill_date', dateFrom || '1900-01-01')
      .lte('bill_date', dateTo || '2100-12-31')
      .order('bill_date', { ascending: false });

    if (vendorBills) {
      vendorBills.forEach((bill) => {
        transactions.push({
          id: `vb_${bill.id}`,
          date: bill.bill_date,
          description: `Vendor Bill ${bill.bill_number} - ${bill.description || 'Bill'}`,
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

    // 2. EMPLOYEE EXPENSES (from expenses table)
    const { data: empExpenses } = await supabaseAdmin
      .from('expenses')
      .select(`
        id,
        date,
        amount,
        description,
        category,
        payment_method,
        created_at
      `)
      .eq('entity_type', 'employee')
      .eq('entity_id', employeeId)
      .gte('date', dateFrom || '1900-01-01')
      .lte('date', dateTo || '2100-12-31')
      .order('date', { ascending: false });

    if (empExpenses) {
      empExpenses.forEach((expense) => {
        transactions.push({
          id: `emp_exp_${expense.id}`,
          date: expense.date,
          description: expense.description || `${expense.category} Expense`,
          reference_number: `EXP-${expense.id.slice(-8)}`,
          transaction_type: 'salary_expense',
          debit_amount: expense.amount || 0,
          credit_amount: 0,
          balance: 0,
          source_document: 'employee_salary',
          status: 'paid',
          document_id: expense.id
        });
      });
    }

    // 3. PAYROLL RECORDS (from payroll_records table)
    const { data: payrollRecords } = await supabaseAdmin
      .from('payroll_records')
      .select(`
        id,
        pay_period_start,
        pay_period_end,
        gross_salary,
        net_salary,
        overtime_amount,
        bonus,
        status,
        processed_at
      `)
      .eq('employee_id', employeeId)
      .gte('pay_period_start', dateFrom || '1900-01-01')
      .lte('pay_period_end', dateTo || '2100-12-31')
      .order('pay_period_start', { ascending: false });

    if (payrollRecords) {
      payrollRecords.forEach((payroll) => {
        transactions.push({
          id: `payroll_${payroll.id}`,
          date: payroll.processed_at?.split('T')[0] || payroll.pay_period_end,
          description: `Payroll: ${payroll.pay_period_start} to ${payroll.pay_period_end}${payroll.overtime_amount ? ` (OT: ₹${payroll.overtime_amount})` : ''}`,
          reference_number: `PAY-${payroll.id.slice(-8)}`,
          transaction_type: 'payroll',
          debit_amount: payroll.net_salary || 0,
          credit_amount: 0,
          balance: 0,
          source_document: 'payroll_record',
          status: payroll.status,
          document_id: payroll.id
        });
      });
    }

  } catch (error) {
    console.error('Error fetching employee transactions:', error);
  }
}
