import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
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
      customer: (item.quotes as any)?.customer || 'Unknown',
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

    const supplierStats = poData?.reduce((acc: Record<string, any>, po) => {
      const supplierName = (po.suppliers as any)?.name || 'Unknown';
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

    return NextResponse.json({
      success: true,
      data: {
        customOrdersRequiringPO,
        supplierPerformance,
        pendingApprovals
      }
    });

  } catch (error) {
    console.error('Error fetching procurement analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch procurement analytics' },
      { status: 500 }
    );
  }
}
