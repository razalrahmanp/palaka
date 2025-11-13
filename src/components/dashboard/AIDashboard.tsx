'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import KPICard from './KPICard';
import { Brain, TrendingUp, AlertTriangle, Zap, Target, Activity, Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

// Custom hook to fetch AI Analytics data with date range
const useAIAnalyticsData = (dateRange: { startDate: string; endDate: string }) => {
  return useQuery({
    queryKey: ['dashboard-ai-analytics', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      const response = await fetch(`/api/dashboard/ai-insights?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch AI Analytics data');
      }
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000,
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });
};

// Helper to get initial date range from sessionStorage or default to current month
const getInitialDateRange = () => {
  const stored = sessionStorage.getItem('dashboard-date-range');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.startDate && parsed.endDate) {
        return { startDate: parsed.startDate, endDate: parsed.endDate };
      }
    } catch (e) {
      console.error('Failed to parse stored date range:', e);
    }
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return {
    startDate: new Date(year, month, 1).toISOString().split('T')[0],
    endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
  };
};

export default function AIDashboard() {
  const [dateRange, setDateRange] = useState(getInitialDateRange);

  const { data, isLoading, refetch } = useAIAnalyticsData(dateRange);

  // Listen for date filter changes and refresh events
  useEffect(() => {
    const handleDateChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { startDate, endDate } = customEvent.detail;
      if (startDate && endDate) {
        setDateRange({ startDate, endDate });
      }
    };

    const handleRefresh = () => refetch();
    
    window.addEventListener('dashboard-date-change', handleDateChange);
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => {
      window.removeEventListener('dashboard-date-change', handleDateChange);
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, [refetch]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refetch();
    };

    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, [refetch]);

  // Sample data for development
  const anomaliesDetected = data?.data?.anomaliesDetected || 7;
  const forecastAccuracy = data?.data?.forecastAccuracy || '94.2';
  const trendsIdentified = data?.data?.trendsIdentified || 12;
  const actionableInsights = data?.data?.actionableInsights || 18;
  const optimizationScore = data?.data?.optimizationScore || '87.5';

  const forecastVsActualData = data?.data?.forecastVsActual || [
    { month: 'Jun', actual: 1250000, forecast: 1200000, accuracy: 96 },
    { month: 'Jul', actual: 1380000, forecast: 1350000, accuracy: 98 },
    { month: 'Aug', actual: 1520000, forecast: 1480000, accuracy: 97 },
    { month: 'Sep', actual: 1420000, forecast: 1500000, accuracy: 95 },
    { month: 'Oct', actual: 1680000, forecast: 1650000, accuracy: 98 },
    { month: 'Nov', actual: 1457726, forecast: 1550000, accuracy: 94 },
    { month: 'Dec (F)', actual: 0, forecast: 1720000, accuracy: 0 },
  ];

  const anomalyDetectionData = data?.data?.anomalyDetection || [
    { metric: 'Revenue', normal: 1500000, actual: 1457726, deviation: -2.8, severity: 'low' },
    { metric: 'Expenses', normal: 850000, actual: 915000, deviation: 7.6, severity: 'medium' },
    { metric: 'Inventory Turnover', normal: 4.5, actual: 4.2, deviation: -6.7, severity: 'low' },
    { metric: 'On-Time Delivery', normal: 92, actual: 91.5, deviation: -0.5, severity: 'low' },
    { metric: 'Employee Productivity', normal: 85, actual: 87.2, deviation: 2.6, severity: 'positive' },
    { metric: 'Cash Runway', normal: 3.5, actual: 3.2, deviation: -8.6, severity: 'high' },
  ];

  const trendAnalysisData = data?.data?.trendAnalysis || [
    { category: 'Sales', direction: 'up', strength: 85, change: '+12.5%' },
    { category: 'Profit Margin', direction: 'up', strength: 72, change: '+8.3%' },
    { category: 'Inventory Cost', direction: 'down', strength: 68, change: '-5.2%' },
    { category: 'Customer Acquisition', direction: 'up', strength: 78, change: '+15.8%' },
    { category: 'Employee Turnover', direction: 'down', strength: 82, change: '-18.5%' },
    { category: 'Delivery Time', direction: 'down', strength: 75, change: '-7.3%' },
  ];

  const departmentHealthData = data?.data?.departmentHealth || [
    { department: 'Sales', performance: 92, efficiency: 88, growth: 85, health: 90 },
    { department: 'Finance', performance: 78, efficiency: 85, growth: 72, health: 78 },
    { department: 'Inventory', performance: 85, efficiency: 82, growth: 78, health: 82 },
    { department: 'HR', performance: 88, efficiency: 90, growth: 82, health: 87 },
    { department: 'Logistics', performance: 91, efficiency: 86, growth: 88, health: 88 },
    { department: 'Procurement', performance: 83, efficiency: 87, growth: 80, health: 83 },
  ];

  const actionableRecommendations = data?.data?.recommendations || [
    {
      id: 1,
      priority: 'high',
      category: 'Finance',
      title: 'Cash Runway Critical',
      description: 'Cash runway at 3.2 months (below 3.5 threshold). Reduce expenses by ₹50k/month or increase collections.',
      impact: '₹600k annual savings',
      effort: 'Medium',
    },
    {
      id: 2,
      priority: 'high',
      category: 'Expenses',
      title: 'Expense Spike Detected',
      description: 'Expenses up 7.6% vs normal. Review discretionary spending and negotiate vendor contracts.',
      impact: '₹65k monthly savings',
      effort: 'Low',
    },
    {
      id: 3,
      priority: 'medium',
      category: 'Inventory',
      title: 'Optimize Stock Turnover',
      description: 'Inventory turnover at 4.2x vs target 4.5x. Reduce slow-moving SKUs by 15%.',
      impact: '₹180k working capital release',
      effort: 'Medium',
    },
    {
      id: 4,
      priority: 'medium',
      category: 'Sales',
      title: 'Leverage Sales Momentum',
      description: 'Sales trending up 12.5%. Invest ₹25k in top-performing channels to capture 18% growth.',
      impact: '₹450k revenue opportunity',
      effort: 'Low',
    },
    {
      id: 5,
      priority: 'low',
      category: 'HR',
      title: 'Employee Performance Bonus',
      description: 'Productivity up 2.6% and turnover down 18.5%. Allocate ₹50k for performance incentives.',
      impact: 'Retain top performers',
      effort: 'Low',
    },
    {
      id: 6,
      priority: 'low',
      category: 'Logistics',
      title: 'Fleet Optimization',
      description: 'Vehicle V-104 at 58% utilization. Reassign to Route D to improve efficiency by 12%.',
      impact: '₹15k monthly cost reduction',
      effort: 'Low',
    },
  ];

  const PRIORITY_COLORS: Record<string, string> = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-orange-100 text-orange-700 border-orange-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  return (
    <div className="space-y-4 p-4 h-full overflow-y-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Anomalies Detected"
          value={anomaliesDetected}
          change={-15.3}
          trend="down"
          icon={AlertTriangle}
          gradient="from-red-500 to-red-600"
          subtitle="AI-identified issues"
          loading={isLoading}
        />
        <KPICard
          title="Forecast Accuracy"
          value={`${forecastAccuracy}%`}
          change={1.8}
          trend="up"
          icon={Target}
          gradient="from-green-500 to-green-600"
          subtitle="Prediction reliability"
          loading={isLoading}
        />
        <KPICard
          title="Trends Identified"
          value={trendsIdentified}
          change={8.5}
          trend="up"
          icon={TrendingUp}
          gradient="from-purple-500 to-purple-600"
          subtitle="Pattern recognition"
          loading={isLoading}
        />
        <KPICard
          title="Actionable Insights"
          value={actionableInsights}
          change={22.7}
          trend="up"
          icon={Zap}
          gradient="from-orange-500 to-orange-600"
          subtitle="Recommendations"
          loading={isLoading}
        />
        <KPICard
          title="Optimization Score"
          value={`${optimizationScore}%`}
          change={3.2}
          trend="up"
          icon={Brain}
          gradient="from-blue-500 to-blue-600"
          subtitle="System efficiency"
          loading={isLoading}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Forecast vs Actual */}
        <div className="glass-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Revenue Forecast vs Actual
            </h3>
          </div>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Loading chart...</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecastVsActualData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#22c55e"
                  strokeWidth={3}
                  name="Actual"
                  dot={{ fill: '#22c55e', r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Forecast"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Anomaly Detection */}
        <div className="glass-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Anomaly Detection Matrix
            </h3>
          </div>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Loading data...</div>
            </div>
          ) : (
            <div className="space-y-2">
              {anomalyDetectionData.map((item: { metric: string; normal: number; actual: number; deviation: number; severity: 'high' | 'medium' | 'low' | 'positive' }, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{item.metric}</p>
                    <p className="text-xs text-gray-600">
                      Normal: {typeof item.normal === 'number' && item.normal > 1000 
                        ? `₹${(item.normal / 1000).toFixed(0)}k` 
                        : item.normal}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {typeof item.actual === 'number' && item.actual > 1000 
                        ? `₹${(item.actual / 1000).toFixed(0)}k` 
                        : item.actual}
                    </p>
                    <div className="flex items-center gap-1 justify-end">
                      {item.deviation > 0 ? (
                        <ArrowUpRight className={`h-3 w-3 ${
                          item.severity === 'high' ? 'text-red-500' :
                          item.severity === 'medium' ? 'text-orange-500' :
                          item.severity === 'low' ? 'text-blue-500' :
                          'text-green-500'
                        }`} />
                      ) : (
                        <ArrowDownRight className={`h-3 w-3 ${
                          item.severity === 'high' ? 'text-red-500' :
                          item.severity === 'medium' ? 'text-orange-500' :
                          item.severity === 'low' ? 'text-blue-500' :
                          'text-green-500'
                        }`} />
                      )}
                      <span 
                        className={`text-xs font-medium ${
                          item.severity === 'high' ? 'text-red-500' :
                          item.severity === 'medium' ? 'text-orange-500' :
                          item.severity === 'low' ? 'text-blue-500' :
                          'text-green-500'
                        }`}
                      >
                        {Math.abs(item.deviation).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trend Analysis */}
        <div className="glass-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Multi-Metric Trend Analysis
            </h3>
          </div>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Loading chart...</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendAnalysisData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="category" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="strength" radius={[0, 4, 4, 0]}>
                  {trendAnalysisData.map((entry: { direction: string }, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.direction === 'up' ? '#22c55e' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Department Health Radar */}
        <div className="glass-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Department Health Radar
            </h3>
          </div>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Loading chart...</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={departmentHealthData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="department" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Performance" dataKey="performance" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Radar name="Efficiency" dataKey="efficiency" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                <Radar name="Health" dataKey="health" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Actionable Recommendations */}
      <div className="glass-card p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          AI-Powered Actionable Recommendations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actionableRecommendations.map((rec: { id: number; priority: string; category: string; title: string; description: string; impact: string; effort: string }) => (
            <div 
              key={rec.id} 
              className={`border rounded-lg p-4 ${PRIORITY_COLORS[rec.priority] || PRIORITY_COLORS.low} hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase">{rec.priority}</span>
                  <span className="text-xs px-2 py-0.5 bg-white rounded-full">{rec.category}</span>
                </div>
              </div>
              <h4 className="font-semibold text-sm mb-2">{rec.title}</h4>
              <p className="text-xs mb-3 opacity-90">{rec.description}</p>
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium">Impact:</span> {rec.impact}
                </div>
                <div>
                  <span className="font-medium">Effort:</span> {rec.effort}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insights Summary */}
      <div className="glass-card p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5 text-indigo-600" />
          Executive AI Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-900">Strong Growth Momentum</p>
                <p className="text-xs text-green-700 mt-1">
                  Sales up 12.5%, customer acquisition +15.8%. AI forecasts 18% growth opportunity in Q4.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-900">Cash Flow Alert</p>
                <p className="text-xs text-red-700 mt-1">
                  Cash runway at 3.2 months (critical threshold). Immediate action: reduce burn rate by ₹50k/mo.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-purple-900">Operational Excellence</p>
                <p className="text-xs text-purple-700 mt-1">
                  All departments above 78% health. Sales (90%), Logistics (88%), and HR (87%) leading performance.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Forecast Reliability</p>
                <p className="text-xs text-blue-700 mt-1">
                  94.2% forecast accuracy. December revenue predicted at ₹1.72M with 96% confidence level.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
