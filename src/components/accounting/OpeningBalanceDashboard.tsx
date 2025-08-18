'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Building,
  CreditCard,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  Calculator,
  Package,
  MapPin,
  Eye,
  Edit,
  Plus,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface OpeningBalanceSummary {
  balance_type: string
  total_count: number
  draft_count: number
  posted_count: number
  total_amount: number
  draft_amount: number
  posted_amount: number
}

interface RecentActivity {
  id: string
  balance_type: string
  entity_name: string
  amount: number
  status: string
  created_at: string
  posted_at?: string
}

const BALANCE_TYPE_CONFIG = {
  'VENDOR_OUTSTANDING': { 
    label: 'Vendor Outstanding', 
    icon: Building, 
    color: 'bg-blue-500',
    description: 'Amounts owed to suppliers'
  },
  'BANK_LOAN': { 
    label: 'Bank Loans', 
    icon: CreditCard, 
    color: 'bg-red-500',
    description: 'Outstanding bank loans'
  },
  'PERSONAL_LOAN': { 
    label: 'Personal Loans', 
    icon: Users, 
    color: 'bg-orange-500',
    description: 'Personal loans from individuals'
  },
  'GOLD_LOAN': { 
    label: 'Gold Loans', 
    icon: TrendingUp, 
    color: 'bg-yellow-500',
    description: 'Loans against gold collateral'
  },
  'INVESTOR_CAPITAL': { 
    label: 'Investor Capital', 
    icon: DollarSign, 
    color: 'bg-green-500',
    description: 'Investment capital received'
  },
  'MONTHLY_RETURNS': { 
    label: 'Monthly Returns', 
    icon: Calendar, 
    color: 'bg-purple-500',
    description: 'Monthly returns payable'
  },
  'GOVERNMENT_DUES': { 
    label: 'Government Dues', 
    icon: MapPin, 
    color: 'bg-gray-500',
    description: 'Government obligations'
  },
  'TAX_LIABILITY': { 
    label: 'Tax Liability', 
    icon: Calculator, 
    color: 'bg-indigo-500',
    description: 'Outstanding tax liabilities'
  },
  'EMPLOYEE_ADVANCE': { 
    label: 'Employee Advances', 
    icon: Users, 
    color: 'bg-teal-500',
    description: 'Advances given to employees'
  },
  'CUSTOMER_ADVANCE': { 
    label: 'Customer Advances', 
    icon: Package, 
    color: 'bg-cyan-500',
    description: 'Advances from customers'
  }
}

interface OpeningBalanceDashboardProps {
  onNavigateToSetup?: (balanceType?: string) => void
}

interface SummaryData {
  count: number
  draft_count?: number
  posted_count?: number
  draft: number
  posted: number
}

export default function OpeningBalanceDashboard({ onNavigateToSetup }: OpeningBalanceDashboardProps) {
  const [summaryData, setSummaryData] = useState<OpeningBalanceSummary[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [currentYear] = useState(new Date().getFullYear())

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch summary data
      const summaryResponse = await fetch(`/api/accounting/opening-balances?summary=true&year=${currentYear}`)
      if (summaryResponse.ok) {
        const summaryResult = await summaryResponse.json()
        const summaryArray = Object.entries(summaryResult.summary).map(([type, data]) => {
          const summaryInfo = data as SummaryData
          return {
            balance_type: type,
            total_count: summaryInfo.count || 0,
            draft_count: summaryInfo.draft_count || 0,
            posted_count: summaryInfo.posted_count || 0,
            total_amount: (summaryInfo.draft || 0) + (summaryInfo.posted || 0),
            draft_amount: summaryInfo.draft || 0,
            posted_amount: summaryInfo.posted || 0
          }
        })
        setSummaryData(summaryArray)
      }

      // Fetch recent activity
      const activityResponse = await fetch(`/api/accounting/opening-balances?limit=10&year=${currentYear}`)
      if (activityResponse.ok) {
        const activityResult = await activityResponse.json()
        setRecentActivity(activityResult.data || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [currentYear])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Calculate totals
  const totalDraftAmount = summaryData.reduce((sum, item) => sum + item.draft_amount, 0)
  const totalPostedAmount = summaryData.reduce((sum, item) => sum + item.posted_amount, 0)
  const totalAmount = totalDraftAmount + totalPostedAmount
  const totalEntries = summaryData.reduce((sum, item) => sum + item.total_count, 0)

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`

  const getBalanceTypeInfo = (type: string) => {
    return BALANCE_TYPE_CONFIG[type as keyof typeof BALANCE_TYPE_CONFIG] || {
      label: type,
      icon: Package,
      color: 'bg-gray-500',
      description: type
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Opening Balance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage enhanced opening balances for {currentYear}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchDashboardData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => onNavigateToSetup?.()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Setup Balances
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold">{totalEntries}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Calculator className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Draft Amount</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalDraftAmount)}</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Edit className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Posted Amount</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPostedAmount)}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList>
          <TabsTrigger value="summary">Balance Type Summary</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {summaryData.filter(item => item.total_count > 0).map((item) => {
              const config = getBalanceTypeInfo(item.balance_type)
              const Icon = config.icon
              const completionRate = item.total_count > 0 ? (item.posted_count / item.total_count) * 100 : 0

              return (
                <Card key={item.balance_type} className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => onNavigateToSetup?.(item.balance_type)}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                    <div className={`p-2 rounded-full ${config.color} bg-opacity-10`}>
                      <Icon className={`h-4 w-4 ${config.color.replace('bg-', 'text-')}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-2xl font-bold">{formatCurrency(item.total_amount)}</div>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Draft:</span>
                          <div className="font-medium text-orange-600">{formatCurrency(item.draft_amount)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Posted:</span>
                          <div className="font-medium text-green-600">{formatCurrency(item.posted_amount)}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.total_count} entries</Badge>
                          <Badge variant={completionRate === 100 ? 'default' : 'secondary'}>
                            {Math.round(completionRate)}% posted
                          </Badge>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {summaryData.filter(item => item.total_count > 0).length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Opening Balances Found</h3>
                <p className="text-muted-foreground mb-4">
                  Start by setting up opening balances for your business entities.
                </p>
                <Button onClick={() => onNavigateToSetup?.()} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Setup Opening Balances
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No recent activity found.
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => {
                    const config = getBalanceTypeInfo(activity.balance_type)
                    const Icon = config.icon

                    return (
                      <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${config.color} bg-opacity-10`}>
                            <Icon className={`h-4 w-4 ${config.color.replace('bg-', 'text-')}`} />
                          </div>
                          <div>
                            <div className="font-medium">{activity.entity_name}</div>
                            <div className="text-sm text-muted-foreground">{config.label}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(activity.amount)}</div>
                          <div className="flex items-center gap-2">
                            <Badge variant={activity.status === 'POSTED' ? 'default' : 'secondary'}>
                              {activity.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(activity.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
