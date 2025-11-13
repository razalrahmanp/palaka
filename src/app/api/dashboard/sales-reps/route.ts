import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Customer {
  id: string;
  name: string;
  assigned_sales_rep_id: string | null;
  created_at: string;
  sales_orders: SalesOrder[];
}

interface SalesOrder {
  id: string;
  status: string;
  created_at?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SalesRep {
  id: string;
  name: string;
  email: string;
  customersAssigned: number;
  conversions: number;
  conversionRate: number;
  totalAssigned: number;
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

    console.log('👥 Fetching Sales Reps Dashboard Data:', { 
      startDate: finalStartDate, 
      endDate: finalEndDate 
    });

    // Fetch all customers with their assignments and sales orders
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        assigned_sales_rep_id,
        created_at,
        sales_orders(id, status, created_at)
      `)
      .gte('created_at', finalStartDate)
      .lte('created_at', finalEndDate + 'T23:59:59.999Z');

    if (customersError) {
      console.error('Error fetching customers:', customersError);
      throw customersError;
    }

    // Fetch all sales reps (employees with sales rep role)
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, email, role')
      .eq('employment_status', 'active');

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      throw employeesError;
    }

    // Filter sales reps (adjust role check based on your schema)
    const salesReps = employees.filter((emp: Employee) => 
      emp.role?.toLowerCase().includes('sales') || 
      emp.role?.toLowerCase().includes('rep')
    );

    // Get all customers for all-time data (for sales reps not in current period)
    const { data: allCustomers, error: allCustomersError } = await supabase
      .from('customers')
      .select('id, assigned_sales_rep_id, sales_orders(id, status)');

    if (allCustomersError) {
      console.error('Error fetching all customers:', allCustomersError);
    }

    // Calculate metrics for each sales rep
    const salesRepsData: SalesRep[] = salesReps.map((rep: Employee) => {
      // Customers assigned in current period
      const assignedInPeriod = customers?.filter((c: Customer) => c.assigned_sales_rep_id === rep.id) || [];
      
      // All customers assigned to this rep (all-time)
      const allAssigned = allCustomers?.filter((c) => c.assigned_sales_rep_id === rep.id) || [];
      
      // Converted customers (those with completed/confirmed orders)
      const converted = assignedInPeriod.filter((c: Customer) => {
        const orders = c.sales_orders || [];
        return orders.some((order: SalesOrder) =>
          order.status === 'completed' || 
          order.status === 'confirmed' ||
          order.status === 'delivered'
        );
      });      const conversionRate = assignedInPeriod.length > 0 
        ? (converted.length / assignedInPeriod.length) * 100 
        : 0;

      return {
        id: rep.id,
        name: rep.name,
        email: rep.email,
        customersAssigned: assignedInPeriod.length,
        conversions: converted.length,
        conversionRate: conversionRate,
        totalAssigned: allAssigned.length, // all-time
      };
    });

    // Sort by conversions (descending)
    salesRepsData.sort((a, b) => b.conversions - a.conversions);

    // Calculate KPIs
    const totalSalesReps = salesRepsData.length;
    const totalCustomersAssigned = salesRepsData.reduce((sum, rep) => sum + rep.customersAssigned, 0);
    const totalConversions = salesRepsData.reduce((sum, rep) => sum + rep.conversions, 0);
    const avgConversionRate = totalCustomersAssigned > 0 
      ? (totalConversions / totalCustomersAssigned) * 100 
      : 0;

    // Top performers (top 5)
    const topPerformers = salesRepsData.slice(0, 5).map(rep => ({
      name: rep.name,
      conversions: rep.conversions,
      assigned: rep.customersAssigned,
    }));

    // Calculate conversion trend (last 7 days)
    const conversionTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Customers assigned on this date
      const assignedOnDate = customers?.filter((c: Customer) => 
        c.created_at?.startsWith(dateStr)
      ) || [];

      // Converted on this date (orders created on this date)
      const convertedOnDate = assignedOnDate.filter((c: Customer) => {
        const orders = c.sales_orders || [];
        return orders.some((order: SalesOrder) => 
          order.created_at?.startsWith(dateStr) && (
            order.status === 'completed' || 
            order.status === 'confirmed' ||
            order.status === 'delivered'
          )
        );
      });

      conversionTrend.push({
        date: dateLabel,
        assigned: assignedOnDate.length,
        conversions: convertedOnDate.length,
      });
    }

    // Calculate trends (compare with previous period)
    const periodLength = Math.ceil((new Date(finalEndDate).getTime() - new Date(finalStartDate).getTime()) / (1000 * 60 * 60 * 24));
    const prevStartDate = new Date(finalStartDate);
    prevStartDate.setDate(prevStartDate.getDate() - periodLength);
    const prevEndDate = new Date(finalStartDate);
    prevEndDate.setDate(prevEndDate.getDate() - 1);

    const { data: prevCustomers } = await supabase
      .from('customers')
      .select('id, sales_rep_id, sales_orders(id, status)')
      .gte('created_at', prevStartDate.toISOString().split('T')[0])
      .lte('created_at', prevEndDate.toISOString().split('T')[0] + 'T23:59:59.999Z');

    const prevAssigned = prevCustomers?.length || 0;
    const prevConverted = prevCustomers?.filter((c) => {
      const orders = c.sales_orders || [];
      return orders.some((order) => 
        order.status === 'completed' || 
        order.status === 'confirmed' ||
        order.status === 'delivered'
      );
    }).length || 0;

    const customersAssignedTrend = prevAssigned > 0 
      ? ((totalCustomersAssigned - prevAssigned) / prevAssigned) * 100 
      : 0;
    const conversionsTrend = prevConverted > 0 
      ? ((totalConversions - prevConverted) / prevConverted) * 100 
      : 0;

    const prevConversionRate = prevAssigned > 0 ? (prevConverted / prevAssigned) * 100 : 0;
    const conversionRateTrend = prevConversionRate > 0 
      ? ((avgConversionRate - prevConversionRate) / prevConversionRate) * 100 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalSalesReps,
        totalCustomersAssigned,
        totalConversions,
        avgConversionRate: parseFloat(avgConversionRate.toFixed(1)),
        salesRepsTrend: 0, // This would need historical employee data
        customersAssignedTrend: parseFloat(customersAssignedTrend.toFixed(1)),
        conversionsTrend: parseFloat(conversionsTrend.toFixed(1)),
        conversionRateTrend: parseFloat(conversionRateTrend.toFixed(1)),
        salesReps: salesRepsData,
        topPerformers,
        conversionTrend,
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
