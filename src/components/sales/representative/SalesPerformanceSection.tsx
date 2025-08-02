'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, TrendingUp, Target, Award, Calendar, DollarSign, Users, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

interface PerformanceMetrics {
  sales_period: string
  total_revenue: number
  total_orders: number
  average_order_value: number
  conversion_rate: number
  customer_acquisition: number
  customer_retention_rate: number
  target_achievement: number
  quota_assigned: number
  quota_achieved: number
  ranking: number
  total_sales_reps: number
}

interface MonthlyPerformance {
  month: string
  revenue: number
  orders: number
  customers: number
  target: number
  achievement_percentage: number
}

interface ProductPerformance {
  product_name: string
  category: string
  units_sold: number
  revenue: number
  profit_margin: number
  rank: number
}

interface SalesPerformanceSectionProps {
  userId: string
  onRefresh?: () => void
}

export function SalesPerformanceSection({ userId }: SalesPerformanceSectionProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyPerformance[]>([])
  const [productData, setProductData] = useState<ProductPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('current_month')
  const [detailView, setDetailView] = useState<'overview' | 'monthly' | 'products'>('overview')

  const fetchPerformanceData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        period: selectedPeriod
      })

      const [metricsResponse, monthlyResponse, productResponse] = await Promise.all([
        fetch(`/api/sales/representative/${userId}/performance/metrics?${params}`),
        fetch(`/api/sales/representative/${userId}/performance/monthly?${params}`),
        fetch(`/api/sales/representative/${userId}/performance/products?${params}`)
      ])

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData)
      }

      if (monthlyResponse.ok) {
        const monthlyData = await monthlyResponse.json()
        setMonthlyData(monthlyData.months || [])
      }

      if (productResponse.ok) {
        const productData = await productResponse.json()
        setProductData(productData.products || [])
      }

      if (!metricsResponse.ok && !monthlyResponse.ok && !productResponse.ok) {
        toast.error('Failed to fetch performance data')
      }
    } catch (error) {
      console.error('Error fetching performance data:', error)
      toast.error('Error loading performance data')
    } finally {
      setLoading(false)
    }
  }, [userId, selectedPeriod])

  useEffect(() => {
    fetchPerformanceData()
  }, [fetchPerformanceData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getPerformanceBadge = (percentage: number) => {
    if (percentage >= 100) {
      return <Badge className="bg-green-600">Exceeded</Badge>
    } else if (percentage >= 90) {
      return <Badge className="bg-blue-600">On Track</Badge>
    } else if (percentage >= 70) {
      return <Badge variant="secondary">Behind</Badge>
    } else {
      return <Badge variant="destructive">Critical</Badge>
    }
  }

  const getRankingBadge = (rank: number, total: number) => {
    const percentage = (rank / total) * 100
    if (percentage <= 20) {
      return <Badge className="bg-gold text-yellow-900">Top 20%</Badge>
    } else if (percentage <= 50) {
      return <Badge className="bg-blue-600">Top 50%</Badge>
    } else {
      return <Badge variant="secondary">Bottom 50%</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Sales Performance
          </CardTitle>
          <div className="flex gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Current Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="current_quarter">Current Quarter</SelectItem>
                <SelectItem value="last_quarter">Last Quarter</SelectItem>
                <SelectItem value="current_year">Current Year</SelectItem>
                <SelectItem value="last_year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex border rounded-lg">
              <Button
                variant={detailView === 'overview' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDetailView('overview')}
              >
                Overview
              </Button>
              <Button
                variant={detailView === 'monthly' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDetailView('monthly')}
              >
                Monthly
              </Button>
              <Button
                variant={detailView === 'products' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDetailView('products')}
              >
                Products
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading performance data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Performance Indicators */}
            {metrics && detailView === 'overview' && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-blue-800">Total Revenue</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(metrics.total_revenue)}
                    </p>
                    <p className="text-sm text-blue-700">
                      {metrics.total_orders} orders
                    </p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-800">Target Achievement</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {formatPercentage(metrics.target_achievement)}
                    </p>
                    <div className="mt-1">
                      {getPerformanceBadge(metrics.target_achievement)}
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      <span className="font-semibold text-purple-800">Avg Order Value</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(metrics.average_order_value)}
                    </p>
                    <p className="text-sm text-purple-700">
                      {formatPercentage(metrics.conversion_rate)} conversion
                    </p>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="h-5 w-5 text-orange-600" />
                      <span className="font-semibold text-orange-800">Ranking</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">
                      #{metrics.ranking}
                    </p>
                    <div className="mt-1">
                      {getRankingBadge(metrics.ranking, metrics.total_sales_reps)}
                    </div>
                  </div>
                </div>

                {/* Quota Progress */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Quota Progress</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Achieved: {formatCurrency(metrics.quota_achieved)}</span>
                      <span>Target: {formatCurrency(metrics.quota_assigned)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${
                          metrics.target_achievement >= 100
                            ? 'bg-green-500'
                            : metrics.target_achievement >= 70
                            ? 'bg-blue-500'
                            : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.min(metrics.target_achievement, 100)}%` }}
                      />
                    </div>
                    <p className="text-center text-sm font-medium">
                      {formatPercentage(metrics.target_achievement)} of quota achieved
                    </p>
                  </div>
                </div>

                {/* Customer Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-gray-600" />
                      <span className="font-semibold">Customer Acquisition</span>
                    </div>
                    <p className="text-xl font-bold text-gray-700">
                      {metrics.customer_acquisition} new customers
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="h-5 w-5 text-gray-600" />
                      <span className="font-semibold">Customer Retention</span>
                    </div>
                    <p className="text-xl font-bold text-gray-700">
                      {formatPercentage(metrics.customer_retention_rate)}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Monthly Performance */}
            {detailView === 'monthly' && (
              <div>
                <h3 className="font-semibold mb-4">Monthly Performance Trend</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Customers</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Achievement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No monthly data available
                          </TableCell>
                        </TableRow>
                      ) : (
                        monthlyData.map((month) => (
                          <TableRow key={month.month}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {month.month}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(month.revenue)}
                            </TableCell>
                            <TableCell>{month.orders}</TableCell>
                            <TableCell>{month.customers}</TableCell>
                            <TableCell>{formatCurrency(month.target)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {formatPercentage(month.achievement_percentage)}
                                </span>
                                {getPerformanceBadge(month.achievement_percentage)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Product Performance */}
            {detailView === 'products' && (
              <div>
                <h3 className="font-semibold mb-4">Top Performing Products</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Units Sold</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Profit Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No product data available
                          </TableCell>
                        </TableRow>
                      ) : (
                        productData.map((product) => (
                          <TableRow key={product.product_name}>
                            <TableCell>
                              <Badge variant="outline">#{product.rank}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {product.product_name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{product.category}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {product.units_sold}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(product.revenue)}
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${
                                product.profit_margin >= 20 
                                  ? 'text-green-600' 
                                  : product.profit_margin >= 10 
                                  ? 'text-orange-600' 
                                  : 'text-red-600'
                              }`}>
                                {formatPercentage(product.profit_margin)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
