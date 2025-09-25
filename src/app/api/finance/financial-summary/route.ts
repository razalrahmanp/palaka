import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. Get sales orders and calculate payment data from invoices
    const { data: salesOrdersData, error: salesOrdersError } = await supabase
      .from('sales_orders')
      .select('id, final_price, created_at');

    if (salesOrdersError) {
      console.error('Error fetching sales orders data:', salesOrdersError);
    }

    // Get all invoices to calculate payment metrics
    const { data: allInvoicesData, error: allInvoicesError } = await supabase
      .from('invoices')
      .select('id, sales_order_id, total');

    if (allInvoicesError) {
      console.error('Error fetching invoices data:', allInvoicesError);
    }

    // Get cash payments only for accurate calculation of cash balance
    const { data: allPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('invoice_id, amount, method');

    if (paymentsError) {
      console.error('Error fetching payments data:', paymentsError);
    }

    // Calculate actual cash balance from CASH payments only
    const actualCashBalance = allPayments
      ?.filter(payment => payment.method && payment.method.toLowerCase() === 'cash')
      .reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    // Calculate real revenue and payment metrics from sales data
    const salesOrders = salesOrdersData || [];
    const allInvoices = allInvoicesData || [];
    
    const totalSalesRevenue = salesOrders.reduce((sum, order) => sum + (order.final_price || 0), 0);
    
    // Calculate total payments received from invoices
    let totalPaymentsReceived = 0;
    let fullyPaidOrders = 0;
    let partialPaidOrders = 0;
    let pendingPaymentOrders = 0;
    
    salesOrders.forEach(order => {
      const orderTotal = order.final_price || 0;
      const orderInvoices = allInvoices.filter(inv => inv.sales_order_id === order.id);
      
      // Calculate actual payments for this order using payments table
      let orderPaidAmount = 0;
      if (orderInvoices.length > 0 && allPayments) {
        const invoiceIds = orderInvoices.map(inv => inv.id);
        const orderPayments = allPayments.filter(payment => 
          invoiceIds.includes(payment.invoice_id));
        orderPaidAmount = orderPayments.reduce((sum, payment) => 
          sum + (payment.amount || 0), 0);
      }
      
      totalPaymentsReceived += orderPaidAmount;
      
      // Determine payment status
      if (orderPaidAmount === 0) {
        pendingPaymentOrders++;
      } else if (orderPaidAmount >= orderTotal) {
        fullyPaidOrders++;
      } else {
        partialPaidOrders++;
      }
    });
    
    const totalOutstanding = totalSalesRevenue - totalPaymentsReceived;
    
    // Collection rate
    const collectionRate = totalSalesRevenue > 0 ? (totalPaymentsReceived / totalSalesRevenue) * 100 : 0;

    // 2. Get inventory assets (current stock value)
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_items')
      .select(`
        quantity,
        products!inner(cost, supplier_id)
      `);

    if (inventoryError) {
      console.error('Error fetching inventory items:', inventoryError);
    }

    // Calculate total inventory asset value (stock cost)
    const totalInventoryAssets = inventoryItems?.reduce((sum, item) => {
      const quantity = item.quantity || 0;
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const cost = product?.cost || 0;
      return sum + (quantity * cost);
    }, 0) || 0;

    // 3. Get traditional financial position data from accounts (for other assets, liabilities, etc.)
    const { data: accounts, error: accountsError } = await supabase
      .from('chart_of_accounts')
      .select('*');

    if (accountsError) {
      console.error('Error fetching chart of accounts:', accountsError);
    }

    // Calculate financial metrics from chart of accounts (excluding inventory)
    let totalNonInventoryAssets = 0; // Assets excluding inventory
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalExpenses = 0;
    let accountsPayable = 0;

    accounts?.forEach(account => {
      if (account.is_active) {
        switch (account.account_type) {
          case 'ASSET':
            // Exclude inventory-related assets since we'll use real inventory data
            if (account.account_subtype !== 'INVENTORY' && 
                !account.name?.toLowerCase().includes('inventory') && 
                !account.name?.toLowerCase().includes('stock')) {
              totalNonInventoryAssets += account.current_balance || 0;
            }
            break;
            
          case 'LIABILITY':
            totalLiabilities += account.current_balance || 0;
            
            // Check for accounts payable
            if (account.account_subtype === 'ACCOUNTS_PAYABLE') {
              accountsPayable += account.current_balance || 0;
            }
            break;
            
          case 'EQUITY':
            totalEquity += account.current_balance || 0;
            break;
            
          case 'EXPENSE':
            totalExpenses += account.current_balance || 0;
            break;
        }
      }
    });

    // 3. Get invoice metrics with full invoice data
    const { data: detailedInvoices, error: detailedInvoicesError } = await supabase
      .from('invoices')
      .select('*');

    if (detailedInvoicesError) {
      console.error('Error fetching invoices:', detailedInvoicesError);
    }

    // Calculate invoice metrics
    const pendingInvoices = detailedInvoices?.filter(inv => inv.status === 'unpaid' || inv.status === 'partially_paid').length || 0;
    const overdueInvoices = detailedInvoices?.filter(inv => {
      // Consider invoice overdue if it has a due date in the past and is not fully paid
      const dueDate = inv.due_date ? new Date(inv.due_date) : null;
      return dueDate && dueDate < new Date() && 
        (inv.status === 'unpaid' || inv.status === 'partially_paid');
    }).length || 0;

    // 4. Get journal entries
    const { data: journalEntries, error: journalError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('status', 'DRAFT');

    if (journalError) {
      console.error('Error fetching journal entries:', journalError);
    }

    const unpostedJournals = journalEntries?.length || 0;

    // Calculate financial metrics using real sales data
    const netIncome = totalSalesRevenue - totalExpenses;
    
    // Calculate current ratio (liquidity) - using outstanding as accounts receivable
    const accountsReceivable = totalOutstanding;
    
    // Total assets = Non-inventory assets + Real inventory + Accounts receivable
    const totalAssets = totalNonInventoryAssets + totalInventoryAssets + accountsReceivable;
    
    console.log('=== DETAILED FINANCIAL SUMMARY DEBUG ===');
    console.log('Total Inventory Assets (from inventory_items):', totalInventoryAssets);
    console.log('Total Non-Inventory Assets (from chart_of_accounts, excluding inventory):', totalNonInventoryAssets);
    console.log('Accounts Receivable (unpaid sales orders):', accountsReceivable);
    console.log('Total Assets:', totalAssets);
    console.log('Total Liabilities:', totalLiabilities);
    console.log('============================================');
    
    const currentRatio = totalLiabilities === 0 ? 0 : totalAssets / totalLiabilities;
    
    // Calculate profit margin using real sales data
    const profitMargin = totalSalesRevenue === 0 ? 0 : (netIncome / totalSalesRevenue) * 100;
    
    // Determine cash flow trend based on payments vs outstanding
    let cashFlowTrend: 'up' | 'down' | 'stable' = 'stable';
    
    if (collectionRate > 80) {
      cashFlowTrend = 'up';
    } else if (collectionRate < 50) {
      cashFlowTrend = 'down';
    }

    return NextResponse.json({
      financialSummary: {
        totalAssets: totalAssets, // Include all assets: non-inventory accounts + real inventory + receivables
        totalLiabilities,
        totalEquity,
        totalRevenue: totalSalesRevenue, // Use real sales revenue
        totalExpenses,
        netIncome,
        cashBalance: actualCashBalance, // Use actual total payments (not filtered by sales orders)
        accountsReceivable,
        accountsPayable,
        currentRatio,
        inventoryAssets: totalInventoryAssets // Add inventory breakdown
      },
      metrics: {
        pendingInvoices,
        overdueInvoices,
        unpostedJournals,
        cashFlowTrend,
        profitMargin
      },
      // Add new sales payment metrics
      salesMetrics: {
        totalSalesRevenue,
        totalPaymentsReceived,
        totalOutstanding,
        collectionRate,
        fullyPaidOrders,
        partialPaidOrders,
        pendingPaymentOrders
      },
      // Debug information to identify calculation issues
      debug: {
        totalInventoryAssets,
        totalNonInventoryAssets,
        accountsReceivable,
        totalAssetsBreakdown: `${totalNonInventoryAssets} + ${totalInventoryAssets} + ${accountsReceivable} = ${totalAssets}`,
        inventoryItemCount: inventoryItems?.length || 0,
        assetAccountCount: accounts?.filter(acc => acc.account_type === 'ASSET' && acc.is_active).length || 0,
        largestInventoryValues: inventoryItems
          ?.map(item => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            const value = (item.quantity || 0) * (product?.cost || 0);
            return { quantity: item.quantity, cost: product?.cost, value };
          })
          .sort((a, b) => (b.value || 0) - (a.value || 0))
          .slice(0, 5) || [],
        largestAssetAccounts: accounts
          ?.filter(acc => acc.account_type === 'ASSET' && acc.is_active && 
            acc.account_subtype !== 'INVENTORY' && 
            !acc.name?.toLowerCase().includes('inventory') && 
            !acc.name?.toLowerCase().includes('stock'))
          .sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0))
          .slice(0, 5)
          .map(acc => ({ name: acc.name, balance: acc.current_balance })) || []
      }
    });

  } catch (error) {
    console.error('Error in financial-summary API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial summary' },
      { status: 500 }
    );
  }
}
