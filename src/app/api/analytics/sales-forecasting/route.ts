import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date') || '2023-01-01';
  const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];

  try {
    // Get historical sales data
    const { data: salesData, error: salesError } = await supabase
      .from('sales_orders')
      .select('id, final_price, created_at, status')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .in('status', ['completed', 'paid', 'delivered'])
      .order('created_at');

    if (salesError) throw salesError;

    // Group sales by month for historical analysis
    const monthlySales = (salesData || []).reduce((acc: any, sale: any) => {
      const date = new Date(sale.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthName,
          actual: 0,
          target: 0,
          count: 0
        };
      }
      
      acc[monthKey].actual += sale.final_price || 0;
      acc[monthKey].count += 1;
      
      return acc;
    }, {});

    // Set targets (could be from a targets table in real implementation)
    Object.values(monthlySales).forEach((month: any, index: number) => {
      month.target = month.actual * 0.9 + (index * 5000); // Mock target calculation
    });

    const historical = Object.values(monthlySales).slice(-12); // Last 12 months

    // Generate forecast using simple trend analysis
    const recentMonths = historical.slice(-6); // Last 6 months for trend calculation
    const averageGrowth = calculateAverageGrowth(recentMonths);
    const lastMonth = historical[historical.length - 1] as any;
    
    const forecast = [];
    let currentValue = lastMonth?.actual || 150000;
    
    for (let i = 1; i <= 6; i++) {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + i);
      const monthName = futureDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // Apply growth trend with some seasonal variation
      currentValue *= (1 + averageGrowth + (Math.sin(i * Math.PI / 6) * 0.05)); // Add seasonal factor
      
      const confidence = Math.max(0.6, 0.9 - (i * 0.05)); // Confidence decreases over time
      const confidenceRange = currentValue * 0.15; // ±15% confidence interval
      
      forecast.push({
        month: monthName,
        predicted: Math.round(currentValue),
        confidence_low: Math.round(currentValue - confidenceRange),
        confidence_high: Math.round(currentValue + confidenceRange),
        target: Math.round(currentValue * 0.95) // Target slightly below prediction
      });
    }

    // Calculate metrics
    const actualValues = historical.map((h: any) => h.actual).filter(Boolean);
    const targetValues = historical.map((h: any) => h.target).filter(Boolean);
    
    const accuracy = calculateForecastAccuracy(actualValues, targetValues);
    const growthRate = averageGrowth * 100;
    const trend = growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable';
    
    // Calculate targets
    const monthlyTarget = forecast[0]?.target || 195000;
    const quarterlyTarget = forecast.slice(0, 3).reduce((sum: number, f: any) => sum + f.target, 0);
    const yearlyTarget = monthlyTarget * 12;
    const variance = Math.abs(growthRate);

    const response = {
      success: true,
      data: {
        historical,
        forecast,
        metrics: {
          accuracy: Math.round(accuracy * 10) / 10,
          trend,
          growth_rate: Math.round(growthRate * 10) / 10,
          seasonal_factor: 1.15, // Mock seasonal factor
          confidence_score: 82.3 // Mock confidence score
        },
        targets: {
          monthly: monthlyTarget,
          quarterly: quarterlyTarget,
          yearly: yearlyTarget,
          variance: Math.round(variance * 10) / 10
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching sales forecast data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales forecast data' },
      { status: 500 }
    );
  }
}

function calculateAverageGrowth(months: any[]): number {
  if (months.length < 2) return 0.05; // Default 5% growth
  
  let totalGrowth = 0;
  let validGrowthRates = 0;
  
  for (let i = 1; i < months.length; i++) {
    const current = months[i].actual;
    const previous = months[i - 1].actual;
    
    if (previous > 0) {
      const growthRate = (current - previous) / previous;
      totalGrowth += growthRate;
      validGrowthRates++;
    }
  }
  
  return validGrowthRates > 0 ? totalGrowth / validGrowthRates : 0.05;
}

function calculateForecastAccuracy(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) return 85.0;
  
  let totalError = 0;
  let validComparisons = 0;
  
  for (let i = 0; i < Math.min(actual.length, predicted.length); i++) {
    if (actual[i] > 0 && predicted[i] > 0) {
      const error = Math.abs(actual[i] - predicted[i]) / actual[i];
      totalError += error;
      validComparisons++;
    }
  }
  
  if (validComparisons === 0) return 85.0;
  
  const meanError = totalError / validComparisons;
  const accuracy = Math.max(0, (1 - meanError) * 100);
  
  return Math.min(100, accuracy);
}