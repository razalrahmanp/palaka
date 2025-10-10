import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Mock ROI scenarios - in real implementation, this would be stored in database
    const scenarios = [
      {
        id: 'marketing_campaign',
        name: 'Digital Marketing Campaign',
        initial_investment: 50000,
        expected_return: 125000,
        time_period: 6,
        risk_level: 'Medium' as const,
        category: 'Marketing',
        monthly_cash_flow: [0, 5000, 15000, 25000, 35000, 45000],
        roi_percentage: 150,
        payback_period: 4.2,
        npv: 68500,
        irr: 45.2
      },
      {
        id: 'equipment_upgrade',
        name: 'Equipment Upgrade',
        initial_investment: 200000,
        expected_return: 280000,
        time_period: 24,
        risk_level: 'Low' as const,
        category: 'Operations',
        monthly_cash_flow: Array.from({length: 24}, (_, i) => 10000 + (i * 500)),
        roi_percentage: 40,
        payback_period: 18.5,
        npv: 45000,
        irr: 12.8
      },
      {
        id: 'new_product',
        name: 'New Product Launch',
        initial_investment: 300000,
        expected_return: 500000,
        time_period: 18,
        risk_level: 'High' as const,
        category: 'Product Development',
        monthly_cash_flow: [0, 0, 0, 10000, 20000, 30000, 40000, 50000, 45000, 40000, 35000, 30000, 25000, 20000, 15000, 10000, 8000, 5000],
        roi_percentage: 66.7,
        payback_period: 12.8,
        npv: 125000,
        irr: 18.5
      }
    ];

    const historical_performance = [
      { period: 'Q1 2023', investment: 180000, returns: 245000, roi: 36.1 },
      { period: 'Q2 2023', investment: 220000, returns: 285000, roi: 29.5 },
      { period: 'Q3 2023', investment: 150000, returns: 195000, roi: 30.0 },
      { period: 'Q4 2023', investment: 280000, returns: 385000, roi: 37.5 },
      { period: 'Q1 2024', investment: 190000, returns: 275000, roi: 44.7 },
      { period: 'Q2 2024', investment: 250000, returns: 365000, roi: 46.0 }
    ];

    const benchmarks = {
      industry_average_roi: 25.5,
      market_roi: 18.2,
      risk_free_rate: 6.5,
      inflation_rate: 4.2
    };

    const response = {
      success: true,
      data: {
        scenarios,
        calculations: [],
        benchmarks,
        historical_performance
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching ROI analysis data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ROI analysis data' },
      { status: 500 }
    );
  }
}