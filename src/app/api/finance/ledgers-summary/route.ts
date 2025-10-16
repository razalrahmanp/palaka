import { NextResponse, NextRequest } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

interface LedgerSummary {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'employee' | 'bank' | 'product' | 'investors' | 'loans' | 'sales_returns' | 'purchase_returns';
  email?: string;
  phone?: string;
  total_transactions: number;
  total_amount: number;
  debit?: number;
  credit?: number;
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
  // Investor/Partner specific fields
  partner_type?: string;
  equity_percentage?: number;
  total_investments?: number;
  total_withdrawals?: number;
  net_equity?: number;
  // Loan specific fields
  loan_type?: string;
  original_amount?: number;
  current_balance?: number;
  emi_amount?: number;
  interest_rate?: number;
  loan_tenure_months?: number;
  // Bank account specific fields
  account_number?: string;
  account_type?: string;
  current_balance_amount?: number;
  upi_id?: string;
  // Returns specific fields
  return_number?: string;
  return_date?: string;
  return_type?: string;
  return_value?: number;
  return_count?: number;
  approved_returns?: number;
  pending_returns?: number;
  // Employee payment type breakdowns
  salary_amount?: number;
  incentive_amount?: number;
  bonus_amount?: number;
  overtime_amount?: number;
  allowance_amount?: number;
  reimbursement_amount?: number;
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

    let ledgers: LedgerSummary[] = [];
    let totalCount = 0;

    // OPTIMIZED: Fetch only the requested type with database-level pagination
    if (type === 'customer') {
      const result = await getCustomerLedgersPaginated(search, hideZeroBalances, limit, offset);
      ledgers = result.data;
      totalCount = result.total;
    } else if (type === 'supplier') {
      const result = await getSupplierLedgersPaginated(search, hideZeroBalances, limit, offset);
      ledgers = result.data;
      totalCount = result.total;
    } else if (type === 'employee') {
      const result = await getEmployeeLedgersPaginated(search, hideZeroBalances, limit, offset);
      ledgers = result.data;
      totalCount = result.total;
    } else if (type === 'investors') {
      const result = await getInvestorLedgersPaginated(search, hideZeroBalances, limit, offset);
      ledgers = result.data;
      totalCount = result.total;
    } else if (type === 'loans') {
      const result = await getLoansLedgersPaginated(search, hideZeroBalances, limit, offset);
      ledgers = result.data;
      totalCount = result.total;
    } else if (type === 'banks' || type === 'bank') {
      const result = await getBankLedgersPaginated(search, hideZeroBalances, limit, offset);
      ledgers = result.data;
      totalCount = result.total;
    } else if (type === 'sales_returns') {
      const result = await getSalesReturnsLedgersPaginated(search, hideZeroBalances, limit, offset);
      ledgers = result.data;
      totalCount = result.total;
    } else if (type === 'purchase_returns') {
      const result = await getPurchaseReturnsLedgersPaginated(search, hideZeroBalances, limit, offset);
      ledgers = result.data;
      totalCount = result.total;
    } else if (type === 'all') {
      // For 'all' type, fetch from all sources (this will still be slower)
      const [customers, suppliers, employees, investors, loans, banks, salesReturns, purchaseReturns] = await Promise.all([
        getCustomerLedgers(search, hideZeroBalances),
        getSupplierLedgers(search, hideZeroBalances),
        getEmployeeLedgers(search, hideZeroBalances),
        getInvestorLedgers(search, hideZeroBalances),
        getLoansLedgers(search, hideZeroBalances),
        getBankLedgers(search, hideZeroBalances),
        getSalesReturnsLedgers(search, hideZeroBalances),
        getPurchaseReturnsLedgers(search, hideZeroBalances)
      ]);
      
      ledgers = [...customers, ...suppliers, ...employees, ...investors, ...loans, ...banks, ...salesReturns, ...purchaseReturns];
      totalCount = ledgers.length;
      ledgers = ledgers.slice(offset, offset + limit);
    }

    console.log(`Returning ${ledgers.length} ledgers out of ${totalCount} total`);

    return NextResponse.json({
      success: true,
      data: ledgers,
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
    
    // Convert employees to ledger format with proper debit/credit accounting
    const ledgers: LedgerSummary[] = [];
    
    for (const employee of allEmployees) {
      // Get payroll records by payment type
      const { data: payrollRecords } = await supabaseAdmin
        .from('payroll_records')
        .select('net_salary, payment_type, processed_at')
        .eq('employee_id', employee.id);
      
      // Calculate credit amounts by payment type
      const salaryPayments = payrollRecords?.filter(p => p.payment_type === 'salary') || [];
      const totalSalary = salaryPayments.reduce((sum, p) => sum + (p.net_salary || 0), 0);
      
      const totalCredit = payrollRecords?.reduce((sum, pr) => sum + (pr.net_salary || 0), 0) || 0;
      
      // Calculate debit amounts (expected salary based on employee salary and months worked)
      const hireDate = new Date(employee.created_at);
      const currentDate = new Date();
      const monthsWorked = Math.max(1, Math.floor((currentDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const monthlySalary = parseFloat(employee.salary) || 25000;
      const expectedTotalSalary = Math.min(monthsWorked, 12) * monthlySalary; // Cap at 12 months for realistic estimates
      const totalDebit = expectedTotalSalary;
      
      // Balance = Debit - Salary only (excludes incentive, bonus, overtime from balance calculation)
      // Can be negative if salary paid exceeds expected salary
      const balanceDue = totalDebit - totalSalary;
      
      // Get latest transaction date from payroll records
      const allDates = [
        ...(payrollRecords?.map(pr => pr.processed_at?.split('T')[0]) || [])
      ].filter(Boolean);
      
      const lastTransactionDate = allDates.length > 0 
        ? allDates.sort().reverse()[0] 
        : employee.created_at;
      
      const transactionCount = payrollRecords?.length || 0;
      
      ledgers.push({
        id: employee.id,
        name: `${employee.name}${employee.position ? ` (${employee.position})` : ''}`,
        type: 'employee' as const,
        email: employee.email,
        phone: employee.phone,
        total_transactions: transactionCount,
        total_amount: totalDebit, // Expected total salary (debit)
        debit: totalDebit, // Expected salary amount
        credit: totalCredit, // Actual payments made
        paid_amount: totalCredit, // Total payments made (credit)
        balance_due: balanceDue, // Outstanding amount we owe
        last_transaction_date: lastTransactionDate,
        status: balanceDue > 0 ? 'pending' : 'settled'
      });
    }

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

async function getInvestorLedgers(search: string, hideZeroBalances: boolean): Promise<LedgerSummary[]> {
  try {
    console.log('Fetching investor/partner ledgers...');
    
    // First, check if partners table exists
    const { error: testError } = await supabaseAdmin
      .from('partners')
      .select('id')
      .limit(1);

    if (testError) {
      console.log('Partners table not found or accessible:', testError.message);
      return [];
    }

    // Base query for partners
    let partnerQuery = supabaseAdmin
      .from('partners')
      .select('id, name, email, phone, partner_type, initial_investment, equity_percentage, is_active, created_at')
      .eq('is_active', true)
      .order('name');

    if (search) {
      partnerQuery = partnerQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,partner_type.ilike.%${search}%`);
    }

    const { data: partners, error: partnerError } = await partnerQuery;
    
    if (partnerError) {
      console.error('Error fetching partners:', partnerError);
      return [];
    }

    if (!partners || partners.length === 0) {
      console.log('No partners found');
      return [];
    }

    console.log(`Found ${partners.length} partners/investors`);
    const partnerIds = partners.map(p => p.id);

    // Fetch investments
    const { data: investments, error: investmentError } = await supabaseAdmin
      .from('investments')
      .select('partner_id, amount, investment_date, description, payment_method')
      .in('partner_id', partnerIds);

    // Fetch withdrawals (include withdrawal_type to discriminate capital from profit/interest)
    const { data: withdrawals, error: withdrawalError } = await supabaseAdmin
      .from('withdrawals')
      .select('partner_id, amount, withdrawal_date, description, payment_method, withdrawal_type')
      .in('partner_id', partnerIds);

    console.log(`Found ${investments?.length || 0} investments, ${withdrawals?.length || 0} withdrawals`);
    
    if (investmentError) console.error('Investment error:', investmentError);
    if (withdrawalError) console.error('Withdrawal error:', withdrawalError);

    // Calculate financial data for each partner
    const ledgers: LedgerSummary[] = partners.map(partner => {
      // Calculate investments
      const partnerInvestments = investments?.filter(inv => inv.partner_id === partner.id) || [];
      const totalInvestments = partnerInvestments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
      
      // Calculate withdrawals
      const partnerWithdrawals = withdrawals?.filter(wd => wd.partner_id === partner.id) || [];
      const totalWithdrawals = partnerWithdrawals.reduce((sum, wd) => sum + (wd.amount || 0), 0);
      
      // Break down withdrawals by type
      const capitalWithdrawals = partnerWithdrawals
        .filter(wd => wd.withdrawal_type === 'capital_withdrawal' || !wd.withdrawal_type)
        .reduce((sum, wd) => sum + (wd.amount || 0), 0);
      
      const profitDistributions = partnerWithdrawals
        .filter(wd => wd.withdrawal_type === 'profit_distribution')
        .reduce((sum, wd) => sum + (wd.amount || 0), 0);
      
      const interestPayments = partnerWithdrawals
        .filter(wd => wd.withdrawal_type === 'interest_payment')
        .reduce((sum, wd) => sum + (wd.amount || 0), 0);
      
      // Calculate current balance (investments minus only capital withdrawals)
      // (profit distributions and interest payments don't reduce investment balance)
      const currentBalance = totalInvestments - capitalWithdrawals;
      
      // Get total transactions count
      const totalTransactions = partnerInvestments.length + partnerWithdrawals.length;
      
      // Get last transaction date
      const allTransactionDates = [
        ...partnerInvestments.map(inv => inv.investment_date),
        ...partnerWithdrawals.map(wd => wd.withdrawal_date)
      ].filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      const lastTransactionDate = allTransactionDates[0] || partner.created_at;
      
      return {
        id: partner.id.toString(),
        name: `${partner.name}${partner.partner_type ? ` (${partner.partner_type})` : ''}`,
        type: 'investors' as const,
        email: partner.email,
        phone: partner.phone,
        total_transactions: totalTransactions,
        total_amount: totalInvestments + totalWithdrawals,
        balance_due: currentBalance, // Use currentBalance to match transaction ledger
        last_transaction_date: lastTransactionDate,
        status: partner.is_active ? 'active' : 'inactive',
        partner_type: partner.partner_type,
        equity_percentage: partner.equity_percentage,
        total_investments: totalInvestments,
        total_withdrawals: totalWithdrawals,
        capital_withdrawals: capitalWithdrawals,
        profit_distributions: profitDistributions,
        interest_payments: interestPayments,
        net_equity: currentBalance // Use currentBalance for consistency
      };
    });

    console.log(`Processed ${ledgers.length} investor/partner ledgers`);
    
    // Apply hideZeroBalances filter if needed
    if (hideZeroBalances) {
      return ledgers.filter(ledger => ledger.balance_due !== 0);
    }
    
    return ledgers;

  } catch (error) {
    console.error('Error fetching investor/partner ledgers:', error);
    return [];
  }
}

async function getLoansLedgers(search: string, hideZeroBalances: boolean): Promise<LedgerSummary[]> {
  try {
    console.log('Fetching loan ledgers...');
    
    // Base query for loans
    let loanQuery = supabaseAdmin
      .from('loan_opening_balances')
      .select('id, loan_name, bank_name, loan_type, loan_number, original_loan_amount, opening_balance, current_balance, interest_rate, loan_tenure_months, emi_amount, loan_start_date, loan_end_date, status, description, created_at')
      .order('loan_name');

    if (search) {
      loanQuery = loanQuery.or(`loan_name.ilike.%${search}%,bank_name.ilike.%${search}%,loan_number.ilike.%${search}%,loan_type.ilike.%${search}%`);
    }

    const { data: loans, error: loanError } = await loanQuery;
    
    if (loanError) {
      console.error('Error fetching loans:', loanError);
      return [];
    }

    if (!loans || loans.length === 0) {
      console.log('No loans found');
      return [];
    }

    console.log(`Found ${loans.length} loans`);
    const loanIds = loans.map(l => l.id);

    // Fetch liability payments for these loans
    const { data: payments, error: paymentError } = await supabaseAdmin
      .from('liability_payments')
      .select('loan_id, date, principal_amount, interest_amount, total_amount, description, payment_method')
      .in('loan_id', loanIds)
      .order('date', { ascending: false });

    console.log(`Found ${payments?.length || 0} liability payments`);
    
    if (paymentError) console.error('Payment error:', paymentError);

    // Calculate financial data for each loan
    const ledgers: LedgerSummary[] = loans.map(loan => {
      // Calculate payments
      const loanPayments = payments?.filter(pay => pay.loan_id === loan.id) || [];
      const totalPayments = loanPayments.reduce((sum, pay) => sum + (pay.total_amount || 0), 0);
      const totalPrincipalPaid = loanPayments.reduce((sum, pay) => sum + (pay.principal_amount || 0), 0);
      
      // Calculate remaining balance (original amount - principal paid)
      const originalAmount = loan.original_loan_amount || 0;
      const currentBalance = originalAmount - totalPrincipalPaid;
      
      // Get last payment date
      const lastPayment = loanPayments[0]; // Already sorted by date desc
      const lastPaymentDate = lastPayment?.date || loan.created_at;
      
      return {
        id: loan.id,
        name: `${loan.loan_name}${loan.bank_name ? ` - ${loan.bank_name}` : ''}`,
        type: 'loans' as const,
        total_transactions: loanPayments.length,
        total_amount: originalAmount,
        debit: originalAmount, // Original loan amount
        credit: totalPayments, // Total payments made
        balance_due: currentBalance, // Remaining balance
        paid_amount: totalPayments, // Total payments (for consistency with other ledger types)
        last_transaction_date: lastPaymentDate,
        status: currentBalance > 0 ? 'active' : 'closed',
        loan_type: loan.loan_type,
        original_amount: originalAmount,
        current_balance: currentBalance,
        emi_amount: loan.emi_amount,
        interest_rate: loan.interest_rate,
        loan_tenure_months: loan.loan_tenure_months,
        total_paid: totalPayments
      };
    });

    console.log(`Processed ${ledgers.length} loan ledgers`);
    
    // Apply hideZeroBalances filter if needed
    if (hideZeroBalances) {
      return ledgers.filter(ledger => ledger.balance_due > 0);
    }
    
    return ledgers;

  } catch (error) {
    console.error('Error fetching loan ledgers:', error);
    return [];
  }
}

async function getBankLedgers(search: string, hideZeroBalances: boolean): Promise<LedgerSummary[]> {
  try {
    console.log('Fetching bank account ledgers...');
    
    // Base query for bank accounts
    let bankQuery = supabaseAdmin
      .from('bank_accounts')
      .select('id, name, account_number, current_balance, currency, account_type, upi_id, is_active, created_at')
      .eq('is_active', true)
      .order('name');

    if (search) {
      bankQuery = bankQuery.or(`name.ilike.%${search}%,account_number.ilike.%${search}%,upi_id.ilike.%${search}%`);
    }

    const { data: bankAccounts, error: bankError } = await bankQuery;
    
    if (bankError) {
      console.error('Error fetching bank accounts:', bankError);
      return [];
    }

    if (!bankAccounts || bankAccounts.length === 0) {
      console.log('No bank accounts found');
      return [];
    }

    console.log(`Found ${bankAccounts.length} bank accounts`);
    const bankAccountIds = bankAccounts.map(b => b.id);

    // Fetch bank transactions for these accounts
    const { data: transactions, error: transactionError } = await supabaseAdmin
      .from('bank_transactions')
      .select('bank_account_id, date, type, amount, description, reference')
      .in('bank_account_id', bankAccountIds)
      .order('date', { ascending: false });

    console.log(`Found ${transactions?.length || 0} bank transactions`);
    
    if (transactionError) console.error('Transaction error:', transactionError);

    // Calculate financial data for each bank account
    const ledgers: LedgerSummary[] = bankAccounts.map(account => {
      // Calculate transactions
      const accountTransactions = transactions?.filter(tx => tx.bank_account_id === account.id) || [];
      const totalDeposits = accountTransactions
        .filter(tx => tx.type === 'deposit')
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);
      const totalWithdrawals = accountTransactions
        .filter(tx => tx.type === 'withdrawal')
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);
      
      // Get last transaction date
      const lastTransaction = accountTransactions[0]; // Already sorted by date desc
      const lastTransactionDate = lastTransaction?.date || account.created_at;
      
      // Format account display name
      let displayName = account.name;
      if (account.account_type === 'UPI' && account.upi_id) {
        displayName += ` (UPI: ${account.upi_id})`;
      } else if (account.account_number) {
        displayName += ` (${account.account_number})`;
      }
      
      return {
        id: account.id,
        name: displayName,
        type: 'bank' as const,
        total_transactions: accountTransactions.length,
        total_amount: totalDeposits + totalWithdrawals,
        balance_due: account.current_balance || 0,
        last_transaction_date: lastTransactionDate,
        status: account.is_active ? 'active' : 'inactive',
        account_number: account.account_number,
        account_type: account.account_type,
        current_balance_amount: account.current_balance,
        upi_id: account.upi_id,
        phone: account.account_number // Using phone field for account number display
      };
    });

    console.log(`Processed ${ledgers.length} bank account ledgers`);
    
    // Apply hideZeroBalances filter if needed
    if (hideZeroBalances) {
      return ledgers.filter(ledger => ledger.balance_due !== 0);
    }
    
    return ledgers;

  } catch (error) {
    console.error('Error fetching bank account ledgers:', error);
    return [];
  }
}

// ==================== OPTIMIZED PAGINATED FUNCTIONS ====================

async function getCustomerLedgersPaginated(
  search: string,
  hideZeroBalances: boolean,
  limit: number,
  offset: number
): Promise<{ data: LedgerSummary[]; total: number }> {
  try {
    console.log('Fetching customer ledgers (paginated)...');
    
    // Build base query
    let customerQuery = supabaseAdmin
      .from('customers')
      .select('id, name, email, phone', { count: 'exact' });

    if (search) {
      customerQuery = customerQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Get total count first
    const { count } = await customerQuery;
    const total = count || 0;

    // Now fetch paginated data
    customerQuery = supabaseAdmin
      .from('customers')
      .select('id, name, email, phone')
      .order('name')
      .range(offset, offset + limit - 1);

    if (search) {
      customerQuery = customerQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: customers, error } = await customerQuery;

    if (error || !customers) {
      console.error('Error fetching customers:', error);
      return { data: [], total: 0 };
    }

    console.log(`Found ${customers.length} customers for page (total: ${total})`);

    // Fetch aggregated data for these specific customers only
    const customerIds = customers.map(c => c.id);
    
    const [salesOrders, invoices, payments, returns, refunds] = await Promise.all([
      supabaseAdmin
        .from('sales_orders')
        .select('id, customer_id, final_price, grand_total')
        .in('customer_id', customerIds),
      supabaseAdmin
        .from('invoices')
        .select('customer_id, total, paid_amount, id')
        .in('customer_id', customerIds),
      supabaseAdmin
        .from('payments')
        .select('invoice_id, amount, invoices!inner(customer_id)')
        .in('invoices.customer_id', customerIds),
      supabaseAdmin
        .from('returns')
        .select('order_id, return_value, sales_orders!inner(customer_id)')
        .in('sales_orders.customer_id', customerIds),
      supabaseAdmin
        .from('invoice_refunds')
        .select('invoice_id, refund_amount, invoices!inner(customer_id)')
        .in('invoices.customer_id', customerIds)
    ]);

    // Build ledger data
    const ledgers: LedgerSummary[] = customers.map(customer => {
      const customerOrders = salesOrders.data?.filter(o => o.customer_id === customer.id) || [];
      const customerInvoices = invoices.data?.filter(i => i.customer_id === customer.id) || [];
      
      // Since we're using inner joins, the data is already filtered by customer
      // We just need to find payments/returns/refunds that relate to this customer's invoices/orders
      const customerInvoiceIds = customerInvoices.map(i => i.id);
      const customerOrderIds = customerOrders.map(o => o.id);
      
      // Get payments for this customer's invoices
      const customerPayments = payments.data?.filter(p => 
        customerInvoiceIds.includes(p.invoice_id)
      ) || [];
      
      // Get returns for this customer's orders  
      const customerReturns = returns.data?.filter(r => 
        customerOrderIds.includes(r.order_id)
      ) || [];
      
      // Get refunds for this customer's invoices
      const customerRefunds = refunds.data?.filter(rf => 
        customerInvoiceIds.includes(rf.invoice_id)
      ) || [];
      
      // Calculate totals (use sales orders only to avoid double counting with invoices)
      const totalOrderAmount = customerOrders.reduce((sum, o) => sum + (o.final_price || o.grand_total || 0), 0);
      // Note: We don't use invoice amounts to avoid double counting since invoices are generated from orders
      const totalPayments = customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalReturns = customerReturns.reduce((sum, r) => sum + (r.return_value || 0), 0);
      const totalRefunds = customerRefunds.reduce((sum, rf) => sum + (rf.refund_amount || 0), 0);
      
      // Balance calculation: Sales Orders - Payments - Returns - Refunds
      const totalAmount = totalOrderAmount; // Use sales orders amount only
      const totalCredits = totalPayments + totalReturns + totalRefunds;
      const balanceDue = totalAmount - totalCredits;
      
      const totalTransactions = customerOrders.length + customerInvoices.length + customerPayments.length + customerReturns.length + customerRefunds.length;

      return {
        id: customer.id,
        name: customer.name,
        type: 'customer' as const,
        email: customer.email,
        phone: customer.phone,
        total_transactions: totalTransactions,
        total_amount: totalAmount,
        paid_amount: totalPayments,
        balance_due: balanceDue,
        status: balanceDue > 0 ? 'pending' : 'paid'
      };
    });

    const filteredLedgers = hideZeroBalances 
      ? ledgers.filter(l => l.balance_due !== 0)
      : ledgers;

    return { data: filteredLedgers, total: hideZeroBalances ? filteredLedgers.length : total };

  } catch (error) {
    console.error('Error in getCustomerLedgersPaginated:', error);
    return { data: [], total: 0 };
  }
}

async function getSupplierLedgersPaginated(
  search: string,
  hideZeroBalances: boolean,
  limit: number,
  offset: number
): Promise<{ data: LedgerSummary[]; total: number }> {
  try {
    console.log('Fetching supplier ledgers (paginated)...');
    
    // Build base query with count
    let countQuery = supabaseAdmin
      .from('suppliers')
      .select('id', { count: 'exact', head: true })
      .eq('is_deleted', false);

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,contact.ilike.%${search}%`);
    }

    const { count } = await countQuery;
    const total = count || 0;

    // Fetch paginated data
    const dataQuery = supabaseAdmin
      .from('suppliers')
      .select('id, name, email, contact, created_at')
      .eq('is_deleted', false)
      .order('name')
      .range(offset, offset + limit - 1);

    if (search) {
      const { data: suppliers, error } = await dataQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,contact.ilike.%${search}%`);
      
      if (error || !suppliers) {
        console.error('Error fetching suppliers:', error);
        return { data: [], total: 0 };
      }
      
      console.log(`Found ${suppliers.length} suppliers for page (total: ${total})`);

      // Continue processing
      return await processSuppliers(suppliers, total, hideZeroBalances);
    }

    const { data: suppliers, error } = await dataQuery;
    
    if (error || !suppliers) {
      console.error('Error fetching suppliers:', error);
      return { data: [], total: 0 };
    }

    console.log(`Found ${suppliers.length} suppliers for page (total: ${total})`);
    return await processSuppliers(suppliers, total, hideZeroBalances);

  } catch (error) {
    console.error('Error in getSupplierLedgersPaginated:', error);
    return { data: [], total: 0 };
  }
}

async function processSuppliers(
  suppliers: { id: string; name: string; email: string | null; contact: string | null; created_at: string }[],
  total: number,
  hideZeroBalances: boolean
): Promise<{ data: LedgerSummary[]; total: number }> {
  try {
    const supplierIds = suppliers.map(s => s.id);
    
    // UNIFIED DATA SOURCE: Use vendor_bills.paid_amount for consistency with VendorBillsTab
    const [vendorBills, purchaseOrders] = await Promise.all([
      supabaseAdmin
        .from('vendor_bills')
        .select('supplier_id, total_amount, paid_amount, remaining_amount, bill_date, status')
        .in('supplier_id', supplierIds),
      supabaseAdmin
        .from('purchase_orders')
        .select('supplier_id, total, status')
        .in('supplier_id', supplierIds)
    ]);

    const ledgers: LedgerSummary[] = suppliers.map(supplier => {
      const bills = vendorBills.data?.filter(b => b.supplier_id === supplier.id) || [];
      const pos = purchaseOrders.data?.filter(p => p.supplier_id === supplier.id) || [];
      
      // Debit = Total vendor bills (what we owe them)
      const totalDebit = bills.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      
      // Credit = Total paid_amount from vendor_bills (matches VendorBillsTab calculation)
      const totalCredit = bills.reduce((sum, b) => sum + (b.paid_amount || 0), 0);
      
      // Balance = Debit - Credit (outstanding amount we owe) = Total remaining_amount
      const balanceDue = bills.reduce((sum, b) => sum + (b.remaining_amount || 0), 0);
      
      const totalPOs = pos.reduce((sum, p) => sum + (p.total || 0), 0);
      
      // Get latest transaction date from bills
      const allDates = [
        ...bills.map(b => b.bill_date)
      ].filter(Boolean);
      
      const lastTransactionDate = allDates.length > 0 
        ? allDates.sort().reverse()[0] 
        : supplier.created_at;

      return {
        id: supplier.id,
        name: supplier.name,
        type: 'supplier' as const,
        email: supplier.email || undefined,
        phone: supplier.contact || undefined,
        total_transactions: bills.length,
        total_amount: totalDebit,
        debit: totalDebit,  // Total bills
        credit: totalCredit, // Total payments
        paid_amount: totalCredit,
        balance_due: balanceDue,
        total_po_value: totalPOs,
        last_transaction_date: lastTransactionDate,
        status: balanceDue > 0 ? 'pending' : balanceDue < 0 ? 'overpaid' : 'paid'
      };
    });

    const filteredLedgers = hideZeroBalances 
      ? ledgers.filter(l => Math.abs(l.balance_due) > 0.01)
      : ledgers;

    return { data: filteredLedgers, total: hideZeroBalances ? filteredLedgers.length : total };

  } catch (error) {
    console.error('Error in getSupplierLedgersPaginated:', error);
    return { data: [], total: 0 };
  }
}

async function getEmployeeLedgersPaginated(
  search: string,
  hideZeroBalances: boolean,
  limit: number,
  offset: number
): Promise<{ data: LedgerSummary[]; total: number }> {
  try {
    console.log('Fetching employee ledgers (paginated)...');
    
    // Get count first
    let countQuery = supabaseAdmin
      .from('employees')
      .select('id', { count: 'exact', head: true });

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,position.ilike.%${search}%`);
    }

    const { count } = await countQuery;
    const total = count || 0;

    // Get paginated data
    let dataQuery = supabaseAdmin
      .from('employees')
      .select('id, name, email, phone, salary, position, department, created_at')
      .order('name')
      .range(offset, offset + limit - 1);

    if (search) {
      dataQuery = dataQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,position.ilike.%${search}%`);
    }

    const { data: employees, error } = await dataQuery;

    if (error || !employees) {
      console.error('Error fetching employees:', error);
      return { data: [], total: 0 };
    }

    console.log(`Found ${employees.length} employees for page (total: ${total})`);

    // Get employee IDs for fetching related data
    const employeeIds = employees.map(e => e.id);

    // Fetch payroll records (PRIMARY data source - synced with expenses)
    const { data: payrolls } = await supabaseAdmin
      .from('payroll_records')
      .select('employee_id, net_salary, pay_period_start, payment_type, status')
      .in('employee_id', employeeIds);

    console.log(`Fetched ${payrolls?.length || 0} payroll records for ${employeeIds.length} employees`);

    // Build ledgers with proper debit/credit accounting
    const ledgers: LedgerSummary[] = employees.map(employee => {
      const empPayrolls = payrolls?.filter(p => p.employee_id === employee.id) || [];
      
      // Calculate credit amounts by payment type
      const salaryPayments = empPayrolls.filter(p => p.payment_type === 'salary');
      const incentivePayments = empPayrolls.filter(p => p.payment_type === 'incentive');
      const bonusPayments = empPayrolls.filter(p => p.payment_type === 'bonus');
      const overtimePayments = empPayrolls.filter(p => p.payment_type === 'overtime');
      const allowancePayments = empPayrolls.filter(p => p.payment_type === 'allowance');
      const reimbursementPayments = empPayrolls.filter(p => p.payment_type === 'reimbursement');
      
      const totalSalary = salaryPayments.reduce((sum, p) => sum + (p.net_salary || 0), 0);
      const totalIncentive = incentivePayments.reduce((sum, p) => sum + (p.net_salary || 0), 0);
      const totalBonus = bonusPayments.reduce((sum, p) => sum + (p.net_salary || 0), 0);
      const totalOvertime = overtimePayments.reduce((sum, p) => sum + (p.net_salary || 0), 0);
      const totalAllowance = allowancePayments.reduce((sum, p) => sum + (p.net_salary || 0), 0);
      const totalReimbursement = reimbursementPayments.reduce((sum, p) => sum + (p.net_salary || 0), 0);
      
      // Calculate total credit (actual payments made to employee from payroll_records)
      // This now includes salary, incentives, overtime, bonuses, allowances - all from payroll_records
      const totalCredit = totalSalary + totalIncentive + totalBonus + totalOvertime + totalAllowance + totalReimbursement;
      
      // Calculate debit amounts (expected salary)
      const hireDate = new Date(employee.created_at);
      const currentDate = new Date();
      const monthsWorked = Math.max(1, Math.floor((currentDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const monthlySalary = parseFloat(employee.salary) || 25000;
      const expectedTotalSalary = Math.min(monthsWorked, 12) * monthlySalary; // Cap at 12 months
      const totalDebit = expectedTotalSalary;
      
      // Balance = Debit - Salary only (excludes incentive, bonus, overtime from balance calculation)
      // Can be negative if salary paid exceeds expected salary
      const balanceDue = totalDebit - totalSalary;
      
      // Get last transaction date from payroll records
      const allDates = empPayrolls
        .map(p => p.pay_period_start)
        .filter(Boolean);
      
      const lastTransactionDate = allDates.length > 0 
        ? allDates.sort().reverse()[0] 
        : employee.created_at;

      return {
        id: employee.id,
        name: `${employee.name}${employee.position ? ` (${employee.position})` : ''}`,
        type: 'employee' as const,
        email: employee.email,
        phone: employee.phone,
        total_transactions: empPayrolls.length,
        total_amount: totalDebit, // Expected total salary (debit)
        debit: totalDebit, // Expected salary amount
        credit: totalCredit, // Actual payments made (from payroll_records)
        paid_amount: totalCredit, // Total payments made (credit)
        balance_due: balanceDue, // Outstanding amount we owe
        last_transaction_date: lastTransactionDate,
        status: balanceDue > 0 ? 'pending' : 'settled',
        // Payment type breakdowns
        salary_amount: totalSalary,
        incentive_amount: totalIncentive,
        bonus_amount: totalBonus,
        overtime_amount: totalOvertime,
        allowance_amount: totalAllowance,
        reimbursement_amount: totalReimbursement
      };
    });

    // Filter out zero balances if requested
    const filteredLedgers = hideZeroBalances 
      ? ledgers.filter(l => (l.balance_due && l.balance_due > 0) || (l.credit && l.credit > 0))
      : ledgers;

    console.log(`Returning ${filteredLedgers.length} employee ledgers (hideZero: ${hideZeroBalances})`);

    return { data: filteredLedgers, total: filteredLedgers.length };

  } catch (error) {
    console.error('Error in getEmployeeLedgersPaginated:', error);
    return { data: [], total: 0 };
  }
}

async function getInvestorLedgersPaginated(
  search: string,
  hideZeroBalances: boolean,
  limit: number,
  offset: number
): Promise<{ data: LedgerSummary[]; total: number }> {
  try {
    console.log('Fetching investor/partner ledgers (paginated)...');
    
    // Get count first from partners table
    let countQuery = supabaseAdmin
      .from('partners')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { count } = await countQuery;
    const total = count || 0;

    // Get paginated data
    let partnerQuery = supabaseAdmin
      .from('partners')
      .select('id, name, email, phone, partner_type, initial_investment, equity_percentage, created_at')
      .eq('is_active', true)
      .order('name')
      .range(offset, offset + limit - 1);

    if (search) {
      partnerQuery = partnerQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: partners, error } = await partnerQuery;

    if (error || !partners) {
      console.error('Error fetching partners:', error);
      return { data: [], total: 0 };
    }

    console.log(`Found ${partners.length} partners for page (total: ${total})`);

    const partnerIds = partners.map(p => p.id);

    // Fetch investments
    const { data: investments } = await supabaseAdmin
      .from('investments')
      .select('partner_id, amount, investment_date')
      .in('partner_id', partnerIds);

    // Fetch withdrawals
    const { data: withdrawals } = await supabaseAdmin
      .from('withdrawals')
      .select('partner_id, amount, withdrawal_date, withdrawal_type')
      .in('partner_id', partnerIds);

    // Build ledgers with transaction data
    const ledgers: LedgerSummary[] = partners.map(partner => {
      const partnerInvestments = investments?.filter(inv => inv.partner_id === partner.id) || [];
      const partnerWithdrawals = withdrawals?.filter(wd => wd.partner_id === partner.id) || [];
      
      const totalInvestments = partnerInvestments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
      const totalWithdrawals = partnerWithdrawals.reduce((sum, wd) => sum + (wd.amount || 0), 0);
      
      // Break down withdrawals by type
      const capitalWithdrawals = partnerWithdrawals
        .filter(wd => wd.withdrawal_type === 'capital_withdrawal' || !wd.withdrawal_type)
        .reduce((sum, wd) => sum + (wd.amount || 0), 0);
      
      const profitDistributions = partnerWithdrawals
        .filter(wd => wd.withdrawal_type === 'profit_distribution')
        .reduce((sum, wd) => sum + (wd.amount || 0), 0);
      
      const interestPayments = partnerWithdrawals
        .filter(wd => wd.withdrawal_type === 'interest_payment')
        .reduce((sum, wd) => sum + (wd.amount || 0), 0);
      
      // Current balance = total investments - only capital withdrawals
      // (profit distributions and interest payments don't reduce investment balance)
      const currentBalance = totalInvestments - capitalWithdrawals;
      
      const allTransactionDates = [
        ...partnerInvestments.map(inv => inv.investment_date),
        ...partnerWithdrawals.map(wd => wd.withdrawal_date)
      ].filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      const lastTransactionDate = allTransactionDates[0] || partner.created_at;

      return {
        id: partner.id.toString(),
        name: `${partner.name}${partner.partner_type ? ` (${partner.partner_type})` : ''}`,
        type: 'investors' as const,
        email: partner.email,
        phone: partner.phone,
        partner_type: partner.partner_type,
        equity_percentage: partner.equity_percentage,
        total_transactions: partnerInvestments.length + partnerWithdrawals.length,
        total_amount: totalInvestments + totalWithdrawals,
        balance_due: currentBalance, // Use currentBalance instead of netEquity
        total_investments: totalInvestments,
        total_withdrawals: totalWithdrawals,
        capital_withdrawals: capitalWithdrawals,
        profit_distributions: profitDistributions,
        interest_payments: interestPayments,
        net_equity: currentBalance, // Use currentBalance for net_equity too
        last_transaction_date: lastTransactionDate,
        status: 'active'
      };
    });

    return { data: ledgers, total };

  } catch (error) {
    console.error('Error in getInvestorLedgersPaginated:', error);
    return { data: [], total: 0 };
  }
}

async function getLoansLedgersPaginated(
  search: string,
  hideZeroBalances: boolean,
  limit: number,
  offset: number
): Promise<{ data: LedgerSummary[]; total: number }> {
  try {
    // Get count first
    let countQuery = supabaseAdmin
      .from('loan_opening_balances')
      .select('id', { count: 'exact', head: true });

    if (search) {
      countQuery = countQuery.or(`loan_name.ilike.%${search}%,bank_name.ilike.%${search}%`);
    }

    const { count } = await countQuery;
    const total = count || 0;

    // Get paginated data
    let dataQuery = supabaseAdmin
      .from('loan_opening_balances')
      .select('id, loan_name, bank_name, loan_type, original_loan_amount, opening_balance, interest_rate, emi_amount')
      .order('loan_name')
      .range(offset, offset + limit - 1);

    if (search) {
      dataQuery = dataQuery.or(`loan_name.ilike.%${search}%,bank_name.ilike.%${search}%`);
    }

    const { data: loans, error } = await dataQuery;

    if (error || !loans) {
      return { data: [], total: 0 };
    }

    const loanIds = loans.map(l => l.id);

    // Fetch liability payments for these loans
    const { data: payments } = await supabaseAdmin
      .from('liability_payments')
      .select('loan_id, principal_amount, interest_amount, total_amount')
      .in('loan_id', loanIds);

    const ledgers: LedgerSummary[] = loans.map(loan => {
      // Calculate payments for this loan
      const loanPayments = payments?.filter(pay => pay.loan_id === loan.id) || [];
      const totalPrincipalPaid = loanPayments.reduce((sum, pay) => sum + (pay.principal_amount || 0), 0);
      const totalPayments = loanPayments.reduce((sum, pay) => sum + (pay.total_amount || 0), 0);
      
      // Calculate remaining balance (original amount - principal paid)
      const originalAmount = loan.original_loan_amount || 0;
      const currentBalance = originalAmount - totalPrincipalPaid;
      
      return {
        id: loan.id,
        name: `${loan.loan_name} - ${loan.bank_name}`,
        type: 'loans' as const,
        loan_type: loan.loan_type,
        original_amount: originalAmount,
        current_balance: currentBalance,
        emi_amount: loan.emi_amount,
        interest_rate: loan.interest_rate,
        total_transactions: loanPayments.length,
        total_amount: originalAmount,
        debit: originalAmount, // Original loan amount
        credit: totalPayments, // Total payments made
        balance_due: currentBalance, // Remaining balance
        paid_amount: totalPayments, // Total payments (for consistency with other ledger types)
        status: currentBalance > 0 ? 'active' : 'closed'
      };
    });

    return { data: ledgers, total };

  } catch (error) {
    console.error('Error in getLoansLedgersPaginated:', error);
    return { data: [], total: 0 };
  }
}

async function getBankLedgersPaginated(
  search: string,
  hideZeroBalances: boolean,
  limit: number,
  offset: number
): Promise<{ data: LedgerSummary[]; total: number }> {
  try {
    let bankQuery = supabaseAdmin
      .from('bank_accounts')
      .select('id, name, account_number, account_type, current_balance, upi_id', { count: 'exact' })
      .eq('is_active', true);

    if (search) {
      bankQuery = bankQuery.or(`name.ilike.%${search}%,account_number.ilike.%${search}%`);
    }

    const { count } = await bankQuery;
    const total = count || 0;

    bankQuery = supabaseAdmin
      .from('bank_accounts')
      .select('id, name, account_number, account_type, current_balance, upi_id')
      .eq('is_active', true)
      .order('name')
      .range(offset, offset + limit - 1);

    if (search) {
      bankQuery = bankQuery.or(`name.ilike.%${search}%,account_number.ilike.%${search}%`);
    }

    const { data: banks, error } = await bankQuery;

    if (error || !banks) {
      return { data: [], total: 0 };
    }

    const ledgers: LedgerSummary[] = banks.map(bank => ({
      id: bank.id,
      name: bank.name,
      type: 'bank' as const,
      account_number: bank.account_number,
      account_type: bank.account_type,
      current_balance_amount: bank.current_balance,
      upi_id: bank.upi_id,
      total_transactions: 0,
      total_amount: 0,
      balance_due: bank.current_balance || 0,
      status: 'active'
    }));

    return { data: ledgers, total };

  } catch (error) {
    console.error('Error in getBankLedgersPaginated:', error);
    return { data: [], total: 0 };
  }
}

// ==================== SALES RETURNS FUNCTIONS ====================

async function getSalesReturnsLedgers(
  search: string,
  hideZeroBalances: boolean
): Promise<LedgerSummary[]> {
  try {
    const { data: returns, error } = await supabaseAdmin
      .from('returns')
      .select('id, return_type, status, return_value, created_at')
      .order('created_at', { ascending: false });

    if (error || !returns) {
      console.error('Error fetching sales returns:', error);
      return [];
    }

    // Fetch all invoice refunds to calculate actual refunded amounts
    const { data: allRefunds } = await supabaseAdmin
      .from('invoice_refunds')
      .select('return_id, refund_amount, status')
      .in('status', ['pending', 'approved', 'processed']);

    console.log('📊 SALES RETURNS LEDGER DEBUG (non-paginated):');
    console.log(`  - Returns found: ${returns.length}`);
    console.log(`  - Refunds found: ${allRefunds?.length || 0}`);
    console.log(`  - Refunds with return_id: ${allRefunds?.filter(r => r.return_id).length || 0}`);

    // Build refund map: return_id -> total refunded amount
    const refundMap = new Map<string, number>();
    if (allRefunds) {
      allRefunds.forEach(refund => {
        if (refund.return_id) {
          const current = refundMap.get(refund.return_id) || 0;
          refundMap.set(refund.return_id, current + (refund.refund_amount || 0));
        }
      });
    }

    console.log(`  - Refund map size: ${refundMap.size}`);
    console.log(`  - Refund map entries:`, Array.from(refundMap.entries()).map(([id, amt]) => `${id.slice(0, 8)} → ₹${amt}`));

    const ledgers: LedgerSummary[] = returns.map(ret => {
      const returnValue = ret.return_value || 0;
      const refundedAmount = refundMap.get(ret.id) || 0;
      const balanceDue = returnValue - refundedAmount;

      console.log(`  - Return ${ret.id.slice(0, 8)}: Value=₹${returnValue}, Refunded=₹${refundedAmount}, Balance=₹${balanceDue}`);

      return {
        id: ret.id,
        name: `Sales Return ${ret.id.slice(0, 8)}`,
        type: 'sales_returns' as const,
        total_transactions: 1,
        total_amount: returnValue,
        balance_due: balanceDue,
        paid_amount: refundedAmount,
        return_value: returnValue,
        status: balanceDue <= 0 ? 'settled' : ret.status
      };
    });

    return hideZeroBalances ? ledgers.filter(l => l.total_amount > 0) : ledgers;

  } catch (error) {
    console.error('Error fetching sales returns ledgers:', error);
    return [];
  }
}

async function getSalesReturnsLedgersPaginated(
  search: string,
  hideZeroBalances: boolean,
  limit: number,
  offset: number
): Promise<{ data: LedgerSummary[]; total: number }> {
  try {
    // Get count first
    let countQuery = supabaseAdmin
      .from('returns')
      .select('id', { count: 'exact', head: true });

    if (search) {
      countQuery = countQuery.or(`return_type.ilike.%${search}%,status.ilike.%${search}%`);
    }

    const { count } = await countQuery;
    const total = count || 0;

    // Get paginated data
    let dataQuery = supabaseAdmin
      .from('returns')
      .select('id, return_type, status, return_value, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      dataQuery = dataQuery.or(`return_type.ilike.%${search}%,status.ilike.%${search}%`);
    }

    const { data: returns, error } = await dataQuery;

    if (error || !returns) {
      return { data: [], total: 0 };
    }

    // Fetch all invoice refunds to calculate actual refunded amounts
    const { data: allRefunds } = await supabaseAdmin
      .from('invoice_refunds')
      .select('return_id, refund_amount, status')
      .in('status', ['pending', 'approved', 'processed']);

    console.log('📊 SALES RETURNS LEDGER DEBUG (paginated):');
    console.log(`  - Returns found: ${returns.length}`);
    console.log(`  - Refunds found: ${allRefunds?.length || 0}`);
    console.log(`  - Refunds with return_id: ${allRefunds?.filter(r => r.return_id).length || 0}`);

    // Build refund map: return_id -> total refunded amount
    const refundMap = new Map<string, number>();
    if (allRefunds) {
      allRefunds.forEach(refund => {
        if (refund.return_id) {
          const current = refundMap.get(refund.return_id) || 0;
          refundMap.set(refund.return_id, current + (refund.refund_amount || 0));
        }
      });
    }

    console.log(`  - Refund map size: ${refundMap.size}`);
    console.log(`  - Refund map entries:`, Array.from(refundMap.entries()).map(([id, amt]) => `${id.slice(0, 8)} → ₹${amt}`));

    const ledgers: LedgerSummary[] = returns.map(ret => {
      const returnValue = ret.return_value || 0;
      const refundedAmount = refundMap.get(ret.id) || 0;
      const balanceDue = returnValue - refundedAmount;

      console.log(`  - Return ${ret.id.slice(0, 8)}: Value=₹${returnValue}, Refunded=₹${refundedAmount}, Balance=₹${balanceDue}, Status=${balanceDue <= 0 ? 'settled' : ret.status}`);

      return {
        id: ret.id,
        name: `Sales Return ${ret.id.slice(0, 8)}`,
        type: 'sales_returns' as const,
        total_transactions: 1,
        total_amount: returnValue,
        balance_due: balanceDue,
        paid_amount: refundedAmount,
        return_value: returnValue,
        return_type: ret.return_type,
        status: balanceDue <= 0 ? 'settled' : ret.status
      };
    });

    const filteredLedgers = hideZeroBalances 
      ? ledgers.filter(l => l.total_amount > 0)
      : ledgers;

    return { data: filteredLedgers, total: hideZeroBalances ? filteredLedgers.length : total };

  } catch (error) {
    console.error('Error in getSalesReturnsLedgersPaginated:', error);
    return { data: [], total: 0 };
  }
}

// ==================== PURCHASE RETURNS FUNCTIONS ====================

async function getPurchaseReturnsLedgers(
  search: string,
  hideZeroBalances: boolean
): Promise<LedgerSummary[]> {
  try {
    const { data: returns, error } = await supabaseAdmin
      .from('purchase_returns')
      .select('id, return_number, return_date, total_return_amount, net_return_amount, status, reason')
      .order('return_date', { ascending: false });

    if (error || !returns) {
      console.error('Error fetching purchase returns:', error);
      return [];
    }

    const ledgers: LedgerSummary[] = returns.map(ret => ({
      id: ret.id,
      name: `Purchase Return ${ret.return_number}`,
      type: 'purchase_returns' as const,
      total_transactions: 1,
      total_amount: ret.net_return_amount || 0,
      balance_due: 0,
      paid_amount: ret.net_return_amount || 0,
      return_value: ret.net_return_amount || 0,
      return_number: ret.return_number,
      return_date: ret.return_date,
      status: ret.status
    }));

    return hideZeroBalances ? ledgers.filter(l => l.total_amount > 0) : ledgers;

  } catch (error) {
    console.error('Error fetching purchase returns ledgers:', error);
    return [];
  }
}

async function getPurchaseReturnsLedgersPaginated(
  search: string,
  hideZeroBalances: boolean,
  limit: number,
  offset: number
): Promise<{ data: LedgerSummary[]; total: number }> {
  try {
    // Get count first
    let countQuery = supabaseAdmin
      .from('purchase_returns')
      .select('id', { count: 'exact', head: true });

    if (search) {
      countQuery = countQuery.or(`return_number.ilike.%${search}%,reason.ilike.%${search}%`);
    }

    const { count } = await countQuery;
    const total = count || 0;

    // Get paginated data
    let dataQuery = supabaseAdmin
      .from('purchase_returns')
      .select('id, return_number, return_date, total_return_amount, net_return_amount, status, reason')
      .order('return_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      dataQuery = dataQuery.or(`return_number.ilike.%${search}%,reason.ilike.%${search}%`);
    }

    const { data: returns, error } = await dataQuery;

    if (error || !returns) {
      return { data: [], total: 0 };
    }

    const ledgers: LedgerSummary[] = returns.map(ret => ({
      id: ret.id,
      name: `Purchase Return ${ret.return_number}`,
      type: 'purchase_returns' as const,
      total_transactions: 1,
      total_amount: ret.net_return_amount || 0,
      balance_due: 0,
      paid_amount: ret.net_return_amount || 0,
      return_value: ret.net_return_amount || 0,
      return_number: ret.return_number,
      return_date: ret.return_date,
      status: ret.status
    }));

    const filteredLedgers = hideZeroBalances 
      ? ledgers.filter(l => l.total_amount > 0)
      : ledgers;

    return { data: filteredLedgers, total: hideZeroBalances ? filteredLedgers.length : total };

  } catch (error) {
    console.error('Error in getPurchaseReturnsLedgersPaginated:', error);
    return { data: [], total: 0 };
  }
}
