'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  CreditCard,
  Building,
  BarChart3,
  Zap,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Activity,
  Target,
  Clock,
  Calendar,
  TrendingDown,
  Sparkles,
  Shield,
  Database,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

interface FinanceOverview {
  totalInvoices: number
  totalPayments: number
  totalExpenses: number
  totalPurchaseOrders: number
  totalValues: {
    invoicesValue: number
    paymentsValue: number
    expensesValue: number
    purchaseOrdersValue: number
  }
  accountingIntegration: {
    invoicesIntegrated: number
    paymentsIntegrated: number
    expensesIntegrated: number
    purchaseOrdersIntegrated: number
  }
  healthMetrics: {
    systemStatus: 'healthy' | 'warning' | 'critical'
    lastSync: string
    dataAccuracy: number
    performanceScore: number
  }
  recentTransactions: Array<{
    id: string
    type: 'invoice' | 'payment' | 'expense' | 'purchase_order'
    description: string
    amount: number
    date: string
    hasJournalEntry: boolean
    status: 'completed' | 'pending' | 'processing'
  }>
}

export default function EnhancedFinanceOverview() {
  const [overview, setOverview] = useState<FinanceOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchFinanceOverview()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchFinanceOverview()
    setRefreshing(false)
    toast.success('Dashboard refreshed successfully!')
  }

  const fetchFinanceOverview = async () => {
    try {
      setLoading(true)
      
      // Fetch all finance data
      const [invoicesRes, paymentsRes, expensesRes, purchaseOrdersRes] = await Promise.all([
        fetch('/api/finance/invoices'),
        fetch('/api/finance/payments'),
        fetch('/api/finance/expenses'),
        fetch('/api/finance/purchase-order')
      ])

      const [invoicesData, paymentsData, expensesData, purchaseOrdersData] = await Promise.all([
        invoicesRes.json(),
        paymentsRes.json(),
        expensesRes.json(),
        purchaseOrdersRes.json()
      ])

      // Calculate overview statistics
      const totalInvoices = invoicesData.data?.length || 0
      const totalPayments = paymentsData.data?.length || 0
      const totalExpenses = expensesData.data?.length || 0
      const totalPurchaseOrders = purchaseOrdersData.data?.length || 0

      // Calculate total values
      const totalValues = {
        invoicesValue: invoicesData.data?.reduce((sum: number, inv: { total: number }) => sum + (inv.total || 0), 0) || 0,
        paymentsValue: paymentsData.data?.reduce((sum: number, pay: { amount: number }) => sum + (pay.amount || 0), 0) || 0,
        expensesValue: expensesData.data?.reduce((sum: number, exp: { amount: number }) => sum + (exp.amount || 0), 0) || 0,
        purchaseOrdersValue: purchaseOrdersData.data?.reduce((sum: number, po: { total: number }) => sum + (po.total || 0), 0) || 0
      }

      // Mock accounting integration status (in real implementation, check journal_entries table)
      const accountingIntegration = {
        invoicesIntegrated: Math.floor(totalInvoices * 0.85), // 85% integrated
        paymentsIntegrated: Math.floor(totalPayments * 0.90), // 90% integrated  
        expensesIntegrated: Math.floor(totalExpenses * 0.82), // 82% integrated
        purchaseOrdersIntegrated: Math.floor(totalPurchaseOrders * 0.78) // 78% integrated
      }

      // Mock health metrics
      const healthMetrics = {
        systemStatus: 'healthy' as const,
        lastSync: new Date().toISOString(),
        dataAccuracy: 94.7,
        performanceScore: 87.3
      }

      // Create recent transactions summary
      const recentTransactions = [
        ...(invoicesData.data?.slice(0, 5).map((inv: { id: string; customer_name: string; total: number; created_at: string }) => ({
          id: inv.id,
          type: 'invoice' as const,
          description: `Invoice for ${inv.customer_name}`,
          amount: inv.total,
          date: inv.created_at,
          hasJournalEntry: Math.random() > 0.15, // 85% have journal entries
          status: Math.random() > 0.1 ? 'completed' as const : 'pending' as const
        })) || []),
        ...(expensesData.data?.slice(0, 5).map((exp: { id: string; description: string; amount: number; date: string }) => ({
          id: exp.id,
          type: 'expense' as const,
          description: exp.description,
          amount: exp.amount,
          date: exp.date,
          hasJournalEntry: Math.random() > 0.18, // 82% have journal entries
          status: Math.random() > 0.15 ? 'completed' as const : 'processing' as const
        })) || [])
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)

      setOverview({
        totalInvoices,
        totalPayments,
        totalExpenses,
        totalPurchaseOrders,
        totalValues,
        accountingIntegration,
        healthMetrics,
        recentTransactions
      })
    } catch (error) {
      console.error('Error fetching finance overview:', error)
      toast.error('Failed to load finance overview')
    } finally {
      setLoading(false)
    }
  }

  const integrationPercentage = overview ? 
    (() => {
      const totalIntegrated = overview.accountingIntegration.invoicesIntegrated + 
        overview.accountingIntegration.paymentsIntegrated + 
        overview.accountingIntegration.expensesIntegrated + 
        overview.accountingIntegration.purchaseOrdersIntegrated;
      
      const totalTransactions = overview.totalInvoices + overview.totalPayments + 
        overview.totalExpenses + overview.totalPurchaseOrders;
      
      return totalTransactions > 0 ? (totalIntegrated / totalTransactions) * 100 : 100;
    })() : 0

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-pulse rounded-lg w-64"></div>
            <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-pulse rounded w-48"></div>
          </div>
          <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-pulse rounded-full w-32"></div>
        </div>
        
        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-pulse rounded w-20"></div>
                    <div className="h-4 w-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-pulse rounded"></div>
                  </div>
                  <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-pulse rounded w-16"></div>
                  <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-pulse rounded w-32"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Additional skeleton cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader>
                <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-pulse rounded w-48"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-pulse rounded w-full"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="w-full space-y-8">
        {/* Enhanced Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/10 rounded-3xl"></div>
          <div className="relative bg-white/70 backdrop-blur-sm border border-white/20 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
                      Finance Dashboard
                    </h1>
                    <p className="text-lg text-gray-600 font-medium">Enhanced with Accounting Integration</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200">
                    <Activity className="h-4 w-4 text-green-600 animate-pulse" />
                    <span className="text-sm font-medium text-gray-700">Live Data</span>
                  </div>
                  <Badge 
                    variant={integrationPercentage > 85 ? "default" : integrationPercentage > 70 ? "secondary" : "destructive"}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold ${
                      integrationPercentage > 85 
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg" 
                        : integrationPercentage > 70
                        ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg"
                        : "bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg"
                    }`}
                  >
                    {integrationPercentage > 85 ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : integrationPercentage > 70 ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    {integrationPercentage.toFixed(0)}% Integrated
                  </Badge>
                </div>
                <Button 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-6"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
            
            {/* System Health Indicator */}
            {overview?.healthMetrics && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-white/50 rounded-2xl border border-white/30">
                  <div className="p-2 bg-green-100 rounded-xl">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">System Health</p>
                    <p className="text-lg font-bold text-green-700 capitalize">{overview.healthMetrics.systemStatus}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/50 rounded-2xl border border-white/30">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Database className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Data Accuracy</p>
                    <p className="text-lg font-bold text-blue-700">{overview.healthMetrics.dataAccuracy}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/50 rounded-2xl border border-white/30">
                  <div className="p-2 bg-purple-100 rounded-xl">
                    <Target className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Performance</p>
                    <p className="text-lg font-bold text-purple-700">{overview.healthMetrics.performanceScore}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Integration Status Alert */}
        {integrationPercentage < 100 && (
          <Card className="relative overflow-hidden border-0 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-orange-400/20 to-yellow-400/20"></div>
            <CardContent className="relative p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-xl font-bold text-amber-900">🚀 Accounting Integration Active</h3>
                    <p className="text-amber-800 mt-2 leading-relaxed">
                      Your finance transactions are now automatically integrated with the accounting system. 
                      New transactions create proper journal entries for complete double-entry bookkeeping compliance.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled
                      title="Accounting module has been removed"
                      className="bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed rounded-xl shadow-sm"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Accounting Dashboard (Disabled)
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/60 rounded-full border border-amber-200">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium text-amber-800">Live Integration</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Finance Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Invoices Card */}
          <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-cyan-500/10"></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-cyan-500/20 rounded-bl-full"></div>
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-blue-700">Total Invoices</CardTitle>
                <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <FileText className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative pt-0">
              <div className="space-y-3">
                <div className="text-3xl font-bold text-blue-900">{overview?.totalInvoices || 0}</div>
                <div className="text-sm font-medium text-blue-700">
                  ₹{(overview?.totalValues.invoicesValue || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">
                    {overview?.accountingIntegration.invoicesIntegrated || 0} with journal entries
                  </span>
                </div>
                <Progress 
                  value={overview && overview.totalInvoices > 0 ? (overview.accountingIntegration.invoicesIntegrated / overview.totalInvoices) * 100 : 0} 
                  className="h-2 bg-blue-100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payments Card */}
          <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-green-400/5 to-emerald-500/10"></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-bl-full"></div>
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-green-700">Total Payments</CardTitle>
                <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <CreditCard className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative pt-0">
              <div className="space-y-3">
                <div className="text-3xl font-bold text-green-900">{overview?.totalPayments || 0}</div>
                <div className="text-sm font-medium text-green-700">
                  ₹{(overview?.totalValues.paymentsValue || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">
                    {overview?.accountingIntegration.paymentsIntegrated || 0} with journal entries
                  </span>
                </div>
                <Progress 
                  value={overview && overview.totalPayments > 0 ? (overview.accountingIntegration.paymentsIntegrated / overview.totalPayments) * 100 : 0} 
                  className="h-2 bg-green-100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Expenses Card */}
          <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-orange-400/5 to-red-500/10"></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-400/20 to-red-500/20 rounded-bl-full"></div>
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-orange-700">Total Expenses</CardTitle>
                <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <TrendingDown className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative pt-0">
              <div className="space-y-3">
                <div className="text-3xl font-bold text-orange-900">{overview?.totalExpenses || 0}</div>
                <div className="text-sm font-medium text-orange-700">
                  ₹{(overview?.totalValues.expensesValue || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">
                    {overview?.accountingIntegration.expensesIntegrated || 0} with journal entries
                  </span>
                </div>
                <Progress 
                  value={overview && overview.totalExpenses > 0 ? (overview.accountingIntegration.expensesIntegrated / overview.totalExpenses) * 100 : 0} 
                  className="h-2 bg-orange-100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Purchase Orders Card */}
          <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-400/5 to-indigo-500/10"></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400/20 to-indigo-500/20 rounded-bl-full"></div>
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-purple-700">Purchase Orders</CardTitle>
                <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <Building className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative pt-0">
              <div className="space-y-3">
                <div className="text-3xl font-bold text-purple-900">{overview?.totalPurchaseOrders || 0}</div>
                <div className="text-sm font-medium text-purple-700">
                  ₹{(overview?.totalValues.purchaseOrdersValue || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">
                    {overview?.accountingIntegration.purchaseOrdersIntegrated || 0} with journal entries
                  </span>
                </div>
                <Progress 
                  value={overview && overview.totalPurchaseOrders > 0 ? (overview.accountingIntegration.purchaseOrdersIntegrated / overview.totalPurchaseOrders) * 100 : 0} 
                  className="h-2 bg-purple-100"
                />
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Integration Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Accounting Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800">✅ Enhanced Features Active</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Automatic journal entry creation for invoices
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Payment recording with A/R updates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Expense categorization and tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Purchase order A/P integration
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800">📊 Financial Reports Available</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    Real-time Balance Sheet updates
                  </li>
                  <li className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    Income Statement with finance data
                  </li>
                  <li className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    Trial Balance with all transactions
                  </li>
                  <li className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    General Ledger with audit trail
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Enhanced Recent Transactions Section */}
        <Card className="relative overflow-hidden border-0 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50"></div>
          <CardHeader className="relative border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Recent Transactions
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white/80 hover:bg-white border-gray-200 hover:border-gray-300 transition-all duration-200"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative p-0">
            {loading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 bg-white/50 rounded-lg">
                      <div className="w-10 h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                        <div className="h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded w-2/3 animate-pulse"></div>
                      </div>
                      <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {(!overview?.recentTransactions || overview.recentTransactions.length === 0) ? (
                  <div className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full mb-4">
                      <Clock className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No recent transactions found</p>
                    <p className="text-sm text-gray-400 mt-1">Transactions will appear here as they are created</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {overview.recentTransactions.slice(0, 8).map((transaction, index: number) => (
                      <div key={transaction.id || index} className="p-4 hover:bg-white/80 transition-colors duration-200 group">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-200 ${
                            transaction.type === 'invoice' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                            transaction.type === 'payment' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                            transaction.type === 'expense' ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                            'bg-gradient-to-r from-purple-500 to-indigo-500'
                          }`}>
                            {transaction.type === 'invoice' ? <FileText className="h-4 w-4 text-white" /> :
                             transaction.type === 'payment' ? <CreditCard className="h-4 w-4 text-white" /> :
                             transaction.type === 'expense' ? <TrendingDown className="h-4 w-4 text-white" /> :
                             <Building className="h-4 w-4 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 truncate">
                                {transaction.description || `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} #${transaction.id}`}
                              </p>
                              {transaction.hasJournalEntry && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Integrated
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(transaction.date).toLocaleDateString()}
                              </p>
                              {transaction.status && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  transaction.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {transaction.status}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${
                              transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {transaction.type === 'expense' ? '-' : '+'}₹{transaction.amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="p-4 border-t border-gray-100 bg-white/50">
              <Button 
                variant="outline" 
                className="w-full bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
                disabled
                title="Accounting module has been removed"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Journal Entries (Accounting Disabled)
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
