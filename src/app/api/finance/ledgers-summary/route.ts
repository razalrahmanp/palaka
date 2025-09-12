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
  // Payment details for customers
  paid_amount?: number;
  payment_methods?: string;
  bank_accounts?: string;
  last_payment_date?: string;
  // Additional supplier-specific fields
  opening_balance?: number;
  current_stock_value?: number;
  total_bills?: number;
  total_paid?: number;
  total_outstanding?: number;
  total_po_value?: number;
  pending_po_value?: number;
  paid_po_value?: number;
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

    // CUSTOMER LEDGERS
    if (type === 'all' || type === 'customer') {
      console.log('Fetching customer ledgers...');
      const customerLedgers = await getCustomerLedgers(search, hideZeroBalances);
      ledgers.push(...customerLedgers);
    }

    // SUPPLIER LEDGERS
    if (type === 'all' || type === 'supplier') {
      console.log('Fetching supplier ledgers...');
      const supplierLedgers = await getSupplierLedgers(search, hideZeroBalances);
      ledgers.push(...supplierLedgers);
    }

    // EMPLOYEE LEDGERS
    if (type === 'all' || type === 'employee') {
      console.log('Fetching employee ledgers...');
      const employeeLedgers = await getEmployeeLedgers(search, hideZeroBalances);
      ledgers.push(...employeeLedgers);
    }

    const totalCount = ledgers.length;
    const paginatedLedgers = type === 'all' 
      ? ledgers.slice(offset, offset + limit)
      : ledgers;

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

async function getSupplierLedgers(search: string, hideZeroBalances: boolean): Promise<LedgerSummary[]> {
  try {
    console.log('Fetching enhanced supplier ledgers...');
    
    // Base query for suppliers
    let supplierQuery = supabaseAdmin
      .from('suppliers')
      .select('id, name, email, contact, address, created_at')
      .eq('is_deleted', false)
      .order('name');

    if (search) {
      supplierQuery = supplierQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,contact.ilike.%${search}%`);
    }

    const { data: suppliers, error: supplierError } = await supplierQuery;
    
    if (supplierError) {
      console.error('Error fetching suppliers:', supplierError);
      return [];
    }

    if (!suppliers || suppliers.length === 0) {
      console.log('No suppliers found');
      return [];
    }

    console.log(`Found ${suppliers.length} suppliers`);
    const supplierIds = suppliers.map(s => s.id);

    // Fetch opening balances
    const { data: openingBalances, error: openingError } = await supabaseAdmin
      .from('opening_balances')
      .select('entity_id, debit_amount, credit_amount')
      .eq('entity_type', 'supplier')
      .in('entity_id', supplierIds);

    console.log(`Found ${openingBalances?.length || 0} opening balances`);

    // Fetch vendor bills
    const { data: vendorBills, error: billsError } = await supabaseAdmin
      .from('vendor_bills')
      .select('supplier_id, total_amount, paid_amount, remaining_amount, status')
      .in('supplier_id', supplierIds);

    console.log(`Found ${vendorBills?.length || 0} vendor bills`);

    // Fetch purchase orders
    const { data: purchaseOrders, error: poError } = await supabaseAdmin
      .from('purchase_orders')
      .select('supplier_id, total, status, payment_status, paid_amount, created_at')
      .in('supplier_id', supplierIds);

    console.log(`Found ${purchaseOrders?.length || 0} purchase orders`);

    // Fetch inventory stock value
    const { data: inventoryStock, error: inventoryError } = await supabaseAdmin
      .from('inventory_items')
      .select(`
        supplier_id,
        quantity,
        product_id,
        products(cost, name)
      `)
      .in('supplier_id', supplierIds)
      .gt('quantity', 0);

    console.log(`Found ${inventoryStock?.length || 0} inventory items`);
    
    // Log any errors
    if (openingError) console.error('Opening balances error:', openingError);
    if (billsError) console.error('Vendor bills error:', billsError);
    if (poError) console.error('Purchase orders error:', poError);
    if (inventoryError) console.error('Inventory error:', inventoryError);

    // Calculate financial data for each supplier
    const ledgers: LedgerSummary[] = suppliers.map(supplier => {
      // Calculate opening balance
      const openingBalance = openingBalances?.find(ob => ob.entity_id === supplier.id);
      const openingDebit = openingBalance?.debit_amount || 0;
      const openingCredit = openingBalance?.credit_amount || 0;
      const netOpeningBalance = openingDebit - openingCredit;

      // Calculate vendor bills
      const supplierBills = vendorBills?.filter(vb => vb.supplier_id === supplier.id) || [];
      const totalBillAmount = supplierBills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
      const totalPaidAmount = supplierBills.reduce((sum, bill) => sum + (bill.paid_amount || 0), 0);
      const totalOutstanding = supplierBills.reduce((sum, bill) => sum + (bill.remaining_amount || 0), 0);

      // Calculate purchase order values
      const supplierPOs = purchaseOrders?.filter(po => po.supplier_id === supplier.id) || [];
      const totalPOValue = supplierPOs.reduce((sum, po) => sum + (po.total || 0), 0);
      const paidPOValue = supplierPOs.reduce((sum, po) => sum + (po.paid_amount || 0), 0);
      const pendingPOValue = supplierPOs
        .filter(po => po.status !== 'completed' && po.payment_status !== 'paid')
        .reduce((sum, po) => sum + ((po.total || 0) - (po.paid_amount || 0)), 0);

      // Calculate current stock value
      const supplierInventory = inventoryStock?.filter(inv => inv.supplier_id === supplier.id) || [];
      const currentStockValue = supplierInventory.reduce((sum, item) => {
        const products = item.products as { cost?: number; name?: string } | null;
        const productCost = products?.cost || 0;
        const itemValue = productCost * (item.quantity || 0);
        return sum + itemValue;
      }, 0);

      // Calculate total transactions count
      const transactionCount = supplierBills.length + supplierPOs.length;
      
      // Calculate balance due
      const balanceDue = netOpeningBalance + totalOutstanding;

      return {
        id: supplier.id,
        name: supplier.name || 'Unnamed Supplier',
        type: 'supplier' as const,
        email: supplier.email,
        phone: supplier.contact,
        total_transactions: transactionCount,
        total_amount: netOpeningBalance + totalBillAmount,
        balance_due: balanceDue,
        last_transaction_date: supplier.created_at,
        status: balanceDue > 0 ? 'outstanding' : balanceDue < 0 ? 'overpaid' : 'current',
        // Additional supplier-specific data
        opening_balance: netOpeningBalance,
        current_stock_value: currentStockValue,
        total_bills: totalBillAmount,
        total_paid: totalPaidAmount,
        total_outstanding: totalOutstanding,
        total_po_value: totalPOValue,
        pending_po_value: pendingPOValue,
        paid_po_value: paidPOValue
      };
    });

    // Filter out zero balances if requested
    const filteredLedgers = hideZeroBalances 
      ? ledgers.filter(ledger => 
          Math.abs(ledger.balance_due) > 0.01 || 
          Math.abs(ledger.total_amount) > 0.01 ||
          Math.abs(ledger.current_stock_value || 0) > 0.01 ||
          Math.abs(ledger.total_po_value || 0) > 0.01
        )
      : ledgers;

    console.log(`Processed ${filteredLedgers.length} supplier ledgers`);
    return filteredLedgers;

  } catch (error) {
    console.error('Error fetching supplier ledgers:', error);
    return [];
  }
}

async function getCustomerLedgers(search: string, hideZeroBalances: boolean): Promise<LedgerSummary[]> {
  try {
    console.log('Fetching customer ledgers...');
    
    // Base query for customers
    let customerQuery = supabaseAdmin
      .from('customers')
      .select('id, name, email, phone, address, created_at')
      .order('name');

    if (search) {
      customerQuery = customerQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: customers, error: customerError } = await customerQuery;
    
    if (customerError) {
      console.error('Error fetching customers:', customerError);
      return [];
    }

    if (!customers || customers.length === 0) {
      console.log('No customers found');
      return [];
    }

    console.log(`Found ${customers.length} customers`);
    
    // Get sales orders for transaction data
    const { data: salesOrders, error: salesError } = await supabaseAdmin
      .from('sales_orders')
      .select('id, customer_id, final_price, grand_total, created_at, status');

    if (salesError) {
      console.log('Error fetching sales orders for customers:', salesError);
    }

    // Get invoices to link sales orders to payments
    const { data: invoices, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('id, sales_order_id, customer_id, total, paid_amount, status');

    if (invoiceError) {
      console.log('Error fetching invoices for customers:', invoiceError);
    }

    // Get payments linked to invoices with payment details
    const { data: payments, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('invoice_id, amount, payment_date, created_at, method, bank_account_id, reference, description');

    if (paymentError) {
      console.log('Error fetching payments for customers:', paymentError);
    }

    // Get bank accounts for payment details
    const { data: bankAccounts, error: bankError } = await supabaseAdmin
      .from('bank_accounts')
      .select('id, name, account_number, account_type, upi_id');

    if (bankError) {
      console.log('Error fetching bank accounts:', bankError);
    }

    // Get bank transactions that might be related to customer payments
    const { data: bankTransactions, error: bankTransError } = await supabaseAdmin
      .from('bank_transactions')
      .select('id, bank_account_id, date, type, amount, description, reference')
      .eq('type', 'deposit');

    if (bankTransError) {
      console.log('Error fetching bank transactions:', bankTransError);
    }

    console.log(`Found ${customers?.length || 0} customers, ${salesOrders?.length || 0} sales orders, ${invoices?.length || 0} invoices, ${payments?.length || 0} payments, ${bankAccounts?.length || 0} bank accounts`);

    // Convert customers to ledger format with transaction data
    const ledgers: LedgerSummary[] = customers.map(customer => {
      // Get customer's sales orders
      const customerOrders = salesOrders?.filter(order => order.customer_id === customer.id) || [];
      
      // Get customer's invoices (both from sales_order link and direct customer link)
      const customerInvoices = invoices?.filter(invoice => 
        invoice.customer_id === customer.id || 
        customerOrders.some(order => order.id === invoice.sales_order_id)
      ) || [];
      
      // Calculate totals
      const totalOrderValue = customerOrders.reduce((sum, order) => sum + (order.final_price || order.grand_total || 0), 0);
      const totalInvoiceValue = customerInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
      const totalPaidFromInvoices = customerInvoices.reduce((sum, invoice) => sum + (invoice.paid_amount || 0), 0);
      
      // Get payments through invoices with details
      const customerPayments = payments?.filter(payment => 
        customerInvoices.some(invoice => invoice.id === payment.invoice_id)
      ) || [];
      
      const totalDirectPayments = customerPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      
      // Get payment methods and bank accounts (including from bank transactions)
      const paymentMethods = [...new Set(customerPayments.map(p => p.method).filter(Boolean))];
      
      // Add potential payment methods from bank transactions (matching customer name or reference)
      const customerNameLower = customer.name.toLowerCase();
      const relatedBankTransactions = bankTransactions?.filter(bt => 
        bt.description?.toLowerCase().includes(customerNameLower) ||
        bt.reference?.toLowerCase().includes(customerNameLower)
      ) || [];
      
      // If we found related bank transactions, add "Bank Transfer" as payment method
      if (relatedBankTransactions.length > 0) {
        paymentMethods.push('Bank Transfer');
      }
      
      const bankAccountIds = [...new Set([
        ...customerPayments.map(p => p.bank_account_id).filter(Boolean),
        ...relatedBankTransactions.map(bt => bt.bank_account_id).filter(Boolean)
      ])];
      const bankAccountNames = bankAccountIds.map(id => {
        const account = bankAccounts?.find(acc => acc.id === id);
        if (account) {
          // Format account display based on type
          if (account.account_type === 'UPI' && account.upi_id) {
            return `UPI: ${account.upi_id}`;
          } else if (account.account_type === 'CASH') {
            return `Cash: ${account.name}`;
          } else {
            return `${account.name} (${account.account_number || 'No Account #'})`;
          }
        }
        return 'Unknown Account';
      });
      
      // Get last payment date
      const lastPayment = customerPayments.sort((a, b) => 
        new Date(b.payment_date || b.created_at).getTime() - new Date(a.payment_date || a.created_at).getTime()
      )[0];
      
      const lastPaymentDate = lastPayment ? (lastPayment.payment_date || lastPayment.created_at) : undefined;
      
      // Calculate outstanding balance (use the higher of order value or invoice value, minus payments)
      const totalOrdersOrInvoices = Math.max(totalOrderValue, totalInvoiceValue);
      const totalPayments = Math.max(totalPaidFromInvoices, totalDirectPayments);
      const balanceDue = totalOrdersOrInvoices - totalPayments;
      
      // Get last transaction date
      const allTransactionDates = [
        ...customerOrders.map(o => o.created_at),
        ...customerPayments.map(p => p.created_at || p.payment_date)
      ].filter(Boolean);
      
      const lastTransactionDate = allTransactionDates.length > 0 
        ? allTransactionDates.sort().reverse()[0]
        : customer.created_at;

      return {
        id: customer.id,
        name: customer.name,
        type: 'customer' as const,
        email: customer.email,
        phone: customer.phone,
        total_transactions: customerOrders.length + customerPayments.length,
        total_amount: totalOrdersOrInvoices,
        balance_due: balanceDue,
        paid_amount: totalPayments,
        payment_methods: paymentMethods.length > 0 ? paymentMethods.join(', ') : (totalPayments > 0 ? 'Unknown Method' : 'No payments'),
        bank_accounts: bankAccountNames.length > 0 ? bankAccountNames.join(', ') : (totalPayments > 0 ? 'Unknown Bank' : 'No bank records'),
        last_payment_date: lastPaymentDate,
        last_transaction_date: lastTransactionDate,
        status: balanceDue <= 0 ? 'paid' : (totalPayments > 0 ? 'partial' : 'pending')
      };
    });

    console.log(`Processed ${ledgers.length} customer ledgers with transaction data`);
    
    // Apply hideZeroBalances filter if needed
    if (hideZeroBalances) {
      return ledgers.filter(ledger => ledger.balance_due > 0);
    }
    
    return ledgers;

  } catch (error) {
    console.error('Error fetching customer ledgers:', error);
    return [];
  }
}

async function getEmployeeLedgers(search: string, hideZeroBalances: boolean): Promise<LedgerSummary[]> {
  try {
    console.log('Fetching employee ledgers...');
    
    // Check if employees table exists by trying to fetch from it
    const { error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, name, email, phone, salary, position, department, created_at')
      .order('name')
      .limit(1);

    if (employeeError) {
      console.log('Employees table not found or accessible:', employeeError.message);
      return [];
    }

    // If table exists, get all employees
    let employeeQuery = supabaseAdmin
      .from('employees')
      .select('id, name, email, phone, salary, position, department, created_at')
      .order('name');

    if (search) {
      employeeQuery = employeeQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,position.ilike.%${search}%`);
    }

    const { data: allEmployees, error: allEmployeesError } = await employeeQuery;
    
    if (allEmployeesError) {
      console.error('Error fetching all employees:', allEmployeesError);
      return [];
    }

    if (!allEmployees || allEmployees.length === 0) {
      console.log('No employees found');
      return [];
    }

    console.log(`Found ${allEmployees.length} employees`);
    
    // Convert employees to ledger format with salary information
    const ledgers: LedgerSummary[] = allEmployees.map(employee => {
      const monthlySalary = employee.salary || 0;
      const annualSalary = monthlySalary * 12;
      
      return {
        id: employee.id,
        name: `${employee.name}${employee.position ? ` (${employee.position})` : ''}`,
        type: 'employee' as const,
        email: employee.email,
        phone: employee.phone,
        total_transactions: 0, // Could be enhanced with payroll transactions
        total_amount: annualSalary,
        balance_due: monthlySalary, // Current month salary
        last_transaction_date: employee.created_at,
        status: 'active'
      };
    });

    console.log(`Processed ${ledgers.length} employee ledgers`);
    
    // Apply hideZeroBalances filter if needed
    if (hideZeroBalances) {
      return ledgers.filter(ledger => ledger.balance_due > 0);
    }
    
    return ledgers;

  } catch (error) {
    console.error('Error fetching employee ledgers:', error);
    return [];
  }
}
