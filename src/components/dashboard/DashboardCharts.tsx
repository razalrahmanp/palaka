'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react'
import InvestorWithdrawalDashboard from './InvestorWithdrawalDashboard'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface ChartDataPoint {
  name: string
  revenue?: number
  profit?: number
  expenses?: number
  cogs?: number
  value?: number
}

interface ExpenseDataPoint {
  name: string
  value: number
}

interface CollectionDataPoint {
  name: string
  value: number
}

interface DashboardChartsProps {
  kpiData: {
    mtdRevenue?: number
    totalProfit?: number
    grossProfit?: number
    deliveredCollected?: number
    deliveredPending?: number
    totalExpenses?: number
    vendorPayments?: number
    cogs?: number
    withdrawalsTotal?: number
    withdrawalsCount?: number
    totalCollected?: number
    totalOutstanding?: number
    collectionRate?: number
    cogsBreakdown?: {
      openingStock?: number
      purchases?: number
      closingStock?: number
      totalCogs?: number
    }
  } | null
  selectedChart?: 'revenue' | 'expense' | 'collection' | 'withdrawals' | 'cogs' | null
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export default function DashboardCharts({ kpiData, selectedChart = null }: DashboardChartsProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [expenseData, setExpenseData] = useState<ExpenseDataPoint[]>([])
  const [collectionData, setCollectionData] = useState<CollectionDataPoint[]>([])

  useEffect(() => {
    if (!kpiData) return

    // Calculate COGS: Revenue - Gross Profit
    const calculatedCOGS = (kpiData.mtdRevenue || 0) - (kpiData.grossProfit || 0)

    // Debug logging
    console.log('📊 COGS Calculation:', {
      revenue: kpiData.mtdRevenue,
      grossProfit: kpiData.grossProfit,
      calculatedCOGS: calculatedCOGS,
      formula: 'COGS = Revenue - Gross Profit'
    })

    // Revenue vs Profit vs Expenses Chart Data
    setChartData([
      {
        name: 'Revenue vs Profit vs Expenses',
        revenue: kpiData.mtdRevenue || 0,
        profit: kpiData.totalProfit || 0,
        expenses: kpiData.totalExpenses || 0,
        cogs: calculatedCOGS,
      }
    ])

    // Expense Breakdown
    setExpenseData([
      { name: 'COGS', value: calculatedCOGS },
      { name: 'Total Expenses', value: kpiData.totalExpenses || 0 },
      { name: 'Vendor Payments', value: kpiData.vendorPayments || 0 },
    ])

    // Collection Analysis
    setCollectionData([
      { name: 'Collected', value: kpiData.totalCollected || 0 },
      { name: 'Outstanding', value: kpiData.totalOutstanding || 0 },
      { name: 'Delivered Pending', value: kpiData.deliveredPending || 0 },
    ])
  }, [kpiData])

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

  return (
    <div className="space-y-6">
      {/* Revenue, Profit & Expenses Overview */}
      {selectedChart === 'revenue' && (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Revenue & Profitability Overview
          </CardTitle>
          <p className="text-sm text-gray-600">Comparison of revenue, expenses, and profit</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Summary Cards - Left 1/4 */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Total Revenue</span>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-900">{formatCurrency(kpiData?.mtdRevenue || 0)}</div>
                <div className="text-xs text-gray-600 mt-1">Total Sales</div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Gross Profit</span>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-900">{formatCurrency(kpiData?.grossProfit || 0)}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {((kpiData?.grossProfit || 0) / (kpiData?.mtdRevenue || 1) * 100).toFixed(1)}% Margin
                </div>
              </div>

              <div className={`bg-white rounded-lg p-4 border shadow-sm ${(kpiData?.totalProfit || 0) >= 0 ? 'border-green-200' : 'border-red-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Net Profit</span>
                  {(kpiData?.totalProfit || 0) >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className={`text-2xl font-bold ${(kpiData?.totalProfit || 0) >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  {formatCurrency(kpiData?.totalProfit || 0)}
                </div>
                <div className="text-xs text-gray-600 mt-1">After all expenses</div>
              </div>
            </div>

            {/* Bar Chart - Right 3/4 */}
            <div className="lg:col-span-3">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
                  <Bar dataKey="expenses" fill="#EF4444" name="Total Expenses" />
                  <Bar dataKey="cogs" fill="#F59E0B" name="COGS" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Expense Breakdown */}
      {selectedChart === 'expense' && (
      <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-600" />
            Expense Breakdown
          </CardTitle>
          <p className="text-sm text-gray-600">Distribution of COGS, operating expenses, and vendor payments</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Expense Cards - Left 1/4 */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-lg p-4 border border-orange-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">COGS</span>
                  <DollarSign className="h-4 w-4 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-orange-900">
                  {formatCurrency((kpiData?.mtdRevenue || 0) - (kpiData?.grossProfit || 0))}
                </div>
                <div className="text-xs text-gray-600 mt-1">Cost of Goods Sold</div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-red-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Total Expenses</span>
                  <Activity className="h-4 w-4 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-red-900">{formatCurrency(kpiData?.totalExpenses || 0)}</div>
                <div className="text-xs text-gray-600 mt-1">Operating & Other Expenses</div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Vendor Payments</span>
                  <DollarSign className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-900">{formatCurrency(kpiData?.vendorPayments || 0)}</div>
                <div className="text-xs text-gray-600 mt-1">Amount paid to suppliers</div>
              </div>
            </div>

            {/* Pie Chart - Right 3/4 */}
            <div className="lg:col-span-3">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${formatNumber(value)}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Collection & Payment Status */}
      {selectedChart === 'collection' && (
      <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-teal-600" />
            Collection & Payment Status
          </CardTitle>
          <p className="text-sm text-gray-600">Money collected vs outstanding amounts</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Collection Cards - Left 1/4 */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Total Collected</span>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-900">{formatCurrency(kpiData?.totalCollected || 0)}</div>
                <div className="text-xs text-gray-600 mt-1">{kpiData?.collectionRate || 0}% of revenue</div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-red-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Outstanding</span>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-red-900">{formatCurrency(kpiData?.totalOutstanding || 0)}</div>
                <div className="text-xs text-gray-600 mt-1">Pending from customers</div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-amber-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Delivered Pending</span>
                  <Activity className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-amber-900">{formatCurrency(kpiData?.deliveredPending || 0)}</div>
                <div className="text-xs text-gray-600 mt-1">From delivered orders</div>
              </div>
            </div>

            {/* Pie Chart - Right 3/4 */}
            <div className="lg:col-span-3">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={collectionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${formatNumber(value)}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {collectionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Investor & Withdrawals Dashboard */}
      {selectedChart === 'withdrawals' && (
        <InvestorWithdrawalDashboard kpiData={kpiData} />
      )}

      {/* COGS Breakdown */}
      {selectedChart === 'cogs' && (
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-600" />
            Cost of Goods Sold (COGS) Breakdown
          </CardTitle>
          <p className="text-sm text-gray-600">Inventory-based COGS calculation: Opening Stock + Purchases - Closing Stock</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* COGS Cards - Left 1/4 */}
            <div className="lg:col-span-1 space-y-3">
              <div className="bg-white rounded-lg p-3 border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">Opening Stock</span>
                  <DollarSign className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div className="text-xl font-bold text-blue-900">
                  {formatCurrency(kpiData?.cogsBreakdown?.openingStock || 0)}
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">Beginning inventory value</div>
              </div>

              <div className="bg-white rounded-lg p-3 border border-green-200 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">Add: Purchases</span>
                  <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                </div>
                <div className="text-xl font-bold text-green-900">
                  {formatCurrency(kpiData?.cogsBreakdown?.purchases || 0)}
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">Vendor bills & purchases</div>
              </div>

              <div className="bg-white rounded-lg p-3 border border-red-200 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">Less: Closing Stock</span>
                  <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                </div>
                <div className="text-xl font-bold text-red-900">
                  {formatCurrency(kpiData?.cogsBreakdown?.closingStock || 0)}
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">Ending inventory value</div>
              </div>

              <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg p-3 border-2 border-amber-300 shadow-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">Total COGS</span>
                  <DollarSign className="h-4 w-4 text-amber-700" />
                </div>
                <div className="text-2xl font-bold text-amber-900">
                  {formatCurrency(kpiData?.cogsBreakdown?.totalCogs || 0)}
                </div>
                <div className="text-[10px] text-gray-700 mt-0.5 font-medium">Cost of Goods Sold</div>
              </div>
            </div>

            {/* Bar Chart - Right 3/4 */}
            <div className="lg:col-span-3">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={[
                  {
                    name: 'COGS Components',
                    'Opening Stock': kpiData?.cogsBreakdown?.openingStock || 0,
                    'Purchases': kpiData?.cogsBreakdown?.purchases || 0,
                    'Closing Stock': -(kpiData?.cogsBreakdown?.closingStock || 0),
                    'Total COGS': kpiData?.cogsBreakdown?.totalCogs || 0,
                  }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(Math.abs(value))}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Bar dataKey="Opening Stock" fill="#3B82F6" name="Opening Stock" />
                  <Bar dataKey="Purchases" fill="#10B981" name="Purchases" />
                  <Bar dataKey="Closing Stock" fill="#EF4444" name="Closing Stock" />
                  <Bar dataKey="Total COGS" fill="#F59E0B" name="Total COGS" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  )
}

