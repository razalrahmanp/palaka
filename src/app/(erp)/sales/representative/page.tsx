'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  ShoppingCart, 
  RotateCcw, 
  MessageSquare, 
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Percent,
  DollarSign,
  Users,
  Clock,
  Trophy,
  X,
  Truck,
  CheckCircle,
  AlertCircle,
  FileQuestion
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
  delivered_orders: number
  delivered_collected: number
  delivered_pending: number
  total_collected: number
  total_pending: number
  total_not_invoiced: number
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
              onClick={() => selectedEmployee && fetchStats(selectedEmployee, timeFilter)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Floating Employee Selector for Admin Users */}
        {isAdmin && employees.length > 0 && (
          <div className="fixed bottom-24 right-6 z-50">
            <div className="relative inline-block group">
              {/* Visual button - rounded circle */}
              <div className="absolute inset-0 w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 pointer-events-none flex items-center justify-center group-hover:scale-110 transform">
                <Users className="h-5 w-5" />
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
                className="relative w-12 h-12 opacity-0 cursor-pointer"
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
          <div className="relative inline-block group">
            {/* Visual button - rounded circle */}
            <div className="absolute inset-0 w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 pointer-events-none flex items-center justify-center group-hover:scale-110 transform">
              <Clock className="h-5 w-5" />
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
              className="relative w-12 h-12 opacity-0 cursor-pointer"
              title="Select Time Period"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
            </select>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9 gap-2">
            {/* Orders & Performance Combined */}
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-sm">
              <CardContent className="p-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-blue-100 truncate">Orders</p>
                  <ShoppingCart className="h-3 w-3 text-blue-200 flex-shrink-0" />
                </div>
                <div className="text-lg font-bold text-white mb-0.5 truncate">{stats.total_orders}</div>
                <p className="text-[9px] text-blue-200 leading-tight truncate">
                  {formatPercentage(stats.conversion_rate)}
                </p>
              </CardContent>
            </Card>

            {/* Delivered Orders with Collection Status */}
            <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0 shadow-sm">
              <CardContent className="p-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-cyan-100 truncate">Delivered</p>
                  <Truck className="h-3 w-3 text-cyan-200 flex-shrink-0" />
                </div>
                <div className="text-lg font-bold text-white mb-0.5 truncate">{stats.delivered_orders || 0}</div>
                <p className="text-[9px] text-cyan-200 leading-tight truncate">
                  ₹{new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(stats.delivered_collected || 0)} • ₹{new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(stats.delivered_pending || 0)}
                </p>
              </CardContent>
            </Card>

            {/* Total Collected */}
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-sm">
              <CardContent className="p-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-emerald-100 truncate">Collected</p>
                  <CheckCircle className="h-3 w-3 text-emerald-200 flex-shrink-0" />
                </div>
                <div className="text-lg font-bold text-white mb-0.5 truncate">{formatCurrency(stats.total_collected || 0)}</div>
                <p className="text-[9px] text-emerald-200 leading-tight truncate">
                  Invoiced
                </p>
              </CardContent>
            </Card>

            {/* Total Pending */}
            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-sm">
              <CardContent className="p-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-amber-100 truncate">Pending</p>
                  <AlertCircle className="h-3 w-3 text-amber-200 flex-shrink-0" />
                </div>
                <div className="text-lg font-bold text-white mb-0.5 truncate">{formatCurrency(stats.total_pending || 0)}</div>
                <p className="text-[9px] text-amber-200 leading-tight truncate">
                  Due
                </p>
              </CardContent>
            </Card>

            {/* Not Invoiced */}
            <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white border-0 shadow-sm">
              <CardContent className="p-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-rose-100 truncate">Not Invoiced</p>
                  <FileQuestion className="h-3 w-3 text-rose-200 flex-shrink-0" />
                </div>
                <div className="text-lg font-bold text-white mb-0.5 truncate">{formatCurrency(stats.total_not_invoiced || 0)}</div>
                <p className="text-[9px] text-rose-200 leading-tight truncate">
                  Pending
                </p>
              </CardContent>
            </Card>

            {/* Total Revenue */}
            <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-sm">
              <CardContent className="p-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-teal-100 truncate">Revenue</p>
                  <DollarSign className="h-3 w-3 text-teal-200 flex-shrink-0" />
                </div>
                <div className="text-lg font-bold text-white mb-0.5 truncate">{formatCurrency(stats.total_revenue)}</div>
                <p className="text-[9px] text-teal-200 leading-tight truncate">
                  Avg: {formatCurrency(stats.average_order_value)}
                </p>
              </CardContent>
            </Card>

            {/* Total Profit */}
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-sm">
              <CardContent className="p-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-green-100 truncate">Profit</p>
                  <TrendingUp className="h-3 w-3 text-green-200 flex-shrink-0" />
                </div>
                <div className="text-lg font-bold text-white mb-0.5 truncate">{formatCurrency(stats.total_profit)}</div>
                <p className="text-[9px] text-green-200 leading-tight truncate">
                  {formatPercentage(stats.profit_margin)}
                </p>
              </CardContent>
            </Card>

            {/* Total Discount Given */}
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-sm">
              <CardContent className="p-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-purple-100 truncate">Discount</p>
                  <Percent className="h-3 w-3 text-purple-200 flex-shrink-0" />
                </div>
                <div className="text-lg font-bold text-white mb-0.5 truncate">{formatCurrency(stats.total_discount_given)}</div>
                <p className="text-[9px] text-purple-200 leading-tight truncate">
                  {formatPercentage(stats.total_revenue > 0 ? (stats.total_discount_given / stats.total_revenue) * 100 : 0)}
                </p>
              </CardContent>
            </Card>

            {/* Returns & Issues */}
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-sm">
              <CardContent className="p-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-orange-100 truncate">Returns</p>
                  <RotateCcw className="h-3 w-3 text-orange-200 flex-shrink-0" />
                </div>
                <div className="text-lg font-bold text-white mb-0.5 truncate">{stats.pending_returns}</div>
                <p className="text-[9px] text-orange-200 leading-tight truncate">
                  {stats.total_returns}R • {stats.open_complaints}C
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Floating Rankings Button */}
        <div className="fixed bottom-44 right-6 z-50">
          <button
            onClick={() => setIsRankingsOpen(true)}
            className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center group hover:scale-110 transform"
            title="View Employee Rankings"
          >
            <Trophy className="h-5 w-5" />
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
