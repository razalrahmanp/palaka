import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SalesRep {
  id: string;
  name: string;
  email: string;
  customersAssigned: number;
  conversions: number;
  conversionRate: number;
  totalAssigned: number;
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  totalDiscount: number;
  avgOrderValue: number;
  totalReturns: number;
  pendingReturns: number;
  totalComplaints: number;
  openComplaints: number;
  // Order status breakdown
  pendingOrders: number;
  completedOrders: number;
  deliveredOrders: number;
  // Collection tracking
  deliveredCollected: number;
  deliveredPending: number;
  totalCollected: number;
  totalPending: number;
  totalNotInvoiced: number;
}

export async function GET(request: Request) {
  try {
    // Extract date range from query params
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Default to current month if no dates provided
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const defaultStartDate = new Date(year, month, 1).toISOString().split('T')[0];
    const defaultEndDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const finalStartDate = startDate || defaultStartDate;
    const finalEndDate = endDate || defaultEndDate;

    // Calculate previous period for comparison
    const start = new Date(finalStartDate);
    const end = new Date(finalEndDate);
    const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - periodDays + 1);
    
    const previousStartDate = prevStart.toISOString().split('T')[0];
    const previousEndDate = prevEnd.toISOString().split('T')[0];

    console.log('👥 Fetching Sales Reps Dashboard Data:', { 
      startDate: finalStartDate, 
      endDate: finalEndDate,
      previousStartDate,
      previousEndDate,
      periodDays
    });

    // Fetch all sales reps (employees with sales rep position)
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, email, position, user_id')
      .eq('employment_status', 'active');

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      throw employeesError;
    }

    // Filter sales reps (check position field instead of role)
    const salesReps = employees.filter((emp) => 
      emp.position?.toLowerCase().includes('sales') || 
      emp.position?.toLowerCase().includes('rep')
    );

    // Get all customers for all-time data (for sales reps not in current period)
    const { data: allCustomers, error: allCustomersError } = await supabase
      .from('customers')
      .select(`
        id, 
        assigned_sales_rep_id, 
        sales_orders(
          id, 
          status,
          created_at,
          final_price,
          discount_amount,
          sales_order_items(
            id,
            quantity,
            final_price,
            cost,
            product_id,
            custom_product_id,
            products(cost),
            custom_products(cost_price)
          )
        )
      `);

    if (allCustomersError) {
      console.error('Error fetching all customers:', allCustomersError);
    }

    // Fetch returns data
    const { data: allReturns } = await supabase
      .from('returns')
      .select(`
        id,
        status,
        created_at,
        order_id,
        sales_orders!inner(sales_representative_id, id)
      `);

    // Fetch complaints data
    const { data: allComplaints } = await supabase
      .from('customer_complaints')
      .select('id, status, created_at, sales_rep_id');

    // Fetch invoices for collection tracking
    const { data: allInvoices } = await supabase
      .from('invoices')
      .select(`
        id,
        order_id,
        total_amount,
        amount_paid,
        payment_status,
        created_at,
        sales_orders!inner(sales_representative_id, status, created_at)
      `);

    // Helper function to calculate metrics for a specific period
    const calculatePeriodMetrics = (periodStart: string, periodEnd: string) => {
      const periodOrders = allCustomers?.flatMap(c => 
        (c.sales_orders || []).filter(o => {
          const orderDate = o.created_at?.split('T')[0];
          return orderDate && orderDate >= periodStart && orderDate <= periodEnd;
        })
      ) || [];

      const periodReturns = allReturns?.filter(r => {
        const returnDate = r.created_at?.split('T')[0];
        return returnDate && returnDate >= periodStart && returnDate <= periodEnd;
      }) || [];

      const periodComplaints = allComplaints?.filter(c => {
        const complaintDate = c.created_at?.split('T')[0];
        return complaintDate && complaintDate >= periodStart && complaintDate <= periodEnd;
      }) || [];

      let revenue = 0;
      let discount = 0;
      let cost = 0;

      periodOrders.forEach((order) => {
        revenue += order.final_price || 0;
        discount += order.discount_amount || 0;
        
        const items = order.sales_order_items || [];
        items.forEach((item) => {
          let itemCost = 0;
          if (item.product_id && item.products) {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            itemCost = (product?.cost || 0) * item.quantity;
          } else if (item.custom_product_id && item.custom_products) {
            const customProduct = Array.isArray(item.custom_products) ? item.custom_products[0] : item.custom_products;
            itemCost = (customProduct?.cost_price || 0) * item.quantity;
          } else {
            itemCost = (item.cost || 0) * item.quantity;
          }
          cost += itemCost;
        });
      });

      const profit = revenue - cost;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        orders: periodOrders.length,
        revenue,
        profit,
        profitMargin,
        discount,
        avgOrderValue: periodOrders.length > 0 ? revenue / periodOrders.length : 0,
        returns: periodReturns.length,
        complaints: periodComplaints.length,
      };
    };

    // Calculate current and previous period metrics
    const currentPeriodMetrics = calculatePeriodMetrics(finalStartDate, finalEndDate);
    const previousPeriodMetrics = calculatePeriodMetrics(previousStartDate, previousEndDate);

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const trends = {
      revenueTrend: calculateChange(currentPeriodMetrics.revenue, previousPeriodMetrics.revenue),
      profitTrend: calculateChange(currentPeriodMetrics.profit, previousPeriodMetrics.profit),
      profitMarginTrend: calculateChange(currentPeriodMetrics.profitMargin, previousPeriodMetrics.profitMargin),
      ordersTrend: calculateChange(currentPeriodMetrics.orders, previousPeriodMetrics.orders),
      avgOrderValueTrend: calculateChange(currentPeriodMetrics.avgOrderValue, previousPeriodMetrics.avgOrderValue),
      discountTrend: calculateChange(currentPeriodMetrics.discount, previousPeriodMetrics.discount),
      returnsTrend: calculateChange(currentPeriodMetrics.returns, previousPeriodMetrics.returns),
      complaintsTrend: calculateChange(currentPeriodMetrics.complaints, previousPeriodMetrics.complaints),
    };

    // Calculate metrics for each sales rep
    const salesRepsData: SalesRep[] = salesReps.map((rep) => {
      // Use user_id to match with customers.assigned_sales_rep_id
      const repUserId = rep.user_id;
      
      // All customers assigned to this rep (all-time)
      const allAssigned = allCustomers?.filter((c) => c.assigned_sales_rep_id === repUserId) || [];
      
      // Converted customers (those with orders IN THE SELECTED PERIOD)
      const converted = allAssigned.filter((c) => {
        const orders = c.sales_orders || [];
        return orders.some(order => {
          const orderDate = order.created_at?.split('T')[0];
          return orderDate && orderDate >= finalStartDate && orderDate <= finalEndDate;
        });
      });

      // Calculate sales metrics from orders IN THE SELECTED PERIOD
      let totalRevenue = 0;
      let totalDiscount = 0;
      let totalCost = 0;
      let totalOrders = 0;
      
      allAssigned.forEach((customer) => {
        const orders = customer.sales_orders || [];
        
        // Filter orders by selected date range
        const periodOrders = orders.filter(order => {
          const orderDate = order.created_at?.split('T')[0];
          return orderDate && orderDate >= finalStartDate && orderDate <= finalEndDate;
        });
        
        totalOrders += periodOrders.length;
        
        periodOrders.forEach((order) => {
          totalRevenue += order.final_price || 0;
          totalDiscount += order.discount_amount || 0;
          
          // Calculate cost from items
          const items = order.sales_order_items || [];
          items.forEach((item) => {
            let itemCost = 0;
            if (item.product_id && item.products) {
              const product = Array.isArray(item.products) ? item.products[0] : item.products;
              itemCost = (product?.cost || 0) * item.quantity;
            } else if (item.custom_product_id && item.custom_products) {
              const customProduct = Array.isArray(item.custom_products) ? item.custom_products[0] : item.custom_products;
              itemCost = (customProduct?.cost_price || 0) * item.quantity;
            } else {
              itemCost = (item.cost || 0) * item.quantity;
            }
            totalCost += itemCost;
          });
        });
      });

      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate returns for this rep IN THE SELECTED PERIOD
      const repReturns = allReturns?.filter((ret) => {
        const returnDate = ret.created_at?.split('T')[0];
        const order = Array.isArray(ret.sales_orders) ? ret.sales_orders[0] : ret.sales_orders;
        return order?.sales_representative_id === repUserId &&
               returnDate && returnDate >= finalStartDate && returnDate <= finalEndDate;
      }) || [];
      const pendingReturns = repReturns.filter((ret) => ret.status === 'pending').length;
      
      // Calculate complaints for this rep IN THE SELECTED PERIOD
      const repComplaints = allComplaints?.filter((complaint) => {
        const complaintDate = complaint.created_at?.split('T')[0];
        return complaint.sales_rep_id === repUserId &&
               complaintDate && complaintDate >= finalStartDate && complaintDate <= finalEndDate;
      }) || [];
      const openComplaints = repComplaints.filter((c) =>
        c.status === 'open' || c.status === 'in_progress'
      ).length;

      const conversionRate = allAssigned.length > 0 
        ? (converted.length / allAssigned.length) * 100 
        : 0;

      // Calculate order status breakdown for this rep IN THE SELECTED PERIOD
      let pendingOrders = 0;
      let completedOrders = 0;
      let deliveredOrders = 0;

      allAssigned.forEach((customer) => {
        const orders = customer.sales_orders || [];
        const periodOrders = orders.filter(order => {
          const orderDate = order.created_at?.split('T')[0];
          return orderDate && orderDate >= finalStartDate && orderDate <= finalEndDate;
        });

        periodOrders.forEach((order) => {
          if (order.status === 'pending') pendingOrders++;
          else if (order.status === 'completed') completedOrders++;
          else if (order.status === 'delivered') deliveredOrders++;
        });
      });

      // Calculate collection metrics for this rep IN THE SELECTED PERIOD
      const repInvoices = allInvoices?.filter((invoice) => {
        const order = Array.isArray(invoice.sales_orders) ? invoice.sales_orders[0] : invoice.sales_orders;
        const invoiceDate = invoice.created_at?.split('T')[0];
        return order?.sales_representative_id === repUserId &&
               invoiceDate && invoiceDate >= finalStartDate && invoiceDate <= finalEndDate;
      }) || [];

      let deliveredCollected = 0;
      let deliveredPending = 0;
      let totalCollected = 0;
      let totalPending = 0;

      repInvoices.forEach((invoice) => {
        const order = Array.isArray(invoice.sales_orders) ? invoice.sales_orders[0] : invoice.sales_orders;
        const amountPaid = invoice.amount_paid || 0;
        const totalAmount = invoice.total_amount || 0;
        const pendingAmount = totalAmount - amountPaid;

        totalCollected += amountPaid;
        totalPending += pendingAmount;

        if (order?.status === 'delivered') {
          deliveredCollected += amountPaid;
          deliveredPending += pendingAmount;
        }
      });

      // Calculate not invoiced amount (orders without invoices)
      let totalNotInvoiced = 0;
      allAssigned.forEach((customer) => {
        const orders = customer.sales_orders || [];
        const periodOrders = orders.filter(order => {
          const orderDate = order.created_at?.split('T')[0];
          return orderDate && orderDate >= finalStartDate && orderDate <= finalEndDate;
        });

        periodOrders.forEach((order) => {
          const hasInvoice = repInvoices.some(inv => inv.order_id === order.id);
          if (!hasInvoice) {
            totalNotInvoiced += order.final_price || 0;
          }
        });
      });

      return {
        id: rep.id,
        name: rep.name,
        email: rep.email,
        customersAssigned: allAssigned.length,
        conversions: converted.length,
        conversionRate: conversionRate,
        totalOrders: totalOrders,
        totalRevenue: totalRevenue,
        totalProfit: totalProfit,
        profitMargin: profitMargin,
        totalDiscount: totalDiscount,
        avgOrderValue: avgOrderValue,
        totalReturns: repReturns.length,
        pendingReturns: pendingReturns,
        totalComplaints: repComplaints.length,
        openComplaints: openComplaints,
        totalAssigned: allAssigned.length,
        // Order status breakdown
        pendingOrders,
        completedOrders,
        deliveredOrders,
        // Collection tracking
        deliveredCollected,
        deliveredPending,
        totalCollected,
        totalPending,
        totalNotInvoiced,
      };
    });

    // Sort by revenue (descending) - more meaningful for sales performance
    salesRepsData.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Calculate comprehensive KPIs
    const totalSalesReps = salesRepsData.length;
    const totalCustomersAssigned = salesRepsData.reduce((sum, rep) => sum + rep.customersAssigned, 0);
    const totalConversions = salesRepsData.reduce((sum, rep) => sum + rep.conversions, 0);
    const totalRevenue = salesRepsData.reduce((sum, rep) => sum + rep.totalRevenue, 0);
    const totalProfit = salesRepsData.reduce((sum, rep) => sum + rep.totalProfit, 0);
    const totalOrders = salesRepsData.reduce((sum, rep) => sum + rep.totalOrders, 0);
    const totalDiscount = salesRepsData.reduce((sum, rep) => sum + rep.totalDiscount, 0);
    const totalReturns = salesRepsData.reduce((sum, rep) => sum + rep.totalReturns, 0);
    const totalComplaints = salesRepsData.reduce((sum, rep) => sum + rep.totalComplaints, 0);
    
    const avgConversionRate = totalCustomersAssigned > 0 
      ? (totalConversions / totalCustomersAssigned) * 100 
      : 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const overallProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Top performers by different metrics
    const topPerformersByRevenue = salesRepsData.slice(0, 5).map(rep => ({
      name: rep.name,
      revenue: rep.totalRevenue,
      orders: rep.totalOrders,
      profit: rep.totalProfit,
    }));

    const topPerformersByConversion = [...salesRepsData]
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 5)
      .map(rep => ({
        name: rep.name,
        conversionRate: rep.conversionRate,
        conversions: rep.conversions,
        assigned: rep.customersAssigned,
      }));

    return NextResponse.json({
      success: true,
      data: {
        // Overview KPIs
        totalSalesReps,
        totalCustomersAssigned,
        totalConversions,
        avgConversionRate: parseFloat(avgConversionRate.toFixed(1)),
        totalRevenue,
        totalProfit,
        totalOrders,
        totalDiscount,
        totalReturns,
        totalComplaints,
        avgOrderValue,
        overallProfitMargin: parseFloat(overallProfitMargin.toFixed(1)),
        
        // Trends (vs previous period)
        salesRepsTrend: 0, // Number of sales reps doesn't change
        revenueTrend: parseFloat(trends.revenueTrend.toFixed(1)),
        profitTrend: parseFloat(trends.profitTrend.toFixed(1)),
        profitMarginTrend: parseFloat(trends.profitMarginTrend.toFixed(1)),
        ordersTrend: parseFloat(trends.ordersTrend.toFixed(1)),
        avgOrderValueTrend: parseFloat(trends.avgOrderValueTrend.toFixed(1)),
        customersAssignedTrend: 0, // All-time metric
        conversionsTrend: 0, // All-time metric
        conversionRateTrend: 0, // All-time metric
        discountTrend: parseFloat(trends.discountTrend.toFixed(1)),
        returnsTrend: parseFloat(trends.returnsTrend.toFixed(1)),
        complaintsTrend: parseFloat(trends.complaintsTrend.toFixed(1)),
        
        // Detailed data
        salesReps: salesRepsData,
        topPerformersByRevenue,
        topPerformersByConversion,
      },
    });
  } catch (error) {
    console.error('Error in sales-reps dashboard API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch sales reps dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
