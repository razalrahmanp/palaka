import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date') || '2024-01-01';
  const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];

  try {
    // Get product sales data with items
    const { data: salesItemsData, error: salesError } = await supabase
      .from('sales_order_items')
      .select(`
        quantity,
        unit_price,
        total_price,
        product_id,
        products!inner(
          id,
          name,
          category,
          cost_price,
          selling_price
        ),
        sales_orders!inner(
          created_at,
          status
        )
      `)
      .gte('sales_orders.created_at', startDate)
      .lte('sales_orders.created_at', endDate)
      .in('sales_orders.status', ['completed', 'paid', 'delivered']);

    if (salesError) throw salesError;

    // Process product performance data
    type ProductStats = {
      id: string;
      name: string;
      category: string;
      revenue: number;
      quantity: number;
      costPrice: number;
      sellingPrice: number;
      profit: number;
      margin: number;
      orders: number;
      avgOrderValue?: number;
      profitPerUnit?: number;
    };
    // Define a more precise interface for supabase join results
    interface ProductInfo {
      id: string;
      name?: string;
      category?: string;
      cost_price?: number;
      selling_price?: number;
    }
    
    interface OrderInfo {
      created_at: string;
      status: string;
    }
    
    interface SupabaseJoinResult {
      quantity: number;
      unit_price: number;
      total_price?: number;
      product_id: string;
      // Products could be either a single object or an array with one object
      products: ProductInfo | ProductInfo[];
      // Sales orders could be either a single object or an array with one object
      sales_orders: OrderInfo | OrderInfo[];
    }
    
    const productStats = (salesItemsData || []).reduce((acc: Record<string, ProductStats>, item: SupabaseJoinResult) => {
      // Supabase sometimes returns nested selections as arrays, handle both cases
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      if (!product || !product.id) return acc;
      const productId = product.id;
      const productName = product.name || 'Unknown Product';
      const prodCategory = product.category || 'Uncategorized';
      const costPrice = product.cost_price || 0;
      const sellingPrice = product.selling_price || item.unit_price || 0;

      if (!acc[productId]) {
        acc[productId] = {
          id: productId,
          name: productName,
          category: prodCategory,
          revenue: 0,
          quantity: 0,
          costPrice,
          sellingPrice,
          profit: 0,
          margin: 0,
          orders: 0
        };
      }

      const itemRevenue = item.total_price || (item.quantity * item.unit_price) || 0;
      const itemCost = (item.quantity || 0) * costPrice;
      const itemProfit = itemRevenue - itemCost;

      acc[productId].revenue += itemRevenue;
      acc[productId].quantity += item.quantity || 0;
      acc[productId].profit += itemProfit;
      acc[productId].orders += 1;
      return acc;
    }, {});

    // Calculate margins and performance metrics
    Object.values(productStats).forEach((product) => {
      product.margin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
      product.avgOrderValue = product.orders > 0 ? product.revenue / product.orders : 0;
      product.profitPerUnit = product.quantity > 0 ? product.profit / product.quantity : 0;
    });

    // Categorize products using BCG Matrix logic
    const products = Object.values(productStats);
    const maxRevenue = Math.max(...products.map((p) => p.revenue));
    const avgMargin = products.reduce((sum, p) => sum + p.margin, 0) / products.length;

    const categorizedProducts = products.map((product) => {
      const revenueScore = (product.revenue / maxRevenue) * 100;
      const marginScore = product.margin;

      let category = 'Dogs'; // Low revenue, Low margin
      let performance = 'poor';

      if (revenueScore >= 60 && marginScore >= avgMargin) {
        category = 'Stars';
        performance = 'excellent';
      } else if (revenueScore >= 60 && marginScore < avgMargin) {
        category = 'Cash Cows';
        performance = 'good';
      } else if (revenueScore < 60 && marginScore >= avgMargin) {
        category = 'Question Marks';
        performance = 'potential';
      }

      return {
        ...product,
        category,
        performance,
        revenueScore: Math.round(revenueScore),
        marginScore: Math.round(marginScore * 10) / 10
      };
    });

    // Group by BCG categories
    const bcgMatrix = {
      stars: categorizedProducts.filter(p => p.category === 'Stars'),
      cashCows: categorizedProducts.filter(p => p.category === 'Cash Cows'),
      questionMarks: categorizedProducts.filter(p => p.category === 'Question Marks'),
      dogs: categorizedProducts.filter(p => p.category === 'Dogs')
    };

    // Get top performers by different metrics
    const topByRevenue = categorizedProducts
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const topByMargin = categorizedProducts
      .filter(p => p.revenue > 0)
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10);

    const topByQuantity = categorizedProducts
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Calculate summary metrics
    const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
    const totalProfit = products.reduce((sum, p) => sum + p.profit, 0);
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const totalProducts = products.length;

    // Generate trends (mock data - would need historical data for real trends)
    const trends = generateTrendsData();

    const response = {
      success: true,
      data: {
        summary: {
          totalProducts,
          totalRevenue: Math.round(totalRevenue),
          totalProfit: Math.round(totalProfit),
          overallMargin: Math.round(overallMargin * 10) / 10,
          starsCount: bcgMatrix.stars.length,
          cashCowsCount: bcgMatrix.cashCows.length,
          questionMarksCount: bcgMatrix.questionMarks.length,
          dogsCount: bcgMatrix.dogs.length
        },
        bcgMatrix,
        topPerformers: {
          byRevenue: topByRevenue,
          byMargin: topByMargin,
          byQuantity: topByQuantity
        },
        trends,
        products: categorizedProducts
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching product performance data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product performance data' },
      { status: 500 }
    );
  }
}

function generateTrendsData() {
  // Mock trends data - in real implementation, this would come from historical analysis
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  
  return months.map((month, index) => ({
    month,
    revenue: 250000 + (index * 25000) + (Math.random() * 20000),
    profit: 75000 + (index * 8000) + (Math.random() * 5000),
    margin: 28 + (Math.random() * 6),
    newProducts: Math.floor(Math.random() * 3) + 1,
    topCategory: ['Furniture', 'Electronics', 'Accessories'][index % 3]
  }));
}