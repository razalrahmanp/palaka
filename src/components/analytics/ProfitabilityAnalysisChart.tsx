'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { TrendingUp, TrendingDown, DollarSign, Percent, Target, Calculator } from 'lucide-react'

interface ProfitabilityData {
  period: string
  revenue: number
  cogs: number
  gross_profit: number
  operating_expenses: number
  operating_profit: number
  net_profit: number
  gross_margin: number
  operating_margin: number
  net_margin: number
  roi: number
}

interface ProfitCenterData {
  center_name: string
  revenue: number
  profit: number
  margin: number
  contribution: number
  trend: 'up' | 'down' | 'stable'
}

interface ProfitabilityAnalysisData {
  periods: ProfitabilityData[]
  profit_centers: ProfitCenterData[]
  kpis: {
    total_revenue: number
    total_profit: number
    avg_margin: number
    roi: number
    growth_rate: number
    break_even_point: number
  }
  trends: {
    revenue_trend: number
    profit_trend: number
    margin_trend: number
    efficiency_score: number
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function ProfitabilityAnalysisChart() {
  const [analysisData, setAnalysisData] = useState<ProfitabilityAnalysisData | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'trends' | 'centers' | 'margins'>('overview')
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '12m' | '24m'>('12m')
  const [metricType, setMetricType] = useState<'profit' | 'margin' | 'roi'>('profit')
  const [loading, setLoading] = useState(true)

  const fetchAnalysisData = useCallback(async () => {
    setLoading(true)
    try {
      // Mock data - replace with actual API call
      const mockPeriods: ProfitabilityData[] = [
        {
          period: 'Jan 2024',
          revenue: 500000,
          cogs: 300000,
          gross_profit: 200000,
          operating_expenses: 120000,
          operating_profit: 80000,
          net_profit: 65000,
          gross_margin: 40.0,
          operating_margin: 16.0,
          net_margin: 13.0,
          roi: 15.2
        },
        {
          period: 'Feb 2024',
          revenue: 520000,
          cogs: 310000,
          gross_profit: 210000,
          operating_expenses: 125000,
          operating_profit: 85000,
          net_profit: 70000,
          gross_margin: 40.4,
          operating_margin: 16.3,
          net_margin: 13.5,
          roi: 16.8
        },
        {
          period: 'Mar 2024',
          revenue: 480000,
          cogs: 295000,
          gross_profit: 185000,
          operating_expenses: 118000,
          operating_profit: 67000,
          net_profit: 52000,
          gross_margin: 38.5,
          operating_margin: 14.0,
          net_margin: 10.8,
          roi: 12.3
        },
        {
          period: 'Apr 2024',
          revenue: 550000,
          cogs: 325000,
          gross_profit: 225000,
          operating_expenses: 130000,
          operating_profit: 95000,
          net_profit: 78000,
          gross_margin: 40.9,
          operating_margin: 17.3,
          net_margin: 14.2,
          roi: 18.5
        },
        {
          period: 'May 2024',
          revenue: 580000,
          cogs: 340000,
          gross_profit: 240000,
          operating_expenses: 135000,
          operating_profit: 105000,
          net_profit: 88000,
          gross_margin: 41.4,
          operating_margin: 18.1,
          net_margin: 15.2,
          roi: 20.1
        },
        {
          period: 'Jun 2024',
          revenue: 620000,
          cogs: 360000,
          gross_profit: 260000,
          operating_expenses: 142000,
          operating_profit: 118000,
          net_profit: 98000,
          gross_margin: 41.9,
          operating_margin: 19.0,
          net_margin: 15.8,
          roi: 21.8
        }
      ]

      const mockProfitCenters: ProfitCenterData[] = [
        {
          center_name: 'Product Sales',
          revenue: 2800000,
          profit: 420000,
          margin: 15.0,
          contribution: 60.5,
          trend: 'up'
        },
        {
          center_name: 'Services',
          revenue: 980000,
          profit: 245000,
          margin: 25.0,
          contribution: 35.3,
          trend: 'up'
        },
        {
          center_name: 'Consulting',
          revenue: 470000,
          profit: 94000,
          margin: 20.0,
          contribution: 13.5,
          trend: 'stable'
        },
        {
          center_name: 'Training',
          revenue: 250000,
          profit: 37500,
          margin: 15.0,
          contribution: 5.4,
          trend: 'down'
        }
      ]

      const mockData: ProfitabilityAnalysisData = {
        periods: mockPeriods,
        profit_centers: mockProfitCenters,
        kpis: {
          total_revenue: 3250000,
          total_profit: 487000,
          avg_margin: 15.0,
          roi: 17.8,
          growth_rate: 12.5,
          break_even_point: 2180000
        },
        trends: {
          revenue_trend: 8.5,
          profit_trend: 15.2,
          margin_trend: 2.8,
          efficiency_score: 85.6
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
      setAnalysisData(mockData)
    } catch (error) {
      console.error('Error fetching analysis data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalysisData()
  }, [fetchAnalysisData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <div className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Profitability Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="animate-pulse text-muted-foreground">Loading profitability data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analysisData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Profitability Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">No profitability data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Profitability Analysis
            </CardTitle>
            <CardDescription>
              Comprehensive profit and margin analysis across time periods and business units
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'overview' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('overview')}
            >
              Overview
            </Button>
            <Button
              variant={viewMode === 'trends' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('trends')}
            >
              Trends
            </Button>
            <Button
              variant={viewMode === 'centers' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('centers')}
            >
              Centers
            </Button>
            <Button
              variant={viewMode === 'margins' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('margins')}
            >
              Margins
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Revenue</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(analysisData.kpis.total_revenue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Profit</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {formatCurrency(analysisData.kpis.total_profit)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Avg Margin</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {analysisData.kpis.avg_margin.toFixed(1)}%
                </p>
              </div>
              <Percent className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">ROI</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {analysisData.kpis.roi.toFixed(1)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={timeRange} onValueChange={(value: '3m' | '6m' | '12m' | '24m') => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="12m">12 Months</SelectItem>
              <SelectItem value="24m">24 Months</SelectItem>
            </SelectContent>
          </Select>

          <Select value={metricType} onValueChange={(value: 'profit' | 'margin' | 'roi') => setMetricType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profit">Profit</SelectItem>
              <SelectItem value="margin">Margin</SelectItem>
              <SelectItem value="roi">ROI</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {viewMode === 'overview' && (
          <div className="space-y-6">
            {/* Revenue vs Profit Chart */}
            <div className="h-96">
              <h4 className="text-sm font-medium mb-3">Revenue vs Profit Breakdown</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysisData.periods}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                  <Bar dataKey="gross_profit" fill="#82ca9d" name="Gross Profit" />
                  <Bar dataKey="net_profit" fill="#ffc658" name="Net Profit" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Waterfall Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Profit Waterfall (Latest Period)</h4>
                <div className="space-y-2">
                  {[
                    { label: 'Revenue', value: analysisData.periods[analysisData.periods.length - 1]?.revenue || 0, color: 'bg-blue-500' },
                    { label: 'COGS', value: -(analysisData.periods[analysisData.periods.length - 1]?.cogs || 0), color: 'bg-red-500' },
                    { label: 'Gross Profit', value: analysisData.periods[analysisData.periods.length - 1]?.gross_profit || 0, color: 'bg-green-500' },
                    { label: 'Operating Expenses', value: -(analysisData.periods[analysisData.periods.length - 1]?.operating_expenses || 0), color: 'bg-red-400' },
                    { label: 'Net Profit', value: analysisData.periods[analysisData.periods.length - 1]?.net_profit || 0, color: 'bg-green-600' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded ${item.color}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <span className={`font-medium ${item.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(item.value))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Key Ratios</h4>
                <div className="space-y-3">
                  <div className="p-3 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Break-even Point</span>
                      <span className="font-medium">{formatCurrency(analysisData.kpis.break_even_point)}</span>
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Growth Rate</span>
                      <span className="font-medium text-green-600">{analysisData.kpis.growth_rate.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Efficiency Score</span>
                      <span className="font-medium text-blue-600">{analysisData.trends.efficiency_score.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'trends' && (
          <div className="h-96">
            <h4 className="text-sm font-medium mb-3">Profitability Trends</h4>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analysisData.periods}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="gross_profit"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  name="Gross Profit"
                />
                <Line
                  type="monotone"
                  dataKey="net_profit"
                  stroke="#ffc658"
                  strokeWidth={2}
                  name="Net Profit"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {viewMode === 'centers' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profit Centers Chart */}
              <div className="h-80">
                <h4 className="text-sm font-medium mb-3">Revenue by Profit Center</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analysisData.profit_centers}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ center_name, contribution }) => `${center_name} ${contribution.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {analysisData.profit_centers.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Profit Centers Performance */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Center Performance</h4>
                {analysisData.profit_centers.map((center) => (
                  <div key={center.center_name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">{center.center_name}</h5>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(center.trend)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Revenue:</span>
                        <span className="ml-2 font-medium">{formatCurrency(center.revenue)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Profit:</span>
                        <span className="ml-2 font-medium">{formatCurrency(center.profit)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Margin:</span>
                        <span className="ml-2 font-medium">{center.margin.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Contribution:</span>
                        <span className="ml-2 font-medium">{center.contribution.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'margins' && (
          <div className="space-y-6">
            {/* Margin Trends */}
            <div className="h-96">
              <h4 className="text-sm font-medium mb-3">Margin Analysis Over Time</h4>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analysisData.periods}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="gross_margin"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Gross Margin %"
                  />
                  <Line
                    type="monotone"
                    dataKey="operating_margin"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Operating Margin %"
                  />
                  <Line
                    type="monotone"
                    dataKey="net_margin"
                    stroke="#ffc658"
                    strokeWidth={2}
                    name="Net Margin %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Margin Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Gross Margin Trend</h5>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {analysisData.periods[analysisData.periods.length - 1]?.gross_margin.toFixed(1)}%
                  </span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-sm text-muted-foreground">
                  vs {analysisData.periods[0]?.gross_margin.toFixed(1)}% last period
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Operating Margin</h5>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {analysisData.periods[analysisData.periods.length - 1]?.operating_margin.toFixed(1)}%
                  </span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-sm text-muted-foreground">
                  vs {analysisData.periods[0]?.operating_margin.toFixed(1)}% last period
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Net Margin</h5>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {analysisData.periods[analysisData.periods.length - 1]?.net_margin.toFixed(1)}%
                  </span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-sm text-muted-foreground">
                  vs {analysisData.periods[0]?.net_margin.toFixed(1)}% last period
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}