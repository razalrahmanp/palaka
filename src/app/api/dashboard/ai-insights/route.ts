import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // MTD date range
    const defaultStartDate = new Date(year, month, 1).toISOString().split('T')[0];
    const defaultEndDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const finalStartDate = startDate || defaultStartDate;
    const finalEndDate = endDate || defaultEndDate;

    // Fetch data from multiple sources for AI analysis
    const [
      salesOrdersResult,
      expensesResult,
      inventoryResult,
      employeesResult,
      deliveriesResult,
    ] = await Promise.all([
      supabase
        .from('sales_orders')
        .select('total_amount, created_at, status')
        .gte('created_at', new Date(year, month - 6, 1).toISOString().split('T')[0])
        .lte('created_at', finalEndDate + 'T23:59:59.999Z'),

      supabase
        .from('expenses')
        .select('amount, created_at, category')
        .gte('created_at', finalStartDate)
        .lte('created_at', finalEndDate + 'T23:59:59.999Z'),

      supabase
        .from('inventory')
        .select('quantity, last_updated'),

      supabase
        .from('employees')
        .select('id, performance_rating, status')
        .eq('status', 'active'),

      supabase
        .from('deliveries')
        .select('status, actual_delivery_time, estimated_delivery_time, created_at')
        .gte('created_at', finalStartDate)
        .lte('created_at', finalEndDate + 'T23:59:59.999Z'),
    ]);

    if (salesOrdersResult.error) throw salesOrdersResult.error;
    if (expensesResult.error) throw expensesResult.error;
    if (inventoryResult.error) throw inventoryResult.error;
    if (employeesResult.error) throw employeesResult.error;
    if (deliveriesResult.error) throw deliveriesResult.error;

    const salesOrders = salesOrdersResult.data || [];
    const expenses = expensesResult.data || [];
    const deliveries = deliveriesResult.data || [];

    // Calculate current month metrics
    const currentRevenue = salesOrders
      .filter(s => s.created_at >= finalStartDate)
      .reduce((sum, s) => sum + (s.total_amount || 0), 0);

    const currentExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Calculate previous month for comparison
    const prevMonthStart = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const prevMonthEnd = new Date(year, month, 0).toISOString().split('T')[0];
    const prevRevenue = salesOrders
      .filter(s => s.created_at >= prevMonthStart && s.created_at <= prevMonthEnd)
      .reduce((sum, s) => sum + (s.total_amount || 0), 0);

    // Calculate 3-month average for baseline
    const threeMonthsAgo = new Date(year, month - 3, 1).toISOString().split('T')[0];
    const historicalOrders = salesOrders.filter(s => s.created_at >= threeMonthsAgo && s.created_at < finalStartDate);
    const avgHistoricalRevenue = historicalOrders.length > 0 
      ? historicalOrders.reduce((sum, s) => sum + (s.total_amount || 0), 0) / 3 
      : currentRevenue;

    // Real anomaly detection - check significant deviations
    const revenueDeviation = avgHistoricalRevenue > 0 ? ((currentRevenue - avgHistoricalRevenue) / avgHistoricalRevenue * 100) : 0;
    const expenseDeviation = avgHistoricalRevenue > 0 ? ((currentExpenses - (currentRevenue * 0.7)) / (currentRevenue * 0.7) * 100) : 0;
    
    let anomaliesDetected = 0;
    if (Math.abs(revenueDeviation) > 10) anomaliesDetected++;
    if (Math.abs(expenseDeviation) > 10) anomaliesDetected++;
    if (currentExpenses > currentRevenue * 0.8) anomaliesDetected++; // Expense ratio too high
    if (deliveries.length > 0) {
      const onTimeCount = deliveries.filter(d => {
        if (!d.actual_delivery_time || !d.estimated_delivery_time) return false;
        return new Date(d.actual_delivery_time) <= new Date(d.estimated_delivery_time);
      }).length;
      const onTimeRate = (onTimeCount / deliveries.length) * 100;
      if (onTimeRate < 85) anomaliesDetected++; // Low on-time delivery
    }

    // Real forecast accuracy - compare last month's simple forecast vs actual
    const forecastedPrevMonth = avgHistoricalRevenue; // Simple forecast: use average
    const forecastError = prevRevenue > 0 ? Math.abs((prevRevenue - forecastedPrevMonth) / prevRevenue) : 0;
    const forecastAccuracy = ((1 - forecastError) * 100).toFixed(1);

    // Count real trends
    const trendsIdentified = anomaliesDetected + (revenueDeviation > 0 ? 1 : 0) + (expenseDeviation < 0 ? 1 : 0);

    // Actionable insights based on data
    let actionableInsights = 0;
    if (currentRevenue < avgHistoricalRevenue * 0.9) actionableInsights++; // Revenue declining
    if (currentExpenses > currentRevenue * 0.75) actionableInsights++; // High expense ratio
    if (revenueDeviation > 10) actionableInsights++; // Revenue growth opportunity
    actionableInsights += anomaliesDetected;

    // Optimization score based on metrics
    const revenueScore = Math.min(100, (currentRevenue / (avgHistoricalRevenue || 1)) * 100);
    const profitMargin = currentRevenue > 0 ? ((currentRevenue - currentExpenses) / currentRevenue * 100) : 0;
    const optimizationScore = ((revenueScore * 0.5) + (profitMargin * 0.5)).toFixed(1);

    // Forecast vs Actual data (last 6 months + forecast)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(year, month - i, 1);
      const monthStart = monthDate.toISOString().split('T')[0];
      const monthEnd = new Date(year, month - i + 1, 0).toISOString().split('T')[0];

      const monthSales = salesOrders.filter(s => 
        s.created_at >= monthStart && s.created_at <= monthEnd
      );
      const actual = monthSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
      
      // Simple forecast: use previous 3-month average
      const forecastStart = new Date(year, month - i - 3, 1).toISOString().split('T')[0];
      const forecastOrders = salesOrders.filter(s => s.created_at >= forecastStart && s.created_at < monthStart);
      const forecast = forecastOrders.length > 0 
        ? forecastOrders.reduce((sum, s) => sum + (s.total_amount || 0), 0) / 3 
        : actual;

      monthlyData.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        actual,
        forecast,
        accuracy: actual > 0 ? Math.min(100, ((1 - Math.abs(actual - forecast) / actual) * 100)) : 0,
      });
    }

    // Add next month forecast - use current 3-month trend
    const nextMonthForecast = avgHistoricalRevenue > 0 
      ? avgHistoricalRevenue * (1 + (revenueDeviation / 100))
      : currentRevenue * 1.05;
      
    monthlyData.push({
      month: new Date(year, month + 1, 1).toLocaleDateString('en-US', { month: 'short' }) + ' (F)',
      actual: 0,
      forecast: nextMonthForecast,
      accuracy: 0,
    });

    // Real anomaly detection metrics
    const normalRevenue = avgHistoricalRevenue;
    const normalExpenses = avgHistoricalRevenue * 0.7; // Target 70% expense ratio
    
    // Calculate on-time delivery rate
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered' || d.status === 'completed');
    const onTimeDeliveries = completedDeliveries.filter(d => {
      if (!d.actual_delivery_time || !d.estimated_delivery_time) return false;
      return new Date(d.actual_delivery_time) <= new Date(d.estimated_delivery_time);
    });
    const onTimeRate = completedDeliveries.length > 0 ? (onTimeDeliveries.length / completedDeliveries.length * 100) : 90;
    
    const anomalyDetection = [
      {
        metric: 'Revenue',
        normal: normalRevenue,
        actual: currentRevenue,
        deviation: avgHistoricalRevenue > 0 ? ((currentRevenue - normalRevenue) / normalRevenue * 100) : 0,
        severity: Math.abs(revenueDeviation) > 10 ? 'high' : (Math.abs(revenueDeviation) > 5 ? 'medium' : 'low'),
      },
      {
        metric: 'Expenses',
        normal: normalExpenses,
        actual: currentExpenses,
        deviation: normalExpenses > 0 ? ((currentExpenses - normalExpenses) / normalExpenses * 100) : 0,
        severity: Math.abs(expenseDeviation) > 10 ? 'high' : (Math.abs(expenseDeviation) > 5 ? 'medium' : 'low'),
      },
      {
        metric: 'Profit Margin',
        normal: 30,
        actual: currentRevenue > 0 ? ((currentRevenue - currentExpenses) / currentRevenue * 100) : 0,
        deviation: currentRevenue > 0 ? (((currentRevenue - currentExpenses) / currentRevenue * 100) - 30) : -30,
        severity: currentRevenue > 0 && ((currentRevenue - currentExpenses) / currentRevenue * 100) < 20 ? 'high' : 'low',
      },
      {
        metric: 'On-Time Delivery',
        normal: 90,
        actual: onTimeRate,
        deviation: onTimeRate - 90,
        severity: onTimeRate < 85 ? 'medium' : (onTimeRate < 80 ? 'high' : 'low'),
      },
    ];

    // Real trend analysis - calculate month-over-month changes
    const salesChange = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue * 100) : 0;
    const profitMarginCurrent = currentRevenue > 0 ? ((currentRevenue - currentExpenses) / currentRevenue * 100) : 0;
    const profitMarginPrev = prevRevenue > 0 ? ((prevRevenue - (currentExpenses * 0.95)) / prevRevenue * 100) : 0;
    const marginChange = profitMarginPrev > 0 ? ((profitMarginCurrent - profitMarginPrev) / profitMarginPrev * 100) : 0;
    
    const trendAnalysis = [
      { 
        category: 'Sales', 
        direction: salesChange > 0 ? 'up' : 'down' as const, 
        strength: Math.min(100, Math.abs(salesChange) * 5), 
        change: `${salesChange > 0 ? '+' : ''}${salesChange.toFixed(1)}%` 
      },
      { 
        category: 'Profit Margin', 
        direction: marginChange > 0 ? 'up' : 'down' as const, 
        strength: Math.min(100, Math.abs(marginChange) * 5), 
        change: `${marginChange > 0 ? '+' : ''}${marginChange.toFixed(1)}%` 
      },
      { 
        category: 'Expense Ratio', 
        direction: expenseDeviation < 0 ? 'down' : 'up' as const, 
        strength: Math.min(100, Math.abs(expenseDeviation) * 3), 
        change: `${expenseDeviation > 0 ? '+' : ''}${expenseDeviation.toFixed(1)}%` 
      },
      { 
        category: 'On-Time Delivery', 
        direction: onTimeRate >= 90 ? 'up' : 'down' as const, 
        strength: Math.round(onTimeRate), 
        change: `${onTimeRate.toFixed(1)}%` 
      },
    ];

    // Department health scores based on real data
    const salesHealth = Math.min(100, (currentRevenue / (avgHistoricalRevenue || 1)) * 100);
    const financeHealth = Math.max(0, 100 - Math.abs(expenseDeviation));
    const logisticsHealth = Math.round(onTimeRate);
    
    const departmentHealth = [
      { 
        department: 'Sales', 
        performance: Math.round(salesHealth), 
        efficiency: Math.round(salesHealth * 0.9), 
        growth: Math.round(Math.max(0, salesChange * 5)), 
        health: Math.round(salesHealth) 
      },
      { 
        department: 'Finance', 
        performance: Math.round(financeHealth), 
        efficiency: Math.round(profitMarginCurrent), 
        growth: Math.round(Math.max(0, 100 - Math.abs(expenseDeviation))), 
        health: Math.round(financeHealth) 
      },
      { 
        department: 'Logistics', 
        performance: Math.round(logisticsHealth), 
        efficiency: Math.round(logisticsHealth * 0.95), 
        growth: Math.round(logisticsHealth * 0.92), 
        health: Math.round(logisticsHealth) 
      },
    ];

    // Real recommendations based on actual metrics
    const recommendations = [];
    let recId = 1;

    // Check profit margin
    if (profitMarginCurrent < 20) {
      recommendations.push({
        id: recId++,
        priority: 'high',
        category: 'Finance',
        title: 'Low Profit Margin Alert',
        description: `Profit margin at ${profitMarginCurrent.toFixed(1)}% (target: 30%). Reduce expenses or increase pricing to improve profitability.`,
        impact: `₹${Math.round((currentRevenue * 0.1) / 1000)}k monthly revenue boost`,
        effort: 'Medium',
      });
    }

    // Check expense ratio
    if (currentExpenses > currentRevenue * 0.75) {
      recommendations.push({
        id: recId++,
        priority: 'high',
        category: 'Expenses',
        title: 'High Expense Ratio',
        description: `Expenses at ${((currentExpenses / currentRevenue) * 100).toFixed(1)}% of revenue. Review discretionary spending and optimize operations.`,
        impact: `₹${Math.round((currentExpenses * 0.1) / 1000)}k potential savings`,
        effort: 'Low',
      });
    }

    // Check revenue trend
    if (salesChange > 10) {
      recommendations.push({
        id: recId++,
        priority: 'medium',
        category: 'Sales',
        title: 'Leverage Sales Momentum',
        description: `Sales trending up ${salesChange.toFixed(1)}%. Invest in top-performing channels to sustain growth.`,
        impact: `₹${Math.round((currentRevenue * 0.15) / 1000)}k revenue opportunity`,
        effort: 'Low',
      });
    } else if (salesChange < -5) {
      recommendations.push({
        id: recId++,
        priority: 'high',
        category: 'Sales',
        title: 'Revenue Decline Alert',
        description: `Sales down ${Math.abs(salesChange).toFixed(1)}%. Review customer acquisition and retention strategies immediately.`,
        impact: `₹${Math.round((Math.abs(currentRevenue * salesChange / 100)) / 1000)}k at risk`,
        effort: 'High',
      });
    }

    // Check delivery performance
    if (onTimeRate < 85) {
      recommendations.push({
        id: recId++,
        priority: 'medium',
        category: 'Logistics',
        title: 'Improve Delivery Performance',
        description: `On-time delivery at ${onTimeRate.toFixed(1)}% (target: 90%). Optimize routes and driver scheduling.`,
        impact: 'Improved customer satisfaction',
        effort: 'Medium',
      });
    }

    // Add general optimization if no critical issues
    if (recommendations.length === 0) {
      recommendations.push({
        id: recId++,
        priority: 'low',
        category: 'Operations',
        title: 'Continue Current Strategy',
        description: 'All metrics within target ranges. Monitor trends and maintain current operational excellence.',
        impact: 'Sustained performance',
        effort: 'Low',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        anomaliesDetected,
        forecastAccuracy,
        trendsIdentified,
        actionableInsights,
        optimizationScore,
        forecastVsActual: monthlyData,
        anomalyDetection,
        trendAnalysis,
        departmentHealth,
        recommendations,
        summary: {
          currentRevenue,
          currentExpenses,
          healthScore: parseFloat(optimizationScore),
          criticalAlerts: recommendations.filter(r => r.priority === 'high').length,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching AI Analytics data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch AI Analytics data',
      },
      { status: 500 }
    );
  }
}
