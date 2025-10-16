/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportType: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    const asOfDate = searchParams.get('as_of_date') || new Date().toISOString().split('T')[0];
    
    // Await params in Next.js 15
    const { reportType } = await params;
    
    switch (reportType) {
      case 'profit-loss':
        return await generateProfitLossReport(startDate, endDate);
      case 'balance-sheet':
        return await generateBalanceSheetReport(asOfDate);
      case 'trial-balance':
        return await generateTrialBalanceReport(asOfDate);
      case 'cash-flow':
        return await generateCashFlowReport(startDate, endDate);
      case 'account-balances':
        return await generateAccountBalancesReport(asOfDate);
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Financial report error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function generateProfitLossReport(startDate: string, endDate: string) {
  try {
    // Fetch revenue from sales_orders table (using final_price column)
    const { data: salesData, error: salesError } = await supabase
      .from('sales_orders')
      .select('id, final_price, grand_total, created_at, customer_id, customers(name), status')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .in('status', ['confirmed', 'shipped', 'delivered', 'ready_for_delivery', 'partial_delivery_ready']);
    
    if (salesError) {
      console.error('Error fetching sales data:', salesError);
    }
    
    // Fetch all expenses from expenses table
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('id, date, category, description, amount, type, subcategory')
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (expensesError) {
      console.error('Error fetching expenses data:', expensesError);
    }
    
    // Calculate total revenue from sales_orders (using final_price)
    const totalRevenue = salesData?.reduce((sum, sale) => sum + parseFloat(sale.final_price || '0'), 0) || 0;
    
    // Group expenses by category and subcategory
    const expensesByCategory: Record<string, Record<string, any[]>> = {};
    let totalCOGS = 0;
    let totalOperatingExpenses = 0;
    
    expensesData?.forEach((expense: any) => {
      const amount = parseFloat(expense.amount || '0');
      const category = expense.category || 'Other';
      const subcategory = expense.subcategory || 'General';
      
      // Initialize category if not exists
      if (!expensesByCategory[category]) {
        expensesByCategory[category] = {};
      }
      
      // Initialize subcategory if not exists
      if (!expensesByCategory[category][subcategory]) {
        expensesByCategory[category][subcategory] = [];
      }
      
      // Add expense to subcategory
      expensesByCategory[category][subcategory].push({
        account_code: `${category.substring(0, 4).toUpperCase()}-${subcategory.substring(0, 3).toUpperCase()}`,
        account_name: subcategory,
        category: category,
        amount,
        description: expense.description,
        type: expense.type,
        date: expense.date
      });
      
      // Categorize as COGS or Operating Expense
      const cogsCategories = ['Raw Materials', 'Direct Labor', 'Manufacturing Overhead', 'Manufacturing', 'Production'];
      if (cogsCategories.includes(category)) {
        totalCOGS += amount;
      } else {
        totalOperatingExpenses += amount;
      }
    });
    
    // Build sections with categories and subcategories
    const cogsCategories = ['Raw Materials', 'Direct Labor', 'Manufacturing Overhead', 'Manufacturing', 'Production'];
    
    // Helper function to flatten category/subcategory structure
    const flattenExpenses = (categoryFilter: (cat: string) => boolean) => {
      const result: any[] = [];
      Object.entries(expensesByCategory).forEach(([category, subcategories]) => {
        if (categoryFilter(category)) {
          // Calculate category total
          const categoryTotal = Object.values(subcategories).flat().reduce((sum, exp) => sum + exp.amount, 0);
          
          // Add category header
          result.push({
            account_code: category.substring(0, 4).toUpperCase(),
            account_name: category,
            amount: categoryTotal,
            is_category_header: true,
            subcategory_count: Object.keys(subcategories).length
          });
          
          // Add subcategories with all individual items
          Object.entries(subcategories).forEach(([subcategory, items]) => {
            const subcategoryTotal = items.reduce((sum: number, exp: any) => sum + exp.amount, 0);
            
            // Add subcategory header
            result.push({
              account_code: `${category.substring(0, 4).toUpperCase()}-${subcategory.substring(0, 3).toUpperCase()}`,
              account_name: `  ${subcategory}`,
              amount: subcategoryTotal,
              is_subcategory_header: true,
              item_count: items.length
            });
            
            // Add all individual expense items
            items.forEach((item: any) => {
              result.push({
                account_code: item.account_code,
                account_name: `    ${item.description || item.account_name}`,
                amount: item.amount,
                description: item.description,
                type: item.type,
                date: item.date,
                category: item.category,
                subcategory: subcategory,
                is_expense_item: true
              });
            });
          });
        }
      });
      return result;
    };
    
    const sections = {
      REVENUE: [
        {
          account_code: 'REV001',
          account_name: 'Sales Revenue',
          amount: totalRevenue,
          count: salesData?.length || 0,
          is_category_header: true
        },
        // Add individual sales orders
        ...(salesData?.map(sale => ({
          account_code: 'REV001',
          account_name: `  Order #${sale.id.substring(0, 8)} - ${(sale.customers as any)?.name || 'Unknown Customer'}`,
          amount: parseFloat(sale.final_price || '0'),
          date: sale.created_at,
          status: sale.status,
          is_revenue_item: true
        })) || [])
      ],
      COST_OF_GOODS_SOLD: flattenExpenses((cat) => cogsCategories.includes(cat)),
      EXPENSES: flattenExpenses((cat) => !cogsCategories.includes(cat))
    };
    
    const grossProfit = totalRevenue - totalCOGS;
    const netIncome = grossProfit - totalOperatingExpenses;
    
    return NextResponse.json({
      report_type: 'Profit & Loss Statement',
      period: { start_date: startDate, end_date: endDate },
      sections,
      summary: {
        total_revenue: totalRevenue,
        total_cogs: totalCOGS,
        gross_profit: grossProfit,
        total_expenses: totalOperatingExpenses,
        net_income: netIncome,
        sales_count: salesData?.length || 0,
        expense_count: expensesData?.length || 0
      },
      data: [
        ...sections.REVENUE,
        ...sections.COST_OF_GOODS_SOLD,
        ...sections.EXPENSES
      ]
    });
  } catch (error) {
    throw error;
  }
}

async function generateBalanceSheetReport(asOfDate: string) {
  try {
    // Try using stored procedure first
    const { data, error } = await supabase.rpc('generate_balance_sheet_report', {
      p_as_of_date: asOfDate
    });
    
    if (error) {
      return await generateBalanceSheetManual(asOfDate);
    }
    
    // Group data by section
    const sections = {
      ASSETS: [] as any[],
      LIABILITIES: [] as any[],
      EQUITY: [] as any[]
    };
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    
    data?.forEach((item: any) => {
      if (item.section === 'ASSETS') {
        sections.ASSETS.push(item);
        totalAssets += parseFloat(item.amount || 0);
      } else if (item.section === 'LIABILITIES') {
        sections.LIABILITIES.push(item);
        totalLiabilities += parseFloat(item.amount || 0);
      } else if (item.section === 'EQUITY') {
        sections.EQUITY.push(item);
        totalEquity += parseFloat(item.amount || 0);
      }
    });
    
    return NextResponse.json({
      report_type: 'Balance Sheet',
      as_of_date: asOfDate,
      sections,
      summary: {
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        total_equity: totalEquity,
        balance_check: totalAssets - (totalLiabilities + totalEquity)
      },
      data
    });
  } catch (error) {
    throw error;
  }
}

async function generateBalanceSheetManual(asOfDate: string) {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select(`
      id,
      account_code,
      account_name,
      account_type,
      account_subtype,
      normal_balance,
      current_balance,
      opening_balances(debit_amount, credit_amount),
      general_ledger(debit_amount, credit_amount, transaction_date)
    `)
    .in('account_type', ['ASSET', 'LIABILITY', 'EQUITY'])
    .order('account_code');
  
  if (error) throw error;
  
  // Group accounts by type and subtype
  const accountsByTypeAndSubtype: Record<string, Record<string, any[]>> = {};
  
  data?.forEach((account: any) => {
    const openingBalance = account.opening_balances?.[0] 
      ? (account.opening_balances[0].debit_amount || 0) - (account.opening_balances[0].credit_amount || 0)
      : 0;
    const glTransactions = account.general_ledger?.filter(
      (gl: any) => new Date(gl.transaction_date) <= new Date(asOfDate)
    ) || [];
    
    const transactionBalance = glTransactions.reduce((sum: number, gl: any) => {
      if (account.normal_balance === 'DEBIT') {
        return sum + (gl.debit_amount - gl.credit_amount);
      } else {
        return sum + (gl.credit_amount - gl.debit_amount);
      }
    }, 0);
    
    const balance = openingBalance + transactionBalance;
    
    if (Math.abs(balance) > 0.01) {
      const accountType = account.account_type;
      const accountSubtype = account.account_subtype || 'OTHER';
      
      if (!accountsByTypeAndSubtype[accountType]) {
        accountsByTypeAndSubtype[accountType] = {};
      }
      
      if (!accountsByTypeAndSubtype[accountType][accountSubtype]) {
        accountsByTypeAndSubtype[accountType][accountSubtype] = [];
      }
      
      accountsByTypeAndSubtype[accountType][accountSubtype].push({
        account_code: account.account_code,
        account_name: account.account_name,
        amount: balance,
        subtype: accountSubtype
      });
    }
  });
  
  // Helper function to format section with hierarchy
  const buildHierarchicalSection = (accountType: string, subtypeLabels: Record<string, string>) => {
    const result: any[] = [];
    const typeData = accountsByTypeAndSubtype[accountType] || {};
    
    Object.entries(subtypeLabels).forEach(([subtypeKey, subtypeLabel]) => {
      const accounts = typeData[subtypeKey] || [];
      
      if (accounts.length > 0) {
        // Calculate subtotal
        const subtotal = accounts.reduce((sum, acc) => sum + acc.amount, 0);
        
        // Add subtype header
        result.push({
          account_code: subtypeKey.substring(0, 4).toUpperCase(),
          account_name: subtypeLabel,
          amount: subtotal,
          is_subtype_header: true,
          account_count: accounts.length
        });
        
        // Add individual accounts
        accounts.forEach(account => {
          result.push({
            account_code: account.account_code,
            account_name: `  ${account.account_name}`,
            amount: account.amount,
            subtype: account.subtype,
            is_account_item: true
          });
        });
      }
    });
    
    return result;
  };
  
  // Asset subtypes with labels
  const assetSubtypes = {
    'CURRENT_ASSET': 'Current Assets',
    'FIXED_ASSET': 'Property, Plant & Equipment',
    'INTANGIBLE_ASSET': 'Intangible Assets',
    'OTHER_ASSET': 'Other Assets'
  };
  
  // Liability subtypes with labels
  const liabilitySubtypes = {
    'CURRENT_LIABILITY': 'Current Liabilities',
    'LONG_TERM_LIABILITY': 'Long-Term Liabilities',
    'OTHER_LIABILITY': 'Other Liabilities'
  };
  
  // Equity subtypes with labels
  const equitySubtypes = {
    'OWNERS_EQUITY': "Owner's Equity",
    'RETAINED_EARNINGS': 'Retained Earnings',
    'CAPITAL': 'Capital',
    'OTHER': 'Other Equity'
  };
  
  const sections = {
    ASSETS: buildHierarchicalSection('ASSET', assetSubtypes),
    LIABILITIES: buildHierarchicalSection('LIABILITY', liabilitySubtypes),
    EQUITY: buildHierarchicalSection('EQUITY', equitySubtypes)
  };
  
  // Calculate totals
  const totalAssets = sections.ASSETS
    .filter(item => item.is_account_item)
    .reduce((sum, item) => sum + item.amount, 0);
  
  const totalLiabilities = sections.LIABILITIES
    .filter(item => item.is_account_item)
    .reduce((sum, item) => sum + item.amount, 0);
  
  const totalEquity = sections.EQUITY
    .filter(item => item.is_account_item)
    .reduce((sum, item) => sum + item.amount, 0);
  
  return NextResponse.json({
    report_type: 'Balance Sheet',
    as_of_date: asOfDate,
    sections,
    summary: {
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      total_equity: totalEquity,
      balance_check: totalAssets - (totalLiabilities + totalEquity)
    },
    data: [
      ...sections.ASSETS,
      ...sections.LIABILITIES,
      ...sections.EQUITY
    ]
  });
}

async function generateTrialBalanceReport(asOfDate: string) {
  try {
    // Fetch only Balance Sheet ledger types (exclude Revenue/Expense accounts like sales_returns and purchase_returns)
    // Trial Balance shows only Assets, Liabilities, and Equity
    // Revenue and Expenses belong in the Profit & Loss statement
    // hideZeroBalances=true ensures only accounts with outstanding balances appear
    const ledgerTypes = ['customer', 'supplier', 'employee', 'investors', 'loans', 'banks'];
    
    const ledgerPromises = ledgerTypes.map(type =>
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/finance/ledgers-summary?type=${type}&limit=1000&hideZeroBalances=true`)
        .then(res => res.json())
        .catch(err => {
          console.error(`Error fetching ${type} ledgers:`, err);
          return { data: [] };
        })
    );

    const ledgerResults = await Promise.all(ledgerPromises);
    
    // Map ledger types to account types for Trial Balance
    // Only Balance Sheet accounts (Assets, Liabilities, Equity)
    const ledgerTypeMapping: Record<string, { accountType: string; normalBalance: 'DEBIT' | 'CREDIT' }> = {
      'customer': { accountType: 'ASSET', normalBalance: 'DEBIT' },  // Accounts Receivable
      'supplier': { accountType: 'LIABILITY', normalBalance: 'CREDIT' },  // Accounts Payable
      'employee': { accountType: 'LIABILITY', normalBalance: 'CREDIT' },  // Salaries Payable
      'investors': { accountType: 'EQUITY', normalBalance: 'CREDIT' },  // Partner Capital
      'loans': { accountType: 'LIABILITY', normalBalance: 'CREDIT' },  // Loan Payable
      'banks': { accountType: 'ASSET', normalBalance: 'DEBIT' }  // Cash/Bank
    };

    // Group accounts by type (only Balance Sheet accounts)
    const accountsByType: Record<string, any[]> = {
      'ASSET': [],
      'LIABILITY': [],
      'EQUITY': []
    };
    
    let totalDebits = 0;
    let totalCredits = 0;
    let accountCounter = 1000; // Auto-generate account codes

    // Process each ledger type
    ledgerTypes.forEach((ledgerType, typeIndex) => {
      const ledgerData = ledgerResults[typeIndex]?.data || [];
      const mapping = ledgerTypeMapping[ledgerType];
      
      if (!mapping) return;

      ledgerData.forEach((ledger: any) => {
        // Determine balance based on ledger type
        let balance = 0;
        
        if (ledgerType === 'customer') {
          balance = ledger.balance_due || 0; // Amount customers owe (Asset - Debit)
        } else if (ledgerType === 'supplier') {
          balance = ledger.balance_due || 0; // Amount we owe suppliers (Liability - Credit)
        } else if (ledgerType === 'employee') {
          balance = ledger.balance_due || 0; // Amount we owe employees (Liability - Credit)
        } else if (ledgerType === 'investors') {
          balance = ledger.net_equity || 0; // Partner equity (Equity - Credit)
        } else if (ledgerType === 'loans') {
          balance = ledger.current_balance || 0; // Loan balance (Liability - Credit)
        } else if (ledgerType === 'banks') {
          balance = ledger.current_balance_amount || 0; // Bank balance (Asset - Debit)
        }

        // Skip if balance is zero or negligible
        if (Math.abs(balance) < 0.01) return;

        let debitBalance = 0;
        let creditBalance = 0;

        // Place balance in correct column based on normal balance
        if (mapping.normalBalance === 'DEBIT') {
          debitBalance = Math.abs(balance);
        } else {
          creditBalance = Math.abs(balance);
        }

        const accountData = {
          account_code: `${accountCounter++}`,
          account_name: ledger.name,
          account_type: mapping.accountType,
          account_subtype: ledgerType,
          debit_balance: debitBalance,
          credit_balance: creditBalance,
          ledger_type: ledgerType,
          ledger_id: ledger.id,
          is_account_item: true
        };

        accountsByType[mapping.accountType].push(accountData);
        totalDebits += debitBalance;
        totalCredits += creditBalance;
      });
    });

    // Build hierarchical structure
    const trialBalanceData: any[] = [];
    
    // Account type labels (Balance Sheet accounts only)
    const typeLabels: Record<string, string> = {
      'ASSET': 'Assets',
      'LIABILITY': 'Liabilities',
      'EQUITY': 'Equity'
    };
    
    // Add accounts grouped by type
    Object.entries(typeLabels).forEach(([typeKey, typeLabel]) => {
      const accounts = accountsByType[typeKey];
      
      if (accounts && accounts.length > 0) {
        // Calculate type totals
        const typeDebitTotal = accounts.reduce((sum, acc) => sum + acc.debit_balance, 0);
        const typeCreditTotal = accounts.reduce((sum, acc) => sum + acc.credit_balance, 0);
        
        // Add type header
        trialBalanceData.push({
          account_code: typeKey.substring(0, 4).toUpperCase(),
          account_name: typeLabel,
          account_type: typeKey,
          debit_balance: typeDebitTotal,
          credit_balance: typeCreditTotal,
          is_type_header: true,
          account_count: accounts.length
        });
        
        // Add individual accounts (indented)
        accounts.forEach(account => {
          trialBalanceData.push({
            ...account,
            account_name: `  ${account.account_name}`
          });
        });
      }
    });
    
    return NextResponse.json({
      report_type: 'Trial Balance',
      as_of_date: asOfDate,
      accounts: trialBalanceData,
      summary: {
        total_debits: totalDebits,
        total_credits: totalCredits,
        difference: totalDebits - totalCredits,
        is_balanced: Math.abs(totalDebits - totalCredits) < 0.01
      }
    });
  } catch (error) {
    console.error('Error generating Trial Balance:', error);
    throw error;
  }
}

async function generateCashFlowReport(startDate: string, endDate: string) {
  try {
    console.log('Generating Cash Flow Statement for period:', startDate, 'to', endDate);

    // ============================================
    // SECTION 1: OPERATING ACTIVITIES
    // ============================================
    
    // 1.1 Cash received from customers (Payments table - all customer payments)
    // Using 'date' field for filtering (payment_date is timestamp, date is date)
    const { data: customerPayments } = await supabase
      .from('payments')
      .select('amount, date')
      .gte('date', startDate)
      .lte('date', endDate);
    
    const cashFromSales = customerPayments?.reduce((sum, payment) => sum + parseFloat(payment.amount || '0'), 0) || 0;

    // 1.2 Cash paid to suppliers (Vendor Payment History table)
    const { data: vendorPayments } = await supabase
      .from('vendor_payment_history')
      .select('amount, payment_date')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate);
    
    const cashPaidToSuppliers = vendorPayments?.reduce((sum, payment) => sum + parseFloat(payment.amount || '0'), 0) || 0;

    // 1.3 Cash paid for operating expenses 
    // Exclude categories already counted in other sections to avoid double-counting:
    // - Manufacturing: Already in vendor payments
    // - Salaries & Benefits, Salaries: Already in payroll
    // - Capital Expenditure, Asset Purchase, Equipment: Go to Investing Activities
    const { data: operatingExpenses } = await supabase
      .from('expenses')
      .select('amount, category, date')
      .gte('date', startDate)
      .lte('date', endDate)
      .not('category', 'in', '("Capital Expenditure","Asset Purchase","Equipment","Manufacturing","Salaries & Benefits","Salaries")');
    
    const cashPaidForExpenses = operatingExpenses?.reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0) || 0;

    // 1.4 Cash paid to employees (Payroll Records table)
    const { data: payrollPayments } = await supabase
      .from('payroll_records')
      .select('net_salary, processed_at')
      .gte('processed_at', startDate)
      .lte('processed_at', endDate);
    
    const cashPaidToEmployees = payrollPayments?.reduce((sum, payroll) => sum + parseFloat(payroll.net_salary || '0'), 0) || 0;

    const netCashFromOperating = cashFromSales - cashPaidToSuppliers - cashPaidForExpenses - cashPaidToEmployees;

    // ============================================
    // SECTION 2: INVESTING ACTIVITIES
    // ============================================
    
    // 2.1 Cash paid for capital expenditure/assets (from expenses table with new categories)
    const capitalExpenditureCategories = [
      'Capital Expenditure',
      'Asset Purchase',
      'Equipment Purchase',
      'Vehicle Purchase',
      'Property Purchase',
      'Building Purchase',
      'Machinery Purchase',
      'Furniture Purchase',
      'Computer Equipment Purchase',
      'Software Purchase',
      'Asset Improvement',
      'Asset Installation'
    ];
    
    const { data: capitalExpenses } = await supabase
      .from('expenses')
      .select('amount, category, date, description')
      .gte('date', startDate)
      .lte('date', endDate)
      .in('category', capitalExpenditureCategories);
    
    const cashPaidForAssets = capitalExpenses?.reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0) || 0;

    // 2.2 Cash received from asset sales (from asset_disposals table)
    const { data: assetSales } = await supabase
      .from('asset_disposals')
      .select('sale_price, disposal_date, disposal_type')
      .gte('disposal_date', startDate)
      .lte('disposal_date', endDate)
      .eq('disposal_type', 'sale');
    
    const cashFromAssetSales = assetSales?.reduce((sum, sale) => sum + parseFloat(sale.sale_price || '0'), 0) || 0;

    const netCashFromInvesting = cashFromAssetSales - cashPaidForAssets;

    // ============================================
    // SECTION 3: FINANCING ACTIVITIES
    // ============================================
    
    // 3.1 Cash received from loans (Loan Opening Balances - new loans disbursed in period)
    const { data: loanDisbursements } = await supabase
      .from('loan_opening_balances')
      .select('original_loan_amount, loan_start_date')
      .gte('loan_start_date', startDate)
      .lte('loan_start_date', endDate);
    
    const cashFromLoans = loanDisbursements?.reduce((sum, loan) => sum + parseFloat(loan.original_loan_amount || '0'), 0) || 0;

    // 3.2 Cash paid for loan repayments (Liability Payments table)
    const { data: loanRepayments } = await supabase
      .from('liability_payments')
      .select('total_amount, date')
      .gte('date', startDate)
      .lte('date', endDate);
    
    const cashPaidForLoanRepayments = loanRepayments?.reduce((sum, payment) => sum + parseFloat(payment.total_amount || '0'), 0) || 0;

    // 3.3 Cash received from investors/partners (Investments table)
    const { data: investorContributions } = await supabase
      .from('investments')
      .select('amount, investment_date')
      .gte('investment_date', startDate)
      .lte('investment_date', endDate);
    
    const cashFromInvestors = investorContributions?.reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0) || 0;

    // 3.4 Cash paid as dividends/withdrawals (Withdrawals table)
    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select('amount, withdrawal_date')
      .gte('withdrawal_date', startDate)
      .lte('withdrawal_date', endDate);
    
    const cashPaidAsDividends = withdrawals?.reduce((sum, withdrawal) => sum + parseFloat(withdrawal.amount || '0'), 0) || 0;

    const netCashFromFinancing = cashFromLoans + cashFromInvestors - cashPaidForLoanRepayments - cashPaidAsDividends;

    // ============================================
    // CALCULATE TOTALS
    // ============================================
    
    const netCashChange = netCashFromOperating + netCashFromInvesting + netCashFromFinancing;

    // Get opening and closing cash balances from bank accounts
    const { data: bankAccounts } = await supabase
      .from('bank_accounts')
      .select('current_balance, account_name');
    
    const totalCashBalance = bankAccounts?.reduce((sum, account) => sum + parseFloat(account.current_balance || '0'), 0) || 0;
    const openingCash = totalCashBalance - netCashChange;
    const closingCash = totalCashBalance;

    // ============================================
    // BUILD DETAILED CASH FLOW STATEMENT
    // ============================================
    
    const cashFlowStatement = {
      report_type: 'Cash Flow Statement',
      start_date: startDate,
      end_date: endDate,
      
      // SECTIONS - Format expected by frontend
      sections: {
        OPERATING: [
          { 
            account_code: 'OP-001',
            account_name: 'Cash received from customers', 
            amount: cashFromSales
          },
          { 
            account_code: 'OP-002',
            account_name: 'Cash paid to suppliers', 
            amount: -cashPaidToSuppliers
          },
          { 
            account_code: 'OP-003',
            account_name: 'Cash paid for operating expenses', 
            amount: -cashPaidForExpenses
          },
          { 
            account_code: 'OP-004',
            account_name: 'Cash paid to employees', 
            amount: -cashPaidToEmployees
          }
        ],
        
        INVESTING: [
          { 
            account_code: 'INV-001',
            account_name: 'Cash received from sale of assets', 
            amount: cashFromAssetSales
          },
          { 
            account_code: 'INV-002',
            account_name: 'Cash paid for purchase of assets', 
            amount: -cashPaidForAssets
          }
        ],
        
        FINANCING: [
          { 
            account_code: 'FIN-001',
            account_name: 'Cash received from loans', 
            amount: cashFromLoans
          },
          { 
            account_code: 'FIN-002',
            account_name: 'Cash received from investors', 
            amount: cashFromInvestors
          },
          { 
            account_code: 'FIN-003',
            account_name: 'Cash paid for loan repayments', 
            amount: -cashPaidForLoanRepayments
          },
          { 
            account_code: 'FIN-004',
            account_name: 'Cash paid as dividends/withdrawals', 
            amount: -cashPaidAsDividends
          }
        ]
      },

      // SUMMARY - Format expected by frontend
      summary: {
        opening_balance: openingCash,
        net_operating: netCashFromOperating,
        net_investing: netCashFromInvesting,
        net_financing: netCashFromFinancing,
        net_change: netCashChange,
        closing_balance: closingCash
      }
    };

    console.log('Cash Flow Statement generated successfully');
    return NextResponse.json(cashFlowStatement);

  } catch (error) {
    console.error('Error generating Cash Flow Statement:', error);
    throw error;
  }
}

async function generateAccountBalancesReport(asOfDate: string) {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select(`
      id,
      account_code,
      account_name,
      account_type,
      normal_balance,
      current_balance
    `)
    .order('account_code');
  
  if (error) throw error;
  
  return NextResponse.json({
    report_type: 'Account Balances',
    as_of_date: asOfDate,
    data: data?.filter(account => Math.abs(account.current_balance || 0) > 0.01) || [],
    summary: {
      total_accounts: data?.length || 0,
      accounts_with_balance: data?.filter(account => Math.abs(account.current_balance || 0) > 0.01).length || 0
    }
  });
}
