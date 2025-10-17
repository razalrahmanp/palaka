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
  DollarSign,
  Users,
  Clock,
  Trophy,
  X,
  ChevronDown
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
  const [timeFilter, setTimeFilter] = useState('all')
  const [isRankingsOpen, setIsRankingsOpen] = useState(false)

  const fetchStats = useCallback(async (userId: string, period: string = 'all') => {
    try {
      const response = await fetch(`/api/sales/representative/${userId}/stats?period=${period}`)
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
          const response = await fetch('/api/sales/representatives?withOrders=true')
          if (response.ok) {
            const employeeData = await response.json()
            
            // Filter to show only employees with sales orders
            const employeesWithOrders = employeeData.filter((emp: Employee & { has_orders?: boolean }) => emp.has_orders !== false)
            
            // Sort employees by name in ascending order
            const sortedEmployees = employeesWithOrders.sort((a: Employee, b: Employee) => {
              const nameA = (a.name || a.email || '').toLowerCase()
              const nameB = (b.name || b.email || '').toLowerCase()
              return nameA.localeCompare(nameB)
            })
            
            setEmployees(sortedEmployees)
            
            // If there are employees, select the first one by default and fetch their stats
            if (sortedEmployees.length > 0) {
              setSelectedEmployee(sortedEmployees[0].id)
              await fetchStats(sortedEmployees[0].id, timeFilter)
            }
          }
        } catch (error) {
          console.error('Error fetching employees:', error)
          toast.error('Error loading employees')
        }
      } else {
        // For sales reps, set their own ID as selected and fetch their stats
        setSelectedEmployee(currentUser.id)
        await fetchStats(currentUser.id, timeFilter)
      }
    } catch (error) {
      console.error('Error initializing page:', error)
      toast.error('Error loading sales representative dashboard')
      setHasAccess(false)
    } finally {
      setLoading(false)
    }
  }, [fetchStats, timeFilter])

  useEffect(() => {
    initializePage()
  }, [initializePage, timeFilter])

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
              onClick={() => selectedEmployee && fetchStats(selectedEmployee, timeFilter)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Floating Employee Selector for Admin Users */}
        {isAdmin && employees.length > 0 && (
          <div className="fixed bottom-6 left-6 z-50">
            <div className="relative inline-block">
              {/* Visual button */}
              <div className="absolute inset-0 p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 pointer-events-none flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              
              {/* Actual select positioned over the button */}
              <select
                id="employee-select-floating"
                aria-label="Select Employee"
                value={selectedEmployee || ''}
                onChange={async (e) => {
                  const newEmployeeId = e.target.value
                  setSelectedEmployee(newEmployeeId)
                  if (newEmployeeId) {
                    await fetchStats(newEmployeeId, timeFilter)
                  }
                }}
                className="relative w-10 h-10 opacity-0 cursor-pointer"
                title="Select Employee"
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

        {/* Floating Time Period Filter */}
        <div className="fixed bottom-6 right-6 z-50">
          <div className="relative inline-block">
            {/* Visual button */}
            <div className="absolute inset-0 p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 pointer-events-none flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
            
            {/* Actual select positioned over the button */}
            <select
              id="time-period-select-floating"
              aria-label="Select Time Period"
              value={timeFilter}
              onChange={async (e) => {
                const newPeriod = e.target.value
                setTimeFilter(newPeriod)
                if (selectedEmployee) {
                  await fetchStats(selectedEmployee, newPeriod)
                }
              }}
              className="relative w-10 h-10 opacity-0 cursor-pointer"
              title="Select Time Period"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

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

        {/* Rankings Trigger Button */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <button
            onClick={() => setIsRankingsOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5" />
              <span className="font-semibold">View Employee Rankings</span>
            </div>
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        {/* Rankings Sidebar Modal */}
        {isRankingsOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setIsRankingsOpen(false)}
            />
            
            {/* Sidebar */}
            <div className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 shadow-lg z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-6 w-6" />
                    <h2 className="text-2xl font-bold">Employee Rankings</h2>
                  </div>
                  <button
                    onClick={() => setIsRankingsOpen(false)}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <EmployeeRankings timeFilter={timeFilter} />
              </div>
            </div>
          </>
        )}

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
                      onRefresh={() => selectedEmployee && fetchStats(selectedEmployee, timeFilter)}
                    />
                  )}
                </TabsContent>

                <TabsContent value="returns" className="mt-0">
                  {selectedEmployee && (
                    <ReturnsExchangesSection 
                      userId={selectedEmployee}
                      onRefresh={() => selectedEmployee && fetchStats(selectedEmployee, timeFilter)}
                    />
                  )}
                </TabsContent>

                <TabsContent value="complaints" className="mt-0">
                  {selectedEmployee && (
                    <ComplaintsSection 
                      userId={selectedEmployee}
                      onRefresh={() => selectedEmployee && fetchStats(selectedEmployee, timeFilter)}
                    />
                  )}
                </TabsContent>

                <TabsContent value="performance" className="mt-0">
                  {selectedEmployee && (
                    <SalesPerformanceSection 
                      userId={selectedEmployee}
                      onRefresh={() => selectedEmployee && fetchStats(selectedEmployee, timeFilter)}
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
