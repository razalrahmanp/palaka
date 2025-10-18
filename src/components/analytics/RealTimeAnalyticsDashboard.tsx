'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  Activity,
  RefreshCw,
  Download,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Scale,
  Wallet,
  Receipt,
  Clock,
  Calendar,
  ChevronRight
} from 'lucide-react'


interface RealTimeAnalyticsProps {
  dateRange?: {
    startDate: string
    endDate: string
  }
}

interface AnalyticsData {
  overview: {
    kpis: {
      totalRevenue: number
      totalOrders: number
      avgOrderValue: number
      activeCustomers: number
      revenueGrowth: number
      profitMargin: number
    }
  }
  profitLoss: Array<{
    month: string
    revenue: number
    expenses: number
    profit: number
    profitMargin: number
  }>
  cashFlow: Array<{
    month: string
    inflow: number
    outflow: number
    net: number
  }>
  salesByCategory: Array<{
    category: string
    revenue: number
    orders: number
    percentage: number
  }>
  topProducts: Array<{
    name: string
    revenue: number
    units: number
    growth: number
  }>
  customerSegments: Array<{
    segment: string
    customers: number
    revenue: number
    avgValue: number
  }>
  expenseBreakdown: Array<{
    category: string
    amount: number
    percentage: number
  }>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function RealTimeAnalyticsDashboard({ dateRange }: RealTimeAnalyticsProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState('30d')

  const fetchAnalyticsData = async () => {
    // Use dateRange prop if provided, otherwise use timeRange state
    try {
      setLoading(true)
      
      // Calculate date range based on timeRange selection
      const endDate = new Date()
      const startDate = new Date()
      
      if (timeRange === '7d') {
        startDate.setDate(endDate.getDate() - 7)
      } else if (timeRange === '30d') {
        startDate.setDate(endDate.getDate() - 30)
      } else if (timeRange === '90d') {
        startDate.setDate(endDate.getDate() - 90)
      } else if (timeRange === '1y') {
        startDate.setFullYear(endDate.getFullYear() - 1)
      }

      // Use the actual finance APIs that the reports use
      const [profitLossRes, cashFlowRes, kpisRes] = await Promise.all([
        fetch(`/api/finance/reports/profit-loss?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`),
        fetch(`/api/finance/reports/cash-flow?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`),
        fetch(`/api/dashboard/kpis?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`)
      ])

      const [profitLossData, cashFlowData, kpisData] = await Promise.all([
        profitLossRes.ok ? profitLossRes.json() : null,
        cashFlowRes.ok ? cashFlowRes.json() : null,
        kpisRes.ok ? kpisRes.json() : null
      ])

      // Transform Profit & Loss data into monthly format
      const profitLossMonthly = profitLossData?.summary ? (() => {
        const totalRevenue = profitLossData.summary.total_revenue || 0
        const totalCogs = profitLossData.summary.total_cogs || 0
        const totalExpenses = profitLossData.summary.total_expenses || 0
        const netIncome = profitLossData.summary.net_income || 0

        return [{
          month: 'Current Period',
          revenue: totalRevenue,
          expenses: totalCogs + totalExpenses,
          profit: netIncome,
          profitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
        }]
      })() : []

      // Transform Cash Flow data
      const cashFlowMonthly = cashFlowData?.summary ? (() => {
        interface CashFlowSummary {
          operating_cash_flow?: number
          investing_cash_flow?: number
          financing_cash_flow?: number
          net_cash_flow?: number
        }
        const summary = cashFlowData.summary as CashFlowSummary
        
        const operatingCash = summary.operating_cash_flow || 0
        const investingCash = summary.investing_cash_flow || 0
        const financingCash = summary.financing_cash_flow || 0
        
        const totalInflow = Math.max(0, operatingCash) + Math.max(0, investingCash) + Math.max(0, financingCash)
        const totalOutflow = Math.abs(Math.min(0, operatingCash)) + Math.abs(Math.min(0, investingCash)) + Math.abs(Math.min(0, financingCash))

        return [{
          month: 'Current Period',
          inflow: totalInflow,
          outflow: totalOutflow,
          net: (summary.net_cash_flow || (totalInflow - totalOutflow))
        }]
      })() : []

      const transformedData: AnalyticsData = {
        overview: {
          kpis: {
            totalRevenue: kpisData?.revenue || 0,
            totalOrders: kpisData?.orders || 0,
            avgOrderValue: kpisData?.orders > 0 ? (kpisData?.revenue || 0) / kpisData.orders : 0,
            activeCustomers: kpisData?.customers || 0,
            revenueGrowth: kpisData?.revenueGrowth || 0,
            profitMargin: profitLossMonthly[0]?.profitMargin || 0
          }
        },
        profitLoss: profitLossMonthly,
        cashFlow: cashFlowMonthly,
        salesByCategory: [],
        topProducts: [],
        customerSegments: [],
        expenseBreakdown: []
      }

      console.log('Analytics Data Fetched:', {
        profitLossData,
        cashFlowData,
        kpisData,
        transformedData
      })

      setData(transformedData)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalyticsData()
    setRefreshing(false)
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    )
  }

  if (!data || !data.overview || !data.overview.kpis) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="text-gray-600">Failed to load analytics data</p>
          <Button onClick={fetchAnalyticsData}>Retry</Button>
        </div>
      </div>
    )
  }

  const kpis = data.overview.kpis

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Real-Time Analytics Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Comprehensive business insights from your actual data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {['7d', '30d', '90d', '1y'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range === '7d' && '7 Days'}
                {range === '30d' && '30 Days'}
                {range === '90d' && '90 Days'}
                {range === '1y' && '1 Year'}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{formatNumber(kpis.totalRevenue)}</div>
                <div className={`flex items-center text-xs mt-1 ${kpis.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpis.revenueGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Math.abs(kpis.revenueGrowth).toFixed(1)}% vs last period
                </div>
              </div>
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{kpis.totalOrders.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">Across all channels</div>
              </div>
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{formatCurrency(kpis.avgOrderValue)}</div>
                <div className="text-xs text-gray-500 mt-1">Per transaction</div>
              </div>
              <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{kpis.activeCustomers.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">With recent orders</div>
              </div>
              <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Profit Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{kpis.profitMargin.toFixed(1)}%</div>
                <div className="text-xs text-green-600 mt-1">
                  Healthy margin
                </div>
              </div>
              <div className="h-10 w-10 bg-teal-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Growth Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-2xl font-bold ${kpis.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpis.revenueGrowth >= 0 ? '+' : ''}{kpis.revenueGrowth.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">Revenue growth</div>
              </div>
              <div className={`h-10 w-10 ${kpis.revenueGrowth >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
                {kpis.revenueGrowth >= 0 ? (
                  <ArrowUpRight className="h-5 w-5 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Reports Section */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Financial Reports & Analysis
          </CardTitle>
          <p className="text-sm text-gray-600">Access detailed financial reports and statements</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Profit & Loss Statement */}
            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer group border-2 hover:border-blue-500"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <TrendingUp className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        Profit & Loss
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">Income Statement</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </CardContent>
            </Card>

            {/* Trial Balance */}
            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer group border-2 hover:border-green-500"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <Scale className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                        Trial Balance
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">Account Balances</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>
              </CardContent>
            </Card>

            {/* Cash Flow Statement */}
            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer group border-2 hover:border-purple-500"
            >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <Wallet className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                          Cash Flow
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">Cash Movement</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                  </div>
                </CardContent>
            </Card>

            {/* Balance Sheet */}
            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer group border-2 hover:border-orange-500"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                      <Receipt className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                        Balance Sheet
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">Assets & Liabilities</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
                </div>
              </CardContent>
            </Card>

            {/* Accounts Payable & Receivable */}
            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer group border-2 hover:border-teal-500"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-teal-100 rounded-lg flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                      <DollarSign className="h-6 w-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                        AP & AR
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">Payables & Receivables</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-teal-600 transition-colors" />
                </div>
              </CardContent>
            </Card>

            {/* Day Sheet */}
            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer group border-2 hover:border-cyan-500"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-cyan-100 rounded-lg flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
                      <Calendar className="h-6 w-6 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-cyan-600 transition-colors">
                        Day Sheet
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">Daily Transactions</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-600 transition-colors" />
                </div>
              </CardContent>
            </Card>

            {/* Aging Report */}
            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer group border-2 hover:border-pink-500"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-pink-100 rounded-lg flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                      <Clock className="h-6 w-6 text-pink-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-pink-600 transition-colors">
                        Aging Report
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">Outstanding Balances</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-pink-600 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
