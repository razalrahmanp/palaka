'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Line,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts'
import {
  BarChart3,
  PieChart as PieChartIcon,
  Eye,
  EyeOff,
} from 'lucide-react'

interface DashboardData {
  mtdRevenue: number
  mtdProfit: number
  mtdGrossProfit: number
  deliveredCollected: number
  totalExpenses: number
  deliveredPending: number
  vendorPayments: number
  cogs: number
  withdrawalsTotal: number
  withdrawalsCount: number
  totalCollected: number
  collectionRate: number
  totalOutstanding: number
}

interface ChartDataPoint {
  date: string
  revenue: number
  profit: number
  expenses: number
  collected: number
}

interface DashboardWithChartsProps {
  data: DashboardData
  isLoading: boolean
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export default function DashboardWithCharts({
  data,
  isLoading,
}: DashboardWithChartsProps) {
  const [showCharts, setShowCharts] = useState(false)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])

  // Generate mock chart data based on the actual values
  useEffect(() => {
    const generateChartData = () => {
      const days = 7
      const baseRevenue = data.mtdRevenue / days
      const baseProfit = data.mtdProfit / days

      const data_ = Array.from({ length: days }, (_, i) => ({
        date: `Day ${i + 1}`,
        revenue: Math.max(0, baseRevenue + Math.random() * baseRevenue * 0.5),
        profit: Math.max(-baseProfit * 0.5, baseProfit + Math.random() * baseProfit * 0.3),
        expenses: (data.totalExpenses / days) * (0.8 + Math.random() * 0.4),
        collected: (data.totalCollected / days) * (0.8 + Math.random() * 0.4),
      }))

      setChartData(data_)
    }

    generateChartData()
  }, [data])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`
    if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K`
    return `₹${value.toFixed(0)}`
  }

  // Prepare pie chart data for revenue breakdown
  const revenueBreakdown = [
    { name: 'Collected', value: data.totalCollected },
    { name: 'Pending', value: data.totalOutstanding },
  ]

  // Prepare expense breakdown
  const expenseBreakdown = [
    { name: 'COGS', value: data.cogs },
    { name: 'Other Expenses', value: data.totalExpenses - data.cogs },
  ]

  return (
    <div className="space-y-6">
      {/* Toggle Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => setShowCharts(!showCharts)}
          className="gap-2"
        >
          {showCharts ? (
            <>
              <EyeOff className="h-4 w-4" />
              Hide Charts
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Show Charts
            </>
          )}
        </Button>
      </div>

      {showCharts && !isLoading && (
        <div className="space-y-6">
          {/* Revenue vs Expenses vs Profit Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Revenue, Expenses & Profit Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
                  <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Profit"
                    dot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Collection Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AreaChart className="h-5 w-5" style={{ display: 'inline' }} />
                Collection vs Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    stroke="#10B981"
                    fill="url(#colorCollected)"
                    name="Collected"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Breakdown - Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Revenue Collection Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) =>
                        `${name} ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {revenueBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expense Breakdown - Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Expense Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) =>
                        `${name} ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index + 2]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-600">Collection Rate</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {((data.totalCollected / data.mtdRevenue) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-blue-600">of total revenue</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-600">Gross Margin</p>
                  <p className="text-2xl font-bold text-green-900">
                    {((data.mtdGrossProfit / data.mtdRevenue) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-green-600">profit margin</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-orange-600">Outstanding</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {formatNumber(data.totalOutstanding)}
                  </p>
                  <p className="text-xs text-orange-600">
                    {((data.totalOutstanding / data.mtdRevenue) * 100).toFixed(1)}% of revenue
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-purple-600">Net Profit</p>
                  <p className={`text-2xl font-bold ${data.mtdProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                    {formatCurrency(data.mtdProfit)}
                  </p>
                  <p className="text-xs text-purple-600">
                    {((data.mtdProfit / data.mtdRevenue) * 100).toFixed(1)}% margin
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
