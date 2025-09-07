import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface LedgerItem {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'employee' | 'expense' | 'bank' | 'product';
  email?: string;
  phone?: string;
  address?: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  transaction_count: number;
  total_transactions: number; // UI compatibility
  last_transaction: string;
  last_transaction_date: string; // UI compatibility
  status: string;
  account_number?: string;
  account_type?: string;
  position?: string;
  department?: string;
  designation?: string;
  category?: string;
  salary_amount?: number;
  bonus_amount?: number;
  overtime_amount?: number;
  sku?: string;
  cost?: number;
  selling_price?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const ledgers: LedgerItem[] = [];

    // 1. CUSTOMER LEDGERS - All customers with sales orders (simplified approach)
    const { data: allSalesOrders } = await supabase
      .from('sales_orders')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('Sales orders found:', allSalesOrders?.length || 0);

    if (allSalesOrders && allSalesOrders.length > 0) {
      // Get unique customer IDs
      const customerIds = [...new Set(allSalesOrders.map(order => order.customer_id))].filter(Boolean);
      console.log('Unique customer IDs found:', customerIds.length);

      if (customerIds.length > 0) {
        // Get customer details separately
        const { data: customers } = await supabase
          .from('customers')
          .select('*')
          .in('id', customerIds)
          .eq('is_deleted', false);

        console.log('Customers found:', customers?.length || 0);

        if (customers && customers.length > 0) {
          // Get ALL payments for comprehensive analysis
          const { data: allPayments, error: paymentsError } = await supabase
            .from('payments')
            .select('*');

          console.log('Payments table error:', paymentsError?.message || 'None');
          console.log('Total payments found:', allPayments?.length || 0);
          
          if (allPayments && allPayments.length > 0) {
            console.log('Sample payment:', JSON.stringify(allPayments[0], null, 2));
          }

          // Process each customer
          for (const customer of customers) {
            // Apply search filter
            if (search && !customer.name?.toLowerCase().includes(search.toLowerCase()) && 
                !customer.email?.toLowerCase().includes(search.toLowerCase()) && 
                !customer.phone?.includes(search)) {
              continue;
            }

            const customerOrders = allSalesOrders.filter(order => order.customer_id === customer.id);
            const customerPayments = allPayments?.filter(payment => {
              const relatedOrder = allSalesOrders.find(order => order.id === payment.sales_order_id);
              return relatedOrder?.customer_id === customer.id;
            }) || [];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const totalSales = customerOrders.reduce((sum: number, order: any) => sum + (order.final_price || 0), 0);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const totalPaid = customerPayments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const totalWaived = customerOrders.reduce((sum: number, order: any) => sum + (order.waived_amount || 0), 0);
            const balanceDue = totalSales - totalPaid - totalWaived;

            // Get last transaction date
            const allDates = [
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...customerOrders.map((o: any) => o.date || o.created_at),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...customerPayments.map((p: any) => p.date || p.created_at)
            ].filter(Boolean).sort().reverse();

            ledgers.push({
              id: customer.id,
              name: customer.name,
              type: 'customer',
              email: customer.email,
              phone: customer.phone,
              address: customer.address,
              total_amount: totalSales,
              paid_amount: totalPaid,
              balance_due: balanceDue,
              transaction_count: customerOrders.length,
              total_transactions: customerOrders.length,
              last_transaction: allDates[0] || customer.created_at,
              last_transaction_date: allDates[0] || customer.created_at,
              status: balanceDue > 0 ? 'outstanding' : 'settled'
            });
          }
        }
      }
    }

    // 2. SUPPLIER LEDGERS - Comprehensive approach following vendor API pattern
    console.log('\n=== COMPREHENSIVE SUPPLIER INVESTIGATION ===');
    
    // Get ALL suppliers first (like vendors API does)
    const { data: allSuppliers, error: suppError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_deleted', false)
      .order('name');

    console.log('Suppliers table error:', suppError?.message || 'None');
    console.log('ALL suppliers found:', allSuppliers?.length || 0);
    
    if (allSuppliers && allSuppliers.length > 0) {
      console.log('Sample supplier:', JSON.stringify(allSuppliers[0], null, 2));

      // Get ALL inventory items to calculate stock values
      const { data: allInventoryItems, error: invError } = await supabase
        .from('inventory_items')
        .select('*');

      console.log('ALL inventory items error:', invError?.message || 'None');
      console.log('ALL inventory items found:', allInventoryItems?.length || 0);

      // Get inventory view for better cost/price data
      const { data: inventoryView, error: viewError } = await supabase
        .from('inventory_product_view')
        .select('*');

      console.log('Inventory view error:', viewError?.message || 'None');
      console.log('ALL inventory view items found:', inventoryView?.length || 0);

      // Get vendor bills for payment tracking
      const { data: vendorBills, error: billsError } = await supabase
        .from('vendor_bills')
        .select('supplier_id, total_amount, paid_amount, status');

      console.log('Vendor bills error:', billsError?.message || 'None');
      console.log('Vendor bills found:', vendorBills?.length || 0);

      // Get purchase orders for additional payment data
      const { data: purchaseOrders, error: poError } = await supabase
        .from('purchase_orders')
        .select('supplier_id, total, paid_amount, status');

      console.log('Purchase orders error:', poError?.message || 'None');
      console.log('Purchase orders found:', purchaseOrders?.length || 0);

      // Process each supplier
      for (const supplier of allSuppliers) {
        if (search && !supplier.name?.toLowerCase().includes(search.toLowerCase())) {
          continue;
        }

        // Calculate inventory stock value for this supplier
        let totalStockValue = 0;
        let itemCount = 0;
        let lastInventoryDate = supplier.created_at;

        // Use inventory view data (preferred as it has better cost/price info)
        if (inventoryView && inventoryView.length > 0) {
          const supplierInventory = inventoryView.filter(item => item.supplier_id === supplier.id);
          
          supplierInventory.forEach(item => {
            const quantity = item.quantity || 0;
            const cost = item.cost || 0;
            
            totalStockValue += quantity * cost;  // Stock value at cost price (what we owe supplier)
            itemCount += 1;
            
            if (item.updated_at && item.updated_at > lastInventoryDate) {
              lastInventoryDate = item.updated_at;
            }
          });
        } else if (allInventoryItems && allInventoryItems.length > 0) {
          // Fallback to regular inventory items
          const supplierInventory = allInventoryItems.filter(item => item.supplier_id === supplier.id);
          
          supplierInventory.forEach(item => {
            const quantity = item.quantity || 0;
            const cost = item.cost || item.cost_per_unit || item.price || 0;
            
            totalStockValue += quantity * cost;
            itemCount += 1;
            
            if (item.updated_at && item.updated_at > lastInventoryDate) {
              lastInventoryDate = item.updated_at;
            }
          });
        }

        // Calculate payment data (following vendor financial summary pattern)
        let totalBillAmount = 0;
        let totalPaidAmount = 0;
        let totalPurchaseValue = 0;
        let totalPurchasePaid = 0;
        let totalVendorPayments = 0;

        // From vendor bills
        if (vendorBills && vendorBills.length > 0) {
          const supplierBills = vendorBills.filter(bill => bill.supplier_id === supplier.id);
          totalBillAmount = supplierBills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
          totalPaidAmount = supplierBills.reduce((sum, bill) => sum + (bill.paid_amount || 0), 0);
        }

        // From purchase orders
        if (purchaseOrders && purchaseOrders.length > 0) {
          const supplierPOs = purchaseOrders.filter(po => po.supplier_id === supplier.id);
          totalPurchaseValue = supplierPOs.reduce((sum, po) => sum + (po.total || 0), 0);
          totalPurchasePaid = supplierPOs.reduce((sum, po) => sum + (po.paid_amount || 0), 0);
        }

        // Get vendor payment history to include in calculation
        const { data: vendorPayments } = await supabase
          .from('vendor_payment_history')
          .select('amount')
          .eq('supplier_id', supplier.id);

        if (vendorPayments && vendorPayments.length > 0) {
          totalVendorPayments = vendorPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        }

        // Calculate final amounts (prefer vendor bills, fallback to POs)
        const totalAmount = totalBillAmount > 0 ? totalBillAmount : 
                           totalPurchaseValue > 0 ? totalPurchaseValue : 
                           totalStockValue; // Use stock value if no bills/POs

        // Calculate total payments including vendor bills paid amount and vendor payment history
        const totalPayments = Math.max(totalPaidAmount, totalPurchasePaid) + totalVendorPayments;
        const balanceDue = totalAmount - totalPayments;

        ledgers.push({
          id: supplier.id,
          name: supplier.name,
          type: 'supplier',
          email: supplier.email || '',
          phone: supplier.contact || supplier.phone || '',
          address: supplier.address || '',
          total_amount: totalAmount,
          paid_amount: totalPayments,
          balance_due: balanceDue,
          transaction_count: itemCount,
          total_transactions: itemCount,
          last_transaction: lastInventoryDate,
          last_transaction_date: lastInventoryDate,
          status: balanceDue > 0 ? 'outstanding' : 
                  totalAmount > 0 ? 'settled' : 
                  itemCount > 0 ? 'active' : 'inactive'
        });
      }
    }

    console.log('Total suppliers added to ledgers:', ledgers.filter(l => l.type === 'supplier').length);

    // 3. EMPLOYEE LEDGERS - Enhanced approach with comprehensive debugging
    console.log('\n=== EMPLOYEE INVESTIGATION ===');
    
    const { data: allEmployees, error: empError } = await supabase
      .from('employees')
      .select('*');

    console.log('Employees table error:', empError?.message || 'None');
    console.log('Total employees found:', allEmployees?.length || 0);
    
    if (allEmployees && allEmployees.length > 0) {
      console.log('Sample employee:', JSON.stringify(allEmployees[0], null, 2));
      
      // Apply search filter
      const filteredEmployees = allEmployees.filter(employee => {
        if (!search) return true;
        
        const searchLower = search.toLowerCase();
        return (
          employee.first_name?.toLowerCase().includes(searchLower) ||
          employee.last_name?.toLowerCase().includes(searchLower) ||
          employee.name?.toLowerCase().includes(searchLower) ||
          employee.email?.toLowerCase().includes(searchLower) ||
          employee.phone?.includes(search)
        );
      });

      console.log('Filtered employees after search:', filteredEmployees.length);

      if (filteredEmployees.length > 0) {
        // Try to get employee payments from multiple possible tables
        const { data: employeePayments, error: payError } = await supabase
          .from('employee_payments')
          .select('*');

        console.log('Employee payments error:', payError?.message || 'None');
        console.log('Employee payments found:', employeePayments?.length || 0);
        
        if (employeePayments && employeePayments.length > 0) {
          console.log('Sample employee payment:', JSON.stringify(employeePayments[0], null, 2));
        }

        // Also try salary_payments table if it exists
        const { data: salaryPayments, error: salaryError } = await supabase
          .from('salary_payments')
          .select('*');

        console.log('Salary payments error:', salaryError?.message || 'None');
        console.log('Salary payments found:', salaryPayments?.length || 0);

        // Process each employee
        for (const employee of filteredEmployees) {
          // Get employee payments
          const empPayments = employeePayments?.filter(p => 
            p.employee_id === employee.id || 
            p.employee_name === (employee.first_name + ' ' + employee.last_name) ||
            p.employee_name === employee.name
          ) || [];

          const salPayments = salaryPayments?.filter(p => 
            p.employee_id === employee.id ||
            p.employee_name === (employee.first_name + ' ' + employee.last_name) ||
            p.employee_name === employee.name
          ) || [];

          // Calculate totals from all payment sources
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const totalEmpPayments = empPayments.reduce((sum: number, payment: any) => 
            sum + (payment.total_amount || payment.salary_amount || payment.amount || 0), 0);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const totalSalPayments = salPayments.reduce((sum: number, payment: any) => 
            sum + (payment.amount || payment.total_amount || 0), 0);

          const totalAmountPaid = totalEmpPayments + totalSalPayments;

          // Get last payment date
          const allPaymentDates = [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...empPayments.map((p: any) => p.payment_date || p.date || p.created_at),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...salPayments.map((p: any) => p.payment_date || p.date || p.created_at)
          ].filter(Boolean).sort().reverse();

          const lastPaymentDate = allPaymentDates[0] || 
                                 employee.hired_date || 
                                 employee.start_date || 
                                 employee.created_at || 
                                 new Date().toISOString();

          // Handle different employee name structures
          const employeeName = employee.name || 
                              `${employee.first_name || ''} ${employee.last_name || ''}`.trim() ||
                              employee.full_name ||
                              'Unknown Employee';

          ledgers.push({
            id: employee.id,
            name: employeeName,
            type: 'employee',
            email: employee.email || '',
            phone: employee.phone || employee.mobile || '',
            address: employee.address || '',
            department: employee.department || '',
            designation: employee.designation || employee.position || employee.role || '',
            total_amount: employee.salary || employee.base_salary || employee.monthly_salary || 0,
            paid_amount: totalAmountPaid,
            balance_due: 0, // Employees typically don't have balance due
            transaction_count: empPayments.length + salPayments.length,
            total_transactions: empPayments.length + salPayments.length,
            last_transaction: lastPaymentDate,
            last_transaction_date: lastPaymentDate,
            status: employee.status === 'active' || employee.is_active || !employee.status ? 'active' : 'inactive'
          });
        }
      }
    } else {
      console.log('No employees found or employees table does not exist');
    }

    console.log('Total employees added to ledgers:', ledgers.filter(l => l.type === 'employee').length);

    // 4. EXPENSE LEDGERS - All expenses including salary payments
    
    // First get regular expenses
    const { data: regularExpenses } = await supabase
      .from('expenses')
      .select(`
        id,
        expense_type,
        category,
        amount,
        description,
        expense_date,
        payment_method,
        created_at
      `)
      .order('expense_type');

    // Then get all salary payments as expenses
    const { data: salaryExpenses } = await supabase
      .from('employee_payments')
      .select(`
        id,
        employee_id,
        salary_amount,
        bonus_amount,
        overtime_amount,
        total_amount,
        payment_date,
        payment_type,
        employees!inner(first_name, last_name, department)
      `);

    // Process regular expenses
    if (regularExpenses && regularExpenses.length > 0) {
      // Define expense categories for better organization
      const expenseCategories = {
        'Administrative': ['Office Supplies', 'Stationery', 'Phone', 'Internet', 'Legal Fees'],
        'Operations': ['Electricity', 'Water', 'Rent', 'Maintenance', 'Security'],
        'Transportation': ['Fuel', 'Vehicle Maintenance', 'Delivery', 'Travel'],
        'Marketing': ['Advertising', 'Promotion', 'Website', 'Social Media'],
        'Staff': ['Training', 'Refreshments', 'Team Events', 'Uniforms'],
        'Financial': ['Bank Charges', 'Interest', 'Insurance', 'Taxes']
      };

      // Function to categorize expense
      const categorizeExpense = (expenseType: string, category?: string): string => {
        if (category) return category;
        
        for (const [cat, types] of Object.entries(expenseCategories)) {
          if (types.some(type => expenseType.toLowerCase().includes(type.toLowerCase()))) {
            return cat;
          }
        }
        return 'Miscellaneous';
      };

      // Filter expenses by search term
      const filteredExpenses = regularExpenses.filter(expense =>
        !search || 
        expense.expense_type?.toLowerCase().includes(search.toLowerCase()) ||
        expense.category?.toLowerCase().includes(search.toLowerCase()) ||
        expense.description?.toLowerCase().includes(search.toLowerCase())
      );

      // Group by expense category and type
      const expenseGroups = filteredExpenses.reduce((acc: Record<string, {
        category: string;
        total: number;
        count: number;
        lastExpense: string;
        types: Set<string>;
      }>, expense) => {
        const expenseType = expense.expense_type || 'Miscellaneous';
        const category = categorizeExpense(expenseType, expense.category);
        const key = `${category} - ${expenseType}`;
        
        if (!acc[key]) {
          acc[key] = {
            category,
            total: 0,
            count: 0,
            lastExpense: expense.expense_date || expense.created_at,
            types: new Set()
          };
        }
        
        acc[key].total += expense.amount || 0;
        acc[key].count += 1;
        acc[key].types.add(expenseType);
        
        // Update last expense date if this one is more recent
        if (expense.expense_date && expense.expense_date > acc[key].lastExpense) {
          acc[key].lastExpense = expense.expense_date;
        }
        
        return acc;
      }, {});

      Object.entries(expenseGroups).forEach(([expenseKey, data]) => {
        ledgers.push({
          id: `expense-${expenseKey.toLowerCase().replace(/\s+/g, '-')}`,
          name: expenseKey,
          type: 'expense',
          category: data.category,
          total_amount: data.total,
          paid_amount: data.total,
          balance_due: 0,
          transaction_count: data.count,
          total_transactions: data.count,
          last_transaction: data.lastExpense,
          last_transaction_date: data.lastExpense,
          status: 'active'
        });
      });
    }

    // Process salary expenses as a separate category
    if (salaryExpenses && salaryExpenses.length > 0) {
      // Filter salary expenses by search
      const filteredSalaryExpenses = salaryExpenses.filter(salary => {
        if (!search) return true;
        const employee = Array.isArray(salary.employees) ? salary.employees[0] : salary.employees;
        return employee?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
               employee?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
               employee?.department?.toLowerCase().includes(search.toLowerCase()) ||
               salary.payment_type?.toLowerCase().includes(search.toLowerCase());
      });

      // Group salary expenses by department
      const salaryGroups = filteredSalaryExpenses.reduce((acc: Record<string, {
        total: number;
        count: number;
        lastPayment: string;
      }>, salary) => {
        const employee = Array.isArray(salary.employees) ? salary.employees[0] : salary.employees;
        const department = employee?.department || 'Unknown Department';
        const key = `Staff Costs - ${department}`;
        
        if (!acc[key]) {
          acc[key] = {
            total: 0,
            count: 0,
            lastPayment: salary.payment_date
          };
        }
        
        acc[key].total += salary.total_amount || 0;
        acc[key].count += 1;
        
        // Update last payment date if this one is more recent
        if (salary.payment_date && salary.payment_date > acc[key].lastPayment) {
          acc[key].lastPayment = salary.payment_date;
        }
        
        return acc;
      }, {});

      Object.entries(salaryGroups).forEach(([salaryKey, data]) => {
        ledgers.push({
          id: `salary-${salaryKey.toLowerCase().replace(/\s+/g, '-')}`,
          name: salaryKey,
          type: 'expense',
          category: 'Staff Costs',
          total_amount: data.total,
          paid_amount: data.total,
          balance_due: 0,
          transaction_count: data.count,
          total_transactions: data.count,
          last_transaction: data.lastPayment,
          last_transaction_date: data.lastPayment,
          status: 'active'
        });
      });
    }

    // 5. BANK ACCOUNT LEDGERS - Show only banks with transactions
    const { data: bankData } = await supabase
      .from('bank_accounts')
      .select(`
        id,
        account_name,
        account_number,
        bank_name,
        account_type,
        current_balance,
        created_at
      `)
      .ilike('account_name', `%${search}%`)
      .order('account_name')
      .limit(20);

    if (bankData && bankData.length > 0) {
      // For now, show all bank accounts as they represent actual accounts
      for (const bank of bankData) {
        ledgers.push({
          id: bank.id,
          name: `${bank.account_name} (${bank.bank_name})`,
          type: 'bank',
          account_number: bank.account_number,
          account_type: bank.account_type,
          total_amount: bank.current_balance || 0,
          paid_amount: 0,
          balance_due: bank.current_balance || 0,
          transaction_count: 0,
          total_transactions: 0,
          last_transaction: bank.created_at,
          last_transaction_date: bank.created_at,
          status: 'active'
        });
      }
    }

    // Calculate summary statistics
    const stats = {
      total_ledgers: ledgers.length,
      customers: ledgers.filter((l: LedgerItem) => l.type === 'customer').length,
      suppliers: ledgers.filter((l: LedgerItem) => l.type === 'supplier').length,
      employees: ledgers.filter((l: LedgerItem) => l.type === 'employee').length,
      expenses: ledgers.filter((l: LedgerItem) => l.type === 'expense').length,
      banks: ledgers.filter((l: LedgerItem) => l.type === 'bank').length,
      products: ledgers.filter((l: LedgerItem) => l.type === 'product').length,
      total_outstanding: ledgers.reduce((sum: number, l: LedgerItem) => sum + (l.balance_due || 0), 0)
    };

    console.log('=== LEDGER API DEBUG ===');
    console.log('Total ledgers found:', ledgers.length);
    console.log('Stats:', stats);
    console.log('Sample ledger:', ledgers[0]);
    console.log('========================');

    return NextResponse.json({
      success: true,
      data: ledgers,
      stats
    });

  } catch (error) {
    console.error('Error fetching ledgers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ledgers' },
      { status: 500 }
    );
  }
}
