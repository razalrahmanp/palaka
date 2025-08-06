'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  RefreshCw, 
  Building, 
  CreditCard, 
  Package,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  FileText,
  Calculator,
  Users,
  BookOpen,
  PieChart,
  Target,
  TrendingUp,
  ArrowRight,
  Play,
  Settings,
  Info,
  ChevronRight,
  Zap,
  DollarSign
} from 'lucide-react'
import { toast } from 'sonner'
import ChartOfAccountsManager from './ChartOfAccountsManager'
import OpeningBalanceSetup from './OpeningBalanceSetup'
import SimplifiedJournalEntry from './SimplifiedJournalEntry'
import JournalEntryList from './JournalEntryList'
import FinancialReports from './FinancialReports'
import AdvancedSupplierManagement from './AdvancedSupplierManagement'

interface AccountingSummary {
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  inventoryValue: number
  isBalanced: boolean
  lastUpdated: string
}

interface InventoryStatus {
  calculatedValue: number
  recordedValue: number
  variance: number
  itemCount: number
  lastSynced: string
}

interface BalanceSheetHealth {
  isBalanced: boolean
  assetsTotal: number
  liabilitiesEquityTotal: number
  variance: number
  issues: string[]
  recommendations: string[]
}

export default function ComprehensiveAccountingSystem() {
  const [summary, setSummary] = useState<AccountingSummary | null>(null)
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus | null>(null)
  const [balanceSheetHealth, setBalanceSheetHealth] = useState<BalanceSheetHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [setupProgress, setSetupProgress] = useState(0)

  // Calculate setup completion
  useEffect(() => {
    if (summary && inventoryStatus && balanceSheetHealth) {
      let progress = 0
      if (summary.totalAssets > 0) progress += 25
      if (summary.totalEquity > 0) progress += 25
      if (inventoryStatus.recordedValue > 0) progress += 25
      if (balanceSheetHealth.isBalanced) progress += 25
      setSetupProgress(progress)
    }
  }, [summary, inventoryStatus, balanceSheetHealth])

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchAccountingSummary(),
      fetchInventoryStatus(),
      fetchBalanceSheetHealth()
    ])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  const fetchAccountingSummary = async () => {
    try {
      const response = await fetch('/api/accounting/reports/balance-sheet')
      const result = await response.json()
      
      if (result.success && result.data) {
        setSummary({
          totalAssets: result.data.assets?.total || 0,
          totalLiabilities: result.data.liabilities?.total || 0,
          totalEquity: result.data.equity?.total || 0,
          inventoryValue: result.data.assets?.currentAssets?.accounts?.find(
            (acc: { account_code: string }) => acc.account_code === '1330'
          )?.current_balance || 0,
          isBalanced: result.data.totals?.isBalanced || false,
          lastUpdated: new Date().toLocaleString()
        })
      }
    } catch (error) {
      console.error('Error fetching accounting summary:', error)
    }
  }

  const fetchInventoryStatus = async () => {
    try {
      const response = await fetch('/api/accounting/inventory-sync')
      const result = await response.json()
      
      if (result.success && result.data) {
        setInventoryStatus({
          calculatedValue: result.data.calculatedValue || 0,
          recordedValue: result.data.recordedValue || 0,
          variance: result.data.variance || 0,
          itemCount: result.data.inventoryBreakdown?.length || 0,
          lastSynced: result.data.lastUpdated ? new Date(result.data.lastUpdated).toLocaleString() : 'Never'
        })
      }
    } catch (error) {
      console.error('Error fetching inventory status:', error)
    }
  }

  const fetchBalanceSheetHealth = async () => {
    try {
      const response = await fetch('/api/accounting/reports/balance-sheet')
      const result = await response.json()
      
      if (result.success && result.data) {
        const assets = result.data.assets?.total || 0
        const liabilities = result.data.liabilities?.total || 0
        const equity = result.data.equity?.total || 0
        const liabilitiesEquity = liabilities + equity
        const variance = Math.abs(assets - liabilitiesEquity)
        const isBalanced = variance < 1 // Allow for small rounding differences
        
        const issues: string[] = []
        const recommendations: string[] = []
        
        if (!isBalanced) {
          issues.push(`Balance sheet is out of balance by ₹${variance.toLocaleString()}`)
          if (assets > liabilitiesEquity) {
            issues.push('Assets exceed Liabilities + Equity')
            recommendations.push('Check for missing liability entries or unreported capital')
          } else {
            issues.push('Liabilities + Equity exceed Assets')
            recommendations.push('Verify asset valuations and check for duplicate entries')
          }
        }
        
        if (equity < 0) {
          issues.push('Negative equity detected')
          recommendations.push('Review retained earnings and owner\'s capital accounts')
        }
        
        setBalanceSheetHealth({
          isBalanced,
          assetsTotal: assets,
          liabilitiesEquityTotal: liabilitiesEquity,
          variance,
          issues,
          recommendations
        })
      }
    } catch (error) {
      console.error('Error fetching balance sheet health:', error)
    }
  }

  const syncInventory = async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/accounting/inventory-sync', {
        method: 'POST'
      })
      const result = await response.json()
      
      if (result.success) {
        toast.success('Inventory synced with accounting successfully')
        await fetchAllData()
      } else {
        toast.error(result.error || 'Failed to sync inventory')
      }
    } catch (error) {
      console.error('Error syncing inventory:', error)
      toast.error('Error syncing inventory')
    } finally {
      setSyncing(false)
    }
  }

  const autoBalanceSheet = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/accounting/auto-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success(`Balance sheet auto-balanced! ${result.data.balancing_type}: ₹${Math.abs(result.data.variance_corrected).toLocaleString()}`)
        await fetchAllData() // Refresh all data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error auto-balancing:', error)
      toast.error('Failed to auto-balance balance sheet')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '₹0'
    return `₹${amount.toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Loading accounting data...</span>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4">
      <div className="space-y-6 w-full max-w-none">
        {/* Welcome Header with Progress */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Financial Dashboard</h1>
              <p className="text-blue-100 text-lg">Complete overview of your business finances</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-100 mb-1">Setup Progress</div>
              <div className="flex items-center gap-3">
                <Progress value={setupProgress} className="w-32 h-2" />
                <span className="text-2xl font-bold">{setupProgress}%</span>
              </div>
            </div>
          </div>
        </div>

      {/* Quick Action Bar */}
      <div className="flex items-center justify-between bg-white rounded-lg border p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Button onClick={fetchAllData} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button onClick={syncInventory} disabled={syncing} variant="outline" size="sm">
            <Zap className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync Inventory
          </Button>
        </div>
        
        {balanceSheetHealth && !balanceSheetHealth.isBalanced && (
          <Button
            onClick={autoBalanceSheet}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Auto-Balance Books
          </Button>
        )}
      </div>

      {/* Balance Sheet Health Alert */}
      {balanceSheetHealth && !balanceSheetHealth.isBalanced && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-full">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-amber-800 mb-1">Action Required: Balance Sheet Needs Attention</div>
                <div className="text-sm text-amber-700">
                  Your books are out of balance by {formatCurrency(Math.abs(balanceSheetHealth.variance))}. 
                  This needs to be corrected for accurate financial reporting.
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 h-auto p-1 bg-white border rounded-lg shadow-sm">
          <TabsTrigger value="dashboard" className="flex flex-col items-center gap-1 py-3 rounded-md">
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs font-medium">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="setup" className="flex flex-col items-center gap-1 py-3 rounded-md">
            <Settings className="h-5 w-5" />
            <span className="text-xs font-medium">Setup</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex flex-col items-center gap-1 py-3 rounded-md">
            <BookOpen className="h-5 w-5" />
            <span className="text-xs font-medium">Transactions</span>
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex flex-col items-center gap-1 py-3 rounded-md">
            <Users className="h-5 w-5" />
            <span className="text-xs font-medium">Suppliers</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex flex-col items-center gap-1 py-3 rounded-md">
            <Package className="h-5 w-5" />
            <span className="text-xs font-medium">Inventory</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex flex-col items-center gap-1 py-3 rounded-md">
            <FileText className="h-5 w-5" />
            <span className="text-xs font-medium">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex flex-col items-center gap-1 py-3 rounded-md">
            <Calculator className="h-5 w-5" />
            <span className="text-xs font-medium">Advanced</span>
          </TabsTrigger>
        </TabsList>
        {/* Dashboard Tab - Financial Overview */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Financial Health Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Building className="h-6 w-6 text-green-600" />
                  </div>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-800 mb-1">
                    {formatCurrency(summary?.totalAssets)}
                  </div>
                  <div className="text-green-600 font-medium">Total Assets</div>
                  <div className="text-xs text-green-500 mt-1">Current + Fixed Assets</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-rose-100 border-red-200 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-red-100 p-3 rounded-full">
                    <CreditCard className="h-6 w-6 text-red-600" />
                  </div>
                  <DollarSign className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-800 mb-1">
                    {formatCurrency(summary?.totalLiabilities)}
                  </div>
                  <div className="text-red-600 font-medium">Total Liabilities</div>
                  <div className="text-xs text-red-500 mt-1">Payables + Loans</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-sky-100 border-blue-200 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <PieChart className="h-6 w-6 text-blue-600" />
                  </div>
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-800 mb-1">
                    {formatCurrency(summary?.totalEquity)}
                  </div>
                  <div className="text-blue-600 font-medium">Owner&apos;s Equity</div>
                  <div className="text-xs text-blue-500 mt-1">Capital + Retained Earnings</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <Package className="h-6 w-6 text-purple-600" />
                  </div>
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-800 mb-1">
                    {formatCurrency(summary?.inventoryValue)}
                  </div>
                  <div className="text-purple-600 font-medium">Inventory Value</div>
                  <div className="text-xs text-purple-500 mt-1">Finished Goods Stock</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Balance Sheet Health */}
          {balanceSheetHealth && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {balanceSheetHealth.isBalanced ? (
                    <div className="bg-green-100 p-2 rounded-full">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="bg-amber-100 p-2 rounded-full">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                  )}
                  <div>
                    <div className="text-lg">Balance Sheet Status</div>
                    <div className="text-sm text-gray-500 font-normal">
                      {balanceSheetHealth.isBalanced ? 'Your books are balanced' : 'Requires attention'}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {formatCurrency(balanceSheetHealth.assetsTotal)}
                    </div>
                    <div className="text-gray-600 font-medium">Total Assets</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {formatCurrency(balanceSheetHealth.liabilitiesEquityTotal)}
                    </div>
                    <div className="text-gray-600 font-medium">Liabilities + Equity</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-3xl font-bold mb-2 ${balanceSheetHealth.isBalanced ? 'text-green-600' : 'text-amber-600'}`}>
                      {formatCurrency(Math.abs(balanceSheetHealth.variance))}
                    </div>
                    <div className="text-gray-600 font-medium">Variance</div>
                    <Badge className={`mt-2 ${balanceSheetHealth.isBalanced ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {balanceSheetHealth.isBalanced ? 'Perfect Balance' : 'Needs Balancing'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-blue-50 to-blue-100" 
                  onClick={() => setActiveTab('transactions')}>
              <CardContent className="p-6 text-center">
                <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto mb-4">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-blue-800 mb-2">Record Transactions</h3>
                <p className="text-sm text-blue-600">Create journal entries and manage daily transactions</p>
                <ChevronRight className="h-4 w-4 text-blue-500 mx-auto mt-3" />
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-purple-50 to-purple-100" 
                  onClick={() => setActiveTab('suppliers')}>
              <CardContent className="p-6 text-center">
                <div className="bg-purple-100 p-3 rounded-full w-fit mx-auto mb-4">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-purple-800 mb-2">Supplier Payments</h3>
                <p className="text-sm text-purple-600">Track and manage outstanding supplier balances</p>
                <ChevronRight className="h-4 w-4 text-purple-500 mx-auto mt-3" />
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-green-50 to-green-100" 
                  onClick={() => setActiveTab('reports')}>
              <CardContent className="p-6 text-center">
                <div className="bg-green-100 p-3 rounded-full w-fit mx-auto mb-4">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-green-800 mb-2">Financial Reports</h3>
                <p className="text-sm text-green-600">Generate P&L, balance sheet, and cash flow reports</p>
                <ChevronRight className="h-4 w-4 text-green-500 mx-auto mt-3" />
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-amber-50 to-amber-100" 
                  onClick={() => setActiveTab('setup')}>
              <CardContent className="p-6 text-center">
                <div className="bg-amber-100 p-3 rounded-full w-fit mx-auto mb-4">
                  <Settings className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="font-semibold text-amber-800 mb-2">Initial Setup</h3>
                <p className="text-sm text-amber-600">Configure opening balances and chart of accounts</p>
                <ChevronRight className="h-4 w-4 text-amber-500 mx-auto mt-3" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Setup Tab - Getting Started Wizard */}
        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Settings className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div>Initial Accounting Setup</div>
                  <div className="text-sm text-gray-500 font-normal">Complete these steps to get started</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <Target className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">1. Set Opening Balances</div>
                      <div className="text-sm text-gray-600">Configure your starting financial position</div>
                    </div>
                  </div>
                  <Button onClick={() => setActiveTab('opening')} size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-full">
                      <Package className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium">2. Sync Inventory</div>
                      <div className="text-sm text-gray-600">Connect your inventory with accounting</div>
                    </div>
                  </div>
                  <Button onClick={() => setActiveTab('inventory')} size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Calculator className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">3. Chart of Accounts</div>
                      <div className="text-sm text-gray-600">Customize your account structure</div>
                    </div>
                  </div>
                  <Button onClick={() => setActiveTab('advanced')} size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Setup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab - Daily Operations */}
        <TabsContent value="transactions" className="space-y-6">
          {/* Quick Help Guide */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Info className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-800 mb-2">Quick Guide: Recording Transactions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
                    <div>
                      <div className="font-medium mb-1">💰 Salary Payment</div>
                      <div>Debit: Salary Expense → Credit: Bank Account</div>
                    </div>
                    <div>
                      <div className="font-medium mb-1">🏭 Supplier Payment</div>
                      <div>Debit: Accounts Payable → Credit: Bank Account</div>
                    </div>
                    <div>
                      <div className="font-medium mb-1">📋 Business Expense</div>
                      <div>Debit: Expense Account → Credit: Bank Account</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    Quick Transaction Entry
                  </CardTitle>
                  <p className="text-sm text-gray-600">Record transactions with automated double-entry bookkeeping</p>
                </CardHeader>
                <CardContent className="p-0">
                  <SimplifiedJournalEntry 
                    onSave={() => {
                      fetchAllData()
                      toast.success('Transaction recorded successfully!')
                    }} 
                  />
                </CardContent>
              </Card>
            </div>
            
            <div className="xl:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    Recent Transactions
                  </CardTitle>
                  <p className="text-sm text-gray-600">Your latest journal entries</p>
                </CardHeader>
                <CardContent>
                  <JournalEntryList />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Opening Balances Tab */}
        <TabsContent value="opening">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Opening Balance Configuration
              </CardTitle>
              <p className="text-sm text-gray-600">Set up your starting financial position and inventory values</p>
            </CardHeader>
            <CardContent className="p-0">
              <OpeningBalanceSetup />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supplier Outstanding Tab */}
        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Supplier Payment Management
              </CardTitle>
              <p className="text-sm text-gray-600">Track and manage outstanding supplier balances and payments</p>
            </CardHeader>
            <CardContent className="p-0">
              <AdvancedSupplierManagement />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Sync Tab */}
        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600" />
                Inventory Integration
              </CardTitle>
              <p className="text-sm text-gray-600">
                Synchronize your inventory values with accounting records for accurate asset reporting
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {inventoryStatus && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      {formatCurrency(inventoryStatus.calculatedValue)}
                    </div>
                    <div className="font-medium text-green-700">Current Stock Value</div>
                    <div className="text-xs text-green-600 mt-1">
                      Based on latest inventory × cost prices
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      {formatCurrency(inventoryStatus.recordedValue)}
                    </div>
                    <div className="font-medium text-blue-700">Recorded in Books</div>
                    <div className="text-xs text-blue-600 mt-1">
                      Current accounting balance
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg text-center ${inventoryStatus.variance === 0 ? 'bg-green-50' : 'bg-amber-50'}`}>
                    <div className={`text-2xl font-bold mb-2 ${inventoryStatus.variance === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                      {formatCurrency(Math.abs(inventoryStatus.variance))}
                    </div>
                    <div className={`font-medium ${inventoryStatus.variance === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                      {inventoryStatus.variance === 0 ? 'Perfect Match' : 'Variance'}
                    </div>
                    <div className={`text-xs mt-1 ${inventoryStatus.variance === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                      {inventoryStatus.variance === 0 ? 'No adjustment needed' : 'Requires sync'}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-6 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <div className="font-medium text-gray-900">Inventory Synchronization</div>
                  <div className="text-sm text-gray-600">
                    Last synced: {inventoryStatus?.lastSynced || 'Never'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Items tracked: {inventoryStatus?.itemCount || 0} products
                  </div>
                </div>
                
                <Button 
                  onClick={syncInventory}
                  disabled={syncing}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  size="lg"
                >
                  <Zap className={`h-5 w-5 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </div>

              {inventoryStatus?.variance !== 0 && (
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-amber-100 p-2 rounded-full">
                        <Info className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="text-amber-800">
                        <div className="font-medium mb-1">Sync Required</div>
                        <div className="text-sm">
                          There&apos;s a difference between your physical inventory value and accounting records. 
                          Click &quot;Sync Now&quot; to update your books with the current inventory values.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Financial Reports & Analytics
              </CardTitle>
              <p className="text-sm text-gray-600">Generate comprehensive financial reports and insights</p>
            </CardHeader>
            <CardContent className="p-0">
              <FinancialReports />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                Chart of Accounts Management
              </CardTitle>
              <p className="text-sm text-gray-600">Advanced accounting setup and account structure management</p>
            </CardHeader>
            <CardContent className="p-0">
              <ChartOfAccountsManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
