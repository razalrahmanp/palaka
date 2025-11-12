import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    console.log('📦 Fetching Procurement Dashboard Data:', { startDate, endDate });
    // Custom Orders Requiring PO
    const { data: customOrdersData } = await supabase
      .from('quote_custom_items')
      .select(`
        id,
        description,
        quantity,
        status,
        estimated_cost,
        quote_id,
        quotes!inner(customer_id, customer)
      `)
      .in('status', ['pending', 'in_production'])
      .limit(50);

    const customOrdersRequiringPO = customOrdersData?.map(item => ({
      id: item.id,
      quoteId: item.quote_id,
      customer: (item.quotes as { customer?: string })?.customer || 'Unknown',
      description: item.description || 'No description',
      quantity: item.quantity || 0,
      status: item.status,
      estimatedCost: item.estimated_cost || 0
    })) || [];

    // Supplier Performance
    const { data: poData } = await supabase
      .from('purchase_orders')
      .select(`
        supplier_id,
        total,
        created_at,
        due_date,
        status,
        suppliers!inner(name)
      `);

    interface SupplierStats {
      poCount: number;
      totalValue: number;
      leadTimes: number[];
      onTimeDeliveries: number;
      totalDeliveries: number;
    }

    const supplierStats = poData?.reduce((acc: Record<string, SupplierStats>, po) => {
      const supplierName = (po.suppliers as { name?: string })?.name || 'Unknown';
      if (!acc[supplierName]) {
        acc[supplierName] = {
          poCount: 0,
          totalValue: 0,
          leadTimes: [],
          onTimeDeliveries: 0,
          totalDeliveries: 0
        };
      }
      
      acc[supplierName].poCount++;
      acc[supplierName].totalValue += po.total || 0;
      
      if (po.due_date && po.created_at) {
        const leadTime = Math.floor((new Date(po.due_date).getTime() - new Date(po.created_at).getTime()) / (1000 * 60 * 60 * 24));
        acc[supplierName].leadTimes.push(leadTime);
      }
      
      return acc;
    }, {}) || {};

    const supplierPerformance = Object.entries(supplierStats).map(([supplier, stats]) => ({
      supplier,
      poCount: stats.poCount,
      totalValue: stats.totalValue,
      avgLeadTime: stats.leadTimes.length > 0 
        ? Math.round(stats.leadTimes.reduce((sum: number, time: number) => sum + time, 0) / stats.leadTimes.length)
        : 0,
      onTimeRate: stats.totalDeliveries > 0 
        ? Math.round((stats.onTimeDeliveries / stats.totalDeliveries) * 100)
        : 95 // Mock data
    }));

    // Pending Approvals (mock data)
    const pendingApprovals = [
      {
        id: '1',
        supplier: 'ABC Furniture Supplies',
        amount: 45000,
        requestedDate: '2024-01-15',
        urgency: 'high' as const
      },
      {
        id: '2',
        supplier: 'Premium Wood Co.',
        amount: 32000,
        requestedDate: '2024-01-14',
        urgency: 'medium' as const
      },
      {
        id: '3',
        supplier: 'Metal Works Ltd.',
        amount: 18000,
        requestedDate: '2024-01-13',
        urgency: 'low' as const
      }
    ];

    // Fetch all required data in parallel
    const [
      purchaseOrdersResult,
      vendorsResult,
      vendorBillsResult,
      vendorPaymentsResult
    ] = await Promise.all([
      // Purchase orders
      supabase
        .from('purchase_orders')
        .select('id, total, status, created_at, supplier_id, due_date')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z'),

      // Vendors/Suppliers
      supabase
        .from('suppliers')
        .select('id, name, created_at'),

      // Vendor Bills (All time to track overdue)
      supabase
        .from('vendor_bills')
        .select('id, total_amount, paid_amount, status, created_at, due_date, supplier_id, suppliers(name)')
        .order('created_at', { ascending: false }),

      // Vendor Payments
      supabase
        .from('vendor_payments')
        .select('id, amount, payment_date')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate + 'T23:59:59.999Z')
    ]);

    // Calculate Total Purchases
    const totalPurchases = purchaseOrdersResult.data?.reduce((sum, po) => 
      sum + (po.total || 0), 0
    ) || 0;

    // Calculate Total Vendor Bills
    const totalVendorBills = vendorBillsResult.data?.reduce((sum, bill) => 
      sum + (bill.total_amount || 0), 0
    ) || 0;

    // Calculate Total Vendor Payments
    const totalVendorPayments = vendorPaymentsResult.data?.reduce((sum, payment) => 
      sum + (payment.amount || 0), 0
    ) || 0;

    // Calculate Vendor Bills Outstanding
    const vendorBillsPaid = vendorBillsResult.data?.reduce((sum, bill) => 
      sum + (bill.paid_amount || 0), 0
    ) || 0;
    const vendorBillsPending = totalVendorBills - vendorBillsPaid;

    console.log('💰 Procurement Financial Summary:', {
      totalPurchases,
      totalVendorBills,
      totalVendorPayments,
      vendorBillsPaid,
      vendorBillsPending,
      billsCount: vendorBillsResult.data?.length || 0,
      paymentsCount: vendorPaymentsResult.data?.length || 0
    });

    // Calculate Pending POs
    const pendingPOsCount = purchaseOrdersResult.data?.filter(po => 
      po.status === 'pending' || po.status === 'approved' || po.status === 'partial'
    ).length || 0;

    // Calculate Active Suppliers (unique suppliers with orders this month)
    const activeSuppliersCount = new Set(
      purchaseOrdersResult.data?.map(po => po.supplier_id).filter(Boolean)
    ).size;

    // Calculate Average Lead Time
    const ordersWithDueDate = purchaseOrdersResult.data?.filter(po => 
      po.due_date && po.created_at
    ) || [];
    
    let totalLeadTime = 0;
    ordersWithDueDate.forEach(po => {
      const created = new Date(po.created_at!);
      const due = new Date(po.due_date!);
      const leadTime = Math.abs((due.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      totalLeadTime += leadTime;
    });
    
    const avgLeadTime = ordersWithDueDate.length > 0 
      ? (totalLeadTime / ordersWithDueDate.length).toFixed(1) 
      : '8.5';

    // Purchase Trend (last 7 days)
    const purchaseTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayPurchases = purchaseOrdersResult.data?.filter(po => 
        po.created_at?.startsWith(dateStr)
      ).reduce((sum, po) => sum + (po.total || 0), 0) || 0;

      const dayOrders = purchaseOrdersResult.data?.filter(po => 
        po.created_at?.startsWith(dateStr)
      ).length || 0;

      purchaseTrend.push({
        date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        purchases: dayPurchases,
        orders: dayOrders
      });
    }

    // Top Suppliers by Spend
    const supplierSpend: Record<string, { spend: number; orders: number }> = {};
    
    purchaseOrdersResult.data?.forEach(po => {
      const supplierId = po.supplier_id || 'unknown';
      if (!supplierSpend[supplierId]) {
        supplierSpend[supplierId] = { spend: 0, orders: 0 };
      }
      supplierSpend[supplierId].spend += po.total || 0;
      supplierSpend[supplierId].orders += 1;
    });

    // Fetch supplier names
    const supplierIds = Object.keys(supplierSpend).filter(id => id !== 'unknown');
    let supplierNames: Record<string, string> = {};
    
    if (supplierIds.length > 0 && vendorsResult.data) {
      supplierNames = vendorsResult.data
        .filter(s => supplierIds.includes(s.id))
        .reduce((acc, supplier) => {
          acc[supplier.id] = supplier.name;
          return acc;
        }, {} as Record<string, string>);
    }

    const topSuppliers = Object.entries(supplierSpend)
      .map(([id, data]) => ({
        name: supplierNames[id] || 'Unknown Supplier',
        value: data.spend,
        orders: data.orders
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Payment Status (mock for now)
    const totalPaid = totalPurchases * 0.65;
    const totalPending = totalPurchases * 0.28;
    const overdueAmount = totalPurchases * 0.07;

    const paymentStatus = [
      { name: 'Paid', value: Math.round(totalPaid) },
      { name: 'Pending', value: Math.round(totalPending) },
      { name: 'Overdue', value: Math.round(overdueAmount) },
    ];

    // Purchase Order Status Breakdown
    const poStatusBreakdown: Record<string, { count: number; value: number }> = {};
    
    purchaseOrdersResult.data?.forEach(po => {
      const status = po.status || 'unknown';
      if (!poStatusBreakdown[status]) {
        poStatusBreakdown[status] = { count: 0, value: 0 };
      }
      poStatusBreakdown[status].count += 1;
      poStatusBreakdown[status].value += po.total || 0;
    });

    const statusLabels: Record<string, string> = {
      'pending': 'Pending',
      'approved': 'Approved',
      'ordered': 'Ordered',
      'partial': 'Partially Received',
      'received': 'Received',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };

    const poStatusData = Object.entries(poStatusBreakdown)
      .map(([status, data]) => ({
        status: statusLabels[status] || status,
        count: data.count,
        value: Math.round(data.value),
        percentage: purchaseOrdersResult.data?.length 
          ? Math.round((data.count / purchaseOrdersResult.data.length) * 100)
          : 0
      }))
      .sort((a, b) => b.value - a.value);

    console.log('📊 PO Status Breakdown:', poStatusData);

    // Vendor Bills Overdue Analysis
    const today = new Date();
    const vendorOverdueMap: Record<string, { 
      vendorName: string; 
      overdueAmount: number; 
      overdueCount: number;
      totalOverdueDays: number;
    }> = {};

    vendorBillsResult.data?.forEach(bill => {
      const supplierId = bill.supplier_id;
      const supplierName = (bill.suppliers as { name?: string })?.name || 'Unknown Vendor';
      const dueDate = bill.due_date ? new Date(bill.due_date) : null;
      const isPaid = (bill.paid_amount || 0) >= (bill.total_amount || 0);
      
      // Check if bill is overdue (past due date and not fully paid)
      if (dueDate && !isPaid && dueDate < today) {
        const overdueAmount = (bill.total_amount || 0) - (bill.paid_amount || 0);
        const overdueDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (!vendorOverdueMap[supplierId]) {
          vendorOverdueMap[supplierId] = {
            vendorName: supplierName,
            overdueAmount: 0,
            overdueCount: 0,
            totalOverdueDays: 0
          };
        }
        
        vendorOverdueMap[supplierId].overdueAmount += overdueAmount;
        vendorOverdueMap[supplierId].overdueCount += 1;
        vendorOverdueMap[supplierId].totalOverdueDays += overdueDays;
      }
    });

    const vendorOverdueData = Object.values(vendorOverdueMap)
      .map(vendor => ({
        name: vendor.vendorName,
        overdueAmount: Math.round(vendor.overdueAmount),
        overdueCount: vendor.overdueCount,
        avgOverdueDays: Math.round(vendor.totalOverdueDays / vendor.overdueCount)
      }))
      .sort((a, b) => b.overdueAmount - a.overdueAmount)
      .slice(0, 10); // Top 10 vendors with overdue bills

    console.log('⚠️ Vendor Bills Overdue:', vendorOverdueData);

    return NextResponse.json({
      success: true,
      data: {
        totalPurchases: Math.round(totalPurchases),
        totalVendorBills: Math.round(totalVendorBills),
        totalVendorPayments: Math.round(totalVendorPayments),
        vendorBillsPaid: Math.round(vendorBillsPaid),
        vendorBillsPending: Math.round(vendorBillsPending),
        pendingPOs: pendingPOsCount,
        activeSuppliers: activeSuppliersCount,
        avgLeadTime,
        returnRate: '2.3',
        purchaseTrend,
        supplierPerformance,
        topSuppliers,
        paymentStatus,
        poStatusBreakdown: poStatusData,
        vendorOverdueData,
        customOrdersRequiringPO,
        pendingApprovals,
        summary: {
          totalOrders: purchaseOrdersResult.data?.length || 0,
          totalPaid: Math.round(totalPaid),
          totalPending: Math.round(totalPending + overdueAmount),
          billsCount: vendorBillsResult.data?.length || 0,
          paymentsCount: vendorPaymentsResult.data?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching procurement data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch procurement data' 
      },
      { status: 500 }
    );
  }
}
