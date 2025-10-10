import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

// Define interfaces for strong typing
interface SalesOrder {
  id: string;
  final_price: number;
  original_price: number;
  created_at: string;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  created_at: string;
  sales_orders: SalesOrder | SalesOrder[];
  // Added fields during processing
  revenue?: number;
  orders?: number;
  avgOrderValue?: number;
  frequency?: number;
  clv?: number;
  acquisitionCost?: number;
  retentionRate?: number;
  region?: string;
}

interface CustomerSegment {
  segment_id: string;
  segment_name: string;
  customer_count: number;
  revenue: number;
  avg_order_value: number;
  frequency: number;
  clv: number;
  acquisition_cost: number;
  retention_rate: number;
  growth_rate: number;
  profitability_score: number;
}

interface RegionStats {
  region: string;
  customers: number;
  revenue: number;
  market_share: number;
  growth_potential: number;
}

interface DemographicSegment {
  age_group: string;
  gender: string;
  income_level: string;
  education: string;
  customers: number;
  revenue: number;
  avg_spend: number;
}

interface BehavioralSegment {
  behavior_type: string;
  segment: string;
  percentage: number;
  value: number;
  engagement_score: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date') || '2024-01-01';
  const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];

  try {
    // Get customer data with sales information
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        email,
        phone,
        address,
        city,
        state,
        created_at,
        sales_orders!inner(
          id,
          final_price,
          original_price,
          created_at,
          status
        )
      `)
      .gte('sales_orders.created_at', startDate)
      .lte('sales_orders.created_at', endDate);

    if (customersError) throw customersError;

    // Process customer segmentation
    const customerAnalytics = processCustomerData(customersData || []);
    
    // Create customer segments based on behavior
    const segments = createCustomerSegments(customerAnalytics);
    
    // Create geographic segmentation
    const geographic = createGeographicSegmentation(customerAnalytics);
    
    // Create demographic segmentation (mock data - would need additional customer info)
    const demographic = createDemographicSegmentation(customerAnalytics);
    
    // Create behavioral segmentation
    const behavioral = createBehavioralSegmentation(customerAnalytics);

    // Calculate segmentation metrics
    const totalCustomers = customerAnalytics.length;
    
    const largestSegment = segments.reduce((max, segment) => 
      segment.customer_count > max.customer_count ? segment : max
    );
    
    const mostProfitable = segments.reduce((max, segment) => 
      segment.profitability_score > max.profitability_score ? segment : max
    );
    
    const fastestGrowing = segments.reduce((max, segment) => 
      segment.growth_rate > max.growth_rate ? segment : max
    );

    const response = {
      success: true,
      data: {
        segments,
        geographic,
        demographic,
        behavioral,
        segmentation_metrics: {
          total_segments: segments.length,
          largest_segment: largestSegment.segment_name,
          most_profitable: mostProfitable.segment_name,
          fastest_growing: fastestGrowing.segment_name,
          total_customers: totalCustomers,
          segmentation_score: 78.5 // Mock score - would be calculated based on segment clarity
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching market segmentation data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market segmentation data' },
      { status: 500 }
    );
  }
}

function processCustomerData(customersData: Customer[]): Customer[] {
  return customersData.map((customer: Customer) => {
    const orders = Array.isArray(customer.sales_orders) ? customer.sales_orders : [customer.sales_orders];
    const validOrders = orders.filter((order: SalesOrder) => order.status !== 'cancelled');
    
    const totalRevenue = validOrders.reduce((sum: number, order: SalesOrder) => sum + (order.final_price || 0), 0);
    const totalOrders = validOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Calculate frequency (orders per month)
    const firstOrderDate = new Date(customer.created_at);
    const lastOrderDate = validOrders.length > 0 ? 
      new Date(Math.max(...validOrders.map((o: SalesOrder) => new Date(o.created_at).getTime()))) : 
      new Date();
    const monthsDiff = Math.max(1, (lastOrderDate.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const frequency = totalOrders / monthsDiff;

    return {
      ...customer,
      revenue: totalRevenue,
      orders: totalOrders,
      avgOrderValue,
      frequency,
      clv: totalRevenue, // Simplified CLV calculation
      acquisitionCost: Math.random() * 500 + 100, // Mock data
      retentionRate: Math.random() * 30 + 70, // Mock data
      region: getRegionFromLocation(customer.city, customer.state)
    };
  });
}

function createCustomerSegments(customers: Customer[]): CustomerSegment[] {
  // Segment customers based on CLV and behavior
  const segments = [
    {
      segment_id: 'VIP',
      segment_name: 'VIP Customers',
      customer_count: 0,
      revenue: 0,
      avg_order_value: 0,
      frequency: 0,
      clv: 0,
      acquisition_cost: 1200,
      retention_rate: 92.5,
      growth_rate: 15.2,
      profitability_score: 95
    },
    {
      segment_id: 'LOYAL',
      segment_name: 'Loyal Customers',
      customer_count: 0,
      revenue: 0,
      avg_order_value: 0,
      frequency: 0,
      clv: 0,
      acquisition_cost: 450,
      retention_rate: 78.3,
      growth_rate: 8.7,
      profitability_score: 82
    },
    {
      segment_id: 'REGULAR',
      segment_name: 'Regular Customers',
      customer_count: 0,
      revenue: 0,
      avg_order_value: 0,
      frequency: 0,
      clv: 0,
      acquisition_cost: 280,
      retention_rate: 65.2,
      growth_rate: 5.3,
      profitability_score: 68
    },
    {
      segment_id: 'OCCASIONAL',
      segment_name: 'Occasional Buyers',
      customer_count: 0,
      revenue: 0,
      avg_order_value: 0,
      frequency: 0,
      clv: 0,
      acquisition_cost: 150,
      retention_rate: 35.8,
      growth_rate: -2.1,
      profitability_score: 45
    },
    {
      segment_id: 'NEW',
      segment_name: 'New Customers',
      customer_count: 0,
      revenue: 0,
      avg_order_value: 0,
      frequency: 0,
      clv: 0,
      acquisition_cost: 120,
      retention_rate: 25.5,
      growth_rate: 28.9,
      profitability_score: 32
    }
  ];

  // Categorize customers into segments
  customers.forEach((customer: Customer) => {
    let segmentIndex = 4; // Default to 'NEW'
    
    const clv = customer.clv || 0;
    if (clv >= 100000) segmentIndex = 0; // VIP
    else if (clv >= 50000) segmentIndex = 1; // LOYAL
    else if (clv >= 20000) segmentIndex = 2; // REGULAR
    else if (clv >= 5000) segmentIndex = 3; // OCCASIONAL

    const segment = segments[segmentIndex];
    segment.customer_count += 1;
    segment.revenue += customer.revenue || 0;
    segment.avg_order_value += customer.avgOrderValue || 0;
    segment.frequency += customer.frequency || 0;
    segment.clv += customer.clv || 0;
  });

  // Calculate averages
  segments.forEach(segment => {
    if (segment.customer_count > 0) {
      segment.avg_order_value = segment.avg_order_value / segment.customer_count;
      segment.frequency = segment.frequency / segment.customer_count;
      segment.clv = segment.clv / segment.customer_count;
    }
  });

  return segments.filter(segment => segment.customer_count > 0);
}

function createGeographicSegmentation(customers: Customer[]): RegionStats[] {
  const regionStats: Record<string, RegionStats> = {};
  
  customers.forEach((customer: Customer) => {
    const region = customer.region || 'Unknown';
    if (!regionStats[region]) {
      regionStats[region] = {
        region,
        customers: 0,
        revenue: 0,
        market_share: 0,
        growth_potential: Math.random() * 30 + 70 // Mock growth potential
      };
    }
    
    regionStats[region].customers += 1;
    regionStats[region].revenue += customer.revenue || 0;
  });

  const totalCustomers = customers.length;
  const geographic = Object.values(regionStats).map((region: RegionStats) => ({
    ...region,
    market_share: Math.round((region.customers / totalCustomers) * 1000) / 10
  }));

  return geographic;
}

function createDemographicSegmentation(customers: Customer[]): DemographicSegment[] {
  // Calculate total revenue to be distributed among demographic segments
  const totalRevenue = customers.reduce((sum: number, c: Customer) => sum + (c.revenue || 0), 0);
  
  // Mock demographic data - in real implementation, this would come from customer profile data
  return [
    { age_group: '25-35', gender: 'Mixed', income_level: 'Middle', education: 'Graduate', customers: Math.floor(customers.length * 0.35), revenue: totalRevenue * 0.35, avg_spend: 549 },
    { age_group: '35-45', gender: 'Mixed', income_level: 'Upper Middle', education: 'Graduate+', customers: Math.floor(customers.length * 0.29), revenue: totalRevenue * 0.29, avg_spend: 706 },
    { age_group: '18-25', gender: 'Mixed', income_level: 'Lower Middle', education: 'Undergraduate', customers: Math.floor(customers.length * 0.22), revenue: totalRevenue * 0.22, avg_spend: 423 },
    { age_group: '45-60', gender: 'Mixed', income_level: 'High', education: 'Professional', customers: Math.floor(customers.length * 0.14), revenue: totalRevenue * 0.14, avg_spend: 883 }
  ];
}

function createBehavioralSegmentation(customers: Customer[]): BehavioralSegment[] {
  const totalRevenue = customers.reduce((sum: number, c: Customer) => sum + (c.revenue || 0), 0);
  
  return [
    { behavior_type: 'Price Sensitive', segment: 'Bargain Hunters', percentage: 35.2, value: totalRevenue * 0.22, engagement_score: 65 },
    { behavior_type: 'Quality Focused', segment: 'Premium Seekers', percentage: 28.5, value: totalRevenue * 0.34, engagement_score: 88 },
    { behavior_type: 'Convenience', segment: 'Quick Buyers', percentage: 22.8, value: totalRevenue * 0.15, engagement_score: 72 },
    { behavior_type: 'Brand Loyal', segment: 'Brand Advocates', percentage: 13.5, value: totalRevenue * 0.29, engagement_score: 95 }
  ];
}

function getRegionFromLocation(city?: string, state?: string): string {
  // Simple region mapping - would be more sophisticated in real implementation
  const northStates = ['Punjab', 'Haryana', 'Delhi', 'Uttar Pradesh', 'Himachal Pradesh'];
  const westStates = ['Maharashtra', 'Gujarat', 'Rajasthan', 'Goa'];
  const southStates = ['Karnataka', 'Tamil Nadu', 'Kerala', 'Andhra Pradesh', 'Telangana'];
  const eastStates = ['West Bengal', 'Odisha', 'Jharkhand', 'Bihar'];
  
  if (state) {
    if (northStates.includes(state)) return 'North India';
    if (westStates.includes(state)) return 'West India';
    if (southStates.includes(state)) return 'South India';
    if (eastStates.includes(state)) return 'East India';
  }
  
  return 'Unknown Region';
}