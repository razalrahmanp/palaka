'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  ShoppingCart, 
  Users, 
  RotateCcw, 
  MessageSquare, 
  TrendingUp,
  Target,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { getCurrentUser, User } from '@/lib/auth'
import { MyOrdersSection } from '@/components/sales/representative/MyOrdersSection'
import { ReturnsExchangesSection } from '@/components/sales/representative/ReturnsExchangesSection'
import { ComplaintsSection } from '@/components/sales/representative/ComplaintsSection'
import { MyCustomersSection } from '@/components/sales/representative/MyCustomersSection'
import { SalesPerformanceSection } from '@/components/sales/representative/SalesPerformanceSection'

interface SalesRepStats {
  total_orders: number
  total_revenue: number
  pending_orders: number
  completed_orders: number
  total_customers: number
  new_customers_this_month: number
  pending_returns: number
  total_returns: number
  open_complaints: number
  resolved_complaints: number
  monthly_target: number
  monthly_achievement: number
  conversion_rate: number
  average_order_value: number
}

export default function SalesRepresentativePage() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<SalesRepStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [activeTab, setActiveTab] = useState('orders')
  const [selectedSalesRep, setSelectedSalesRep] = useState<string | null>(null)
  const [salesReps, setSalesReps] = useState<User[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  const fetchStats = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/sales/representative/${userId}/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        toast.error('Failed to fetch statistics')
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast.error('Error loading statistics')
    }
  }, [])

  const initializePage = useCallback(async () => {
    try {
      // Get user information using the existing auth system
      const currentUser = getCurrentUser()
      
      if (!currentUser) {
        setHasAccess(false)
        setLoading(false)
        return
      }
      
      // Check if user has access to sales representative dashboard
      const allowedRoles = ['Sales Representative', 'Sales Manager', 'System Administrator', 'Executive']
      if (!allowedRoles.includes(currentUser.role)) {
        setHasAccess(false)
        setLoading(false)
        return
      }

      setHasAccess(true)
      setUser(currentUser)
      
      // Check if user is admin (not a sales rep)
      const isAdminUser = currentUser.role !== 'Sales Representative'
      setIsAdmin(isAdminUser)

      if (isAdminUser) {
        // Fetch all sales representatives for admin users
        try {
          const response = await fetch('/api/sales/representatives')
          if (response.ok) {
            const salesRepData = await response.json()
            setSalesReps(salesRepData)
            
            // If there are sales reps, select the first one by default and fetch their stats
            if (salesRepData.length > 0) {
              setSelectedSalesRep(salesRepData[0].id)
              await fetchStats(salesRepData[0].id)
            }
          }
        } catch (error) {
          console.error('Error fetching sales representatives:', error)
          toast.error('Error loading sales representatives')
        }
      } else {
        // For sales reps, set their own ID as selected and fetch their stats
        setSelectedSalesRep(currentUser.id)
        await fetchStats(currentUser.id)
      }
    } catch (error) {
      console.error('Error initializing page:', error)
      toast.error('Error loading sales representative dashboard')
      setHasAccess(false)
    } finally {
      setLoading(false)
    }
  }, [fetchStats])

  useEffect(() => {
    initializePage()
  }, [initializePage])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading sales representative dashboard...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to access the sales representative dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sales Representative Dashboard</h1>
              <p className="text-gray-600 mt-1">
                {isAdmin 
                  ? `Viewing sales data for ${salesReps.find(rep => rep.id === selectedSalesRep)?.email || 'selected representative'}`
                  : `Welcome back, ${user?.email}! Track your orders, customers, and performance.`
                }
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => selectedSalesRep && fetchStats(selectedSalesRep)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Sales Rep Selector for Admin Users */}
        {isAdmin && salesReps.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-4">
              <label htmlFor="sales-rep-select" className="text-sm font-medium text-gray-900">
                Select Sales Representative:
              </label>
              <select
                id="sales-rep-select"
                value={selectedSalesRep || ''}
                onChange={async (e) => {
                  const newRepId = e.target.value
                  setSelectedSalesRep(newRepId)
                  if (newRepId) {
                    await fetchStats(newRepId)
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {salesReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Orders Statistics */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.total_orders}</div>
                <div className="flex items-center text-xs text-gray-600 mt-1">
                  <span className="text-orange-600 mr-1">{stats.pending_orders} pending</span>
                  <span>• {stats.completed_orders} completed</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Revenue: {formatCurrency(stats.total_revenue)}
                </p>
              </CardContent>
            </Card>

            {/* Customers Statistics */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Customers</CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.total_customers}</div>
                <div className="flex items-center text-xs text-green-700 mt-1">
                  <span>+{stats.new_customers_this_month} this month</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Avg Order: {formatCurrency(stats.average_order_value)}
                </p>
              </CardContent>
            </Card>

            {/* Returns & Issues */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Returns & Issues</CardTitle>
                <RotateCcw className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.pending_returns}</div>
                <div className="flex items-center text-xs text-gray-600 mt-1">
                  <span>{stats.total_returns} total returns</span>
                </div>
                <div className="flex items-center text-xs text-red-600 mt-1">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  <span>{stats.open_complaints} open complaints</span>
                </div>
              </CardContent>
            </Card>

            {/* Performance */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Performance</CardTitle>
                <Target className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatPercentage(stats.monthly_achievement)}
                </div>
                <div className="flex items-center text-xs text-gray-600 mt-1">
                  <span>Target: {formatCurrency(stats.monthly_target)}</span>
                </div>
                <div className="flex items-center text-xs text-green-600 mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>{formatPercentage(stats.conversion_rate)} conversion</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b px-6 pt-6">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="orders" className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    My Orders
                    {stats?.pending_orders && stats.pending_orders > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {stats.pending_orders}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="customers" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Customers
                  </TabsTrigger>
                  <TabsTrigger value="returns" className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Returns/Exchanges
                    {stats?.pending_returns && stats.pending_returns > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {stats.pending_returns}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="complaints" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Complaints
                    {stats?.open_complaints && stats.open_complaints > 0 && (
                      <Badge variant="destructive" className="ml-1">
                        {stats.open_complaints}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Performance
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="orders" className="mt-0">
                  {selectedSalesRep && (
                    <MyOrdersSection 
                      userId={selectedSalesRep} 
                      onRefresh={() => selectedSalesRep && fetchStats(selectedSalesRep)}
                    />
                  )}
                </TabsContent>

                <TabsContent value="customers" className="mt-0">
                  {selectedSalesRep && (
                    <MyCustomersSection
                      userId={selectedSalesRep}
                    />
                  )}
                </TabsContent>

                <TabsContent value="returns" className="mt-0">
                  {selectedSalesRep && (
                    <ReturnsExchangesSection 
                      userId={selectedSalesRep}
                      onRefresh={() => selectedSalesRep && fetchStats(selectedSalesRep)}
                    />
                  )}
                </TabsContent>

                <TabsContent value="complaints" className="mt-0">
                  {selectedSalesRep && (
                    <ComplaintsSection 
                      userId={selectedSalesRep}
                      onRefresh={() => selectedSalesRep && fetchStats(selectedSalesRep)}
                    />
                  )}
                </TabsContent>

                <TabsContent value="performance" className="mt-0">
                  {selectedSalesRep && (
                    <SalesPerformanceSection 
                      userId={selectedSalesRep}
                      onRefresh={() => selectedSalesRep && fetchStats(selectedSalesRep)}
                    />
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
