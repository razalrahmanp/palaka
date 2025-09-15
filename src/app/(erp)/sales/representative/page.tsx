'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  ShoppingCart, 
  RotateCcw, 
  MessageSquare, 
  TrendingUp,
  Target,
  RefreshCw,
  AlertTriangle,
  Percent,
  DollarSign
} from 'lucide-react'
import { toast } from 'sonner'
import { getCurrentUser, User } from '@/lib/auth'

interface Employee extends User {
  name?: string
  position?: string
}
import { MyOrdersSection } from '@/components/sales/representative/MyOrdersSection'
import { ReturnsExchangesSection } from '@/components/sales/representative/ReturnsExchangesSection'
import { ComplaintsSection } from '@/components/sales/representative/ComplaintsSection'
import { SalesPerformanceSection } from '@/components/sales/representative/SalesPerformanceSection'
import EmployeeRankings from '@/components/sales/representative/EmployeeRankings'

interface SalesRepStats {
  total_orders: number
  total_revenue: number
  total_discount_given: number
  total_profit: number
  total_cost: number
  profit_margin: number
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
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
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
        // Fetch all employees for admin users
        try {
          const response = await fetch('/api/sales/representatives')
          if (response.ok) {
            const employeeData = await response.json()
            setEmployees(employeeData)
            
            // If there are employees, select the first one by default and fetch their stats
            if (employeeData.length > 0) {
              setSelectedEmployee(employeeData[0].id)
              await fetchStats(employeeData[0].id)
            }
          }
        } catch (error) {
          console.error('Error fetching employees:', error)
          toast.error('Error loading employees')
        }
      } else {
        // For sales reps, set their own ID as selected and fetch their stats
        setSelectedEmployee(currentUser.id)
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
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sales Representative Dashboard</h1>
              <p className="text-gray-600 mt-1">
                {isAdmin 
                  ? `Viewing sales data for ${employees.find((emp: Employee) => emp.id === selectedEmployee)?.email || 'selected employee'}`
                  : `Welcome back, ${user?.email}! Track your orders, customers, and performance.`
                }
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => selectedEmployee && fetchStats(selectedEmployee)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Employee Selector for Admin Users */}
        {isAdmin && employees.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-4">
              <label htmlFor="employee-select" className="text-sm font-medium text-gray-900">
                Select Employee:
              </label>
              <select
                id="employee-select"
                value={selectedEmployee || ''}
                onChange={async (e) => {
                  const newEmployeeId = e.target.value
                  setSelectedEmployee(newEmployeeId)
                  if (newEmployeeId) {
                    await fetchStats(newEmployeeId)
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name || employee.email} - {employee.position || employee.role}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            {/* Orders Statistics */}
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-100">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-blue-200" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.total_orders}</div>
                <div className="flex items-center text-xs text-blue-100 mt-1">
                  <span className="text-orange-200 mr-1">{stats.pending_orders} pending</span>
                  <span>• {stats.completed_orders} completed</span>
                </div>
                <p className="text-xs text-blue-200 mt-1">
                  Revenue: {formatCurrency(stats.total_revenue)}
                </p>
              </CardContent>
            </Card>

            {/* Total Revenue */}
            <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-teal-100">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-teal-200" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{formatCurrency(stats.total_revenue)}</div>
                <div className="flex items-center text-xs text-teal-100 mt-1">
                  <span>From {stats.total_orders} orders</span>
                </div>
                <p className="text-xs text-teal-200 mt-1">
                  Average: {formatCurrency(stats.average_order_value)}
                </p>
              </CardContent>
            </Card>

            {/* Total Profit */}
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-100">Total Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-200" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{formatCurrency(stats.total_profit)}</div>
                <div className="flex items-center text-xs text-green-100 mt-1">
                  <span>{formatPercentage(stats.profit_margin)} margin</span>
                </div>
                <p className="text-xs text-green-200 mt-1">
                  Revenue - Discounts = Profit
                </p>
              </CardContent>
            </Card>

            {/* Total Discount Given */}
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-100">Total Discount</CardTitle>
                <Percent className="h-4 w-4 text-purple-200" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{formatCurrency(stats.total_discount_given)}</div>
                <div className="flex items-center text-xs text-purple-100 mt-1">
                  <span>{formatPercentage(stats.total_revenue > 0 ? (stats.total_discount_given / stats.total_revenue) * 100 : 0)} of revenue</span>
                </div>
                <p className="text-xs text-purple-200 mt-1">
                  Total savings given to customers
                </p>
              </CardContent>
            </Card>

            {/* Returns & Issues */}
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-100">Returns & Issues</CardTitle>
                <RotateCcw className="h-4 w-4 text-orange-200" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.pending_returns}</div>
                <div className="flex items-center text-xs text-orange-100 mt-1">
                  <span>{stats.total_returns} total returns</span>
                </div>
                <div className="flex items-center text-xs text-orange-200 mt-1">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  <span>{stats.open_complaints} open complaints</span>
                </div>
              </CardContent>
            </Card>

            {/* Performance */}
            <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-indigo-100">Monthly Performance</CardTitle>
                <Target className="h-4 w-4 text-indigo-200" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {formatPercentage(stats.monthly_achievement)}
                </div>
                <div className="flex items-center text-xs text-indigo-100 mt-1">
                  <span>Target: {formatCurrency(stats.monthly_target)}</span>
                </div>
                <div className="flex items-center text-xs text-indigo-200 mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>{formatPercentage(stats.conversion_rate)} conversion</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Employee Rankings Section */}
        <EmployeeRankings />

        {/* Main Content Tabs */}
        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b px-6 pt-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="orders" className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    My Orders
                    {stats?.pending_orders && stats.pending_orders > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {stats.pending_orders}
                      </Badge>
                    )}
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
                  {selectedEmployee && (
                    <MyOrdersSection 
                      userId={selectedEmployee} 
                      onRefresh={() => selectedEmployee && fetchStats(selectedEmployee)}
                    />
                  )}
                </TabsContent>

                <TabsContent value="returns" className="mt-0">
                  {selectedEmployee && (
                    <ReturnsExchangesSection 
                      userId={selectedEmployee}
                      onRefresh={() => selectedEmployee && fetchStats(selectedEmployee)}
                    />
                  )}
                </TabsContent>

                <TabsContent value="complaints" className="mt-0">
                  {selectedEmployee && (
                    <ComplaintsSection 
                      userId={selectedEmployee}
                      onRefresh={() => selectedEmployee && fetchStats(selectedEmployee)}
                    />
                  )}
                </TabsContent>

                <TabsContent value="performance" className="mt-0">
                  {selectedEmployee && (
                    <SalesPerformanceSection 
                      userId={selectedEmployee}
                      onRefresh={() => selectedEmployee && fetchStats(selectedEmployee)}
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
