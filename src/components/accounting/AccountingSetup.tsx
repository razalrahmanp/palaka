'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  RefreshCw, 
  TrendingUp, 
  Building, 
  CreditCard, 
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle,
  RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'
import ChartOfAccountsManager from './ChartOfAccountsManager'
import OpeningBalanceSetup from './OpeningBalanceSetup'

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

export default function AccountingSetup() {
  const [summary, setSummary] = useState<AccountingSummary | null>(null)
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchAccountingSummary()
    fetchInventoryStatus()
  }, [])

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
      toast.error('Failed to load accounting summary')
    } finally {
      setLoading(false)
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
      // This is expected if inventory hasn't been synced yet
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
        await fetchAccountingSummary()
        await fetchInventoryStatus()
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

  const initializeDefaultAccounts = async () => {
    try {
      setLoading(true)
      // Create essential accounts for furniture business
      const defaultAccounts = [
        // Assets
        { account_code: '1000', account_name: 'Assets', account_type: 'ASSET', account_subtype: 'CURRENT_ASSET', normal_balance: 'DEBIT', description: 'Main assets account', opening_balance: 0 },
        { account_code: '1010', account_name: 'Cash', account_type: 'ASSET', account_subtype: 'CURRENT_ASSET', normal_balance: 'DEBIT', description: 'Cash on hand', opening_balance: 0 },
        { account_code: '1100', account_name: 'Bank Accounts', account_type: 'ASSET', account_subtype: 'CURRENT_ASSET', normal_balance: 'DEBIT', description: 'Bank account balances', opening_balance: 0 },
        { account_code: '1200', account_name: 'Accounts Receivable', account_type: 'ASSET', account_subtype: 'CURRENT_ASSET', normal_balance: 'DEBIT', description: 'Money owed by customers', opening_balance: 0 },
        { account_code: '1330', account_name: 'Finished Goods', account_type: 'ASSET', account_subtype: 'CURRENT_ASSET', normal_balance: 'DEBIT', description: 'Completed furniture inventory', opening_balance: 0 },
        { account_code: '1500', account_name: 'Equipment', account_type: 'ASSET', account_subtype: 'FIXED_ASSET', normal_balance: 'DEBIT', description: 'Furniture manufacturing equipment', opening_balance: 0 },
        
        // Liabilities
        { account_code: '2000', account_name: 'Liabilities', account_type: 'LIABILITY', account_subtype: 'CURRENT_LIABILITY', normal_balance: 'CREDIT', description: 'Main liabilities account', opening_balance: 0 },
        { account_code: '2100', account_name: 'Accounts Payable', account_type: 'LIABILITY', account_subtype: 'CURRENT_LIABILITY', normal_balance: 'CREDIT', description: 'Money owed to suppliers', opening_balance: 0 },
        { account_code: '2200', account_name: 'Short Term Loans', account_type: 'LIABILITY', account_subtype: 'CURRENT_LIABILITY', normal_balance: 'CREDIT', description: 'Loans due within 1 year', opening_balance: 0 },
        { account_code: '2500', account_name: 'Long Term Loans', account_type: 'LIABILITY', account_subtype: 'LONG_TERM_LIABILITY', normal_balance: 'CREDIT', description: 'Loans due after 1 year', opening_balance: 0 },
        
        // Equity
        { account_code: '3000', account_name: 'Owners Equity', account_type: 'EQUITY', account_subtype: 'CAPITAL', normal_balance: 'CREDIT', description: 'Owner capital investment', opening_balance: 0 },
        { account_code: '3200', account_name: 'Retained Earnings', account_type: 'EQUITY', account_subtype: 'RETAINED_EARNINGS', normal_balance: 'CREDIT', description: 'Accumulated business profits', opening_balance: 0 },
        
        // Revenue
        { account_code: '4000', account_name: 'Sales Revenue', account_type: 'REVENUE', account_subtype: 'SALES_REVENUE', normal_balance: 'CREDIT', description: 'Revenue from furniture sales', opening_balance: 0 },
        { account_code: '4100', account_name: 'Service Revenue', account_type: 'REVENUE', account_subtype: 'SERVICE_REVENUE', normal_balance: 'CREDIT', description: 'Revenue from services', opening_balance: 0 },
        
        // Expenses
        { account_code: '5000', account_name: 'Cost of Goods Sold', account_type: 'EXPENSE', account_subtype: 'COST_OF_GOODS_SOLD', normal_balance: 'DEBIT', description: 'Direct costs of furniture production', opening_balance: 0 },
        { account_code: '5100', account_name: 'Materials Cost', account_type: 'EXPENSE', account_subtype: 'COST_OF_GOODS_SOLD', normal_balance: 'DEBIT', description: 'Raw materials for furniture', opening_balance: 0 },
        { account_code: '5200', account_name: 'Labor Cost', account_type: 'EXPENSE', account_subtype: 'COST_OF_GOODS_SOLD', normal_balance: 'DEBIT', description: 'Direct labor costs', opening_balance: 0 },
        { account_code: '6000', account_name: 'Operating Expenses', account_type: 'EXPENSE', account_subtype: 'OPERATING_EXPENSE', normal_balance: 'DEBIT', description: 'General business expenses', opening_balance: 0 },
        { account_code: '6100', account_name: 'Rent Expense', account_type: 'EXPENSE', account_subtype: 'OPERATING_EXPENSE', normal_balance: 'DEBIT', description: 'Rent for business premises', opening_balance: 0 },
        { account_code: '6200', account_name: 'Utilities Expense', account_type: 'EXPENSE', account_subtype: 'OPERATING_EXPENSE', normal_balance: 'DEBIT', description: 'Electricity, water, gas', opening_balance: 0 }
      ]

      for (const account of defaultAccounts) {
        try {
          await fetch('/api/accounting/chart-of-accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(account)
          })
        } catch {
          // Account might already exist, continue
          console.log(`Account ${account.account_code} might already exist`)
        }
      }

      toast.success('Default chart of accounts initialized')
      await fetchAccountingSummary()
    } catch (error) {
      console.error('Error initializing accounts:', error)
      toast.error('Failed to initialize default accounts')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number | null | undefined) => {
    const numericAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numericAmount)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Accounting Setup & Management</h1>
          <p className="text-gray-600 mt-1">Configure and manage your accounting system</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchAccountingSummary}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={initializeDefaultAccounts}
            disabled={loading}
          >
            Initialize Default Accounts
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="opening">Opening Balances</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Assets</CardTitle>
                  <Building className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary?.totalAssets)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Liabilities</CardTitle>
                  <CreditCard className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary?.totalLiabilities)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Equity</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summary?.totalEquity)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">Inventory Value</CardTitle>
                  <Package className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(summary?.inventoryValue)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Balance Sheet Health */}
          <Card>
            <CardHeader>
              <CardTitle>Accounting System Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {summary?.isBalanced ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">
                  Balance Sheet: {summary?.isBalanced ? 'Balanced' : 'Not Balanced'}
                </span>
                <Badge variant={summary?.isBalanced ? 'default' : 'destructive'}>
                  {summary?.isBalanced ? 'Healthy' : 'Needs Attention'}
                </Badge>
              </div>

              {!summary?.isBalanced && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="text-sm text-red-700">
                      Your balance sheet is not balanced. Assets should equal Liabilities + Equity. 
                      Please review your account entries and ensure all transactions are properly recorded.
                    </div>
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-600">
                Last updated: {summary?.lastUpdated || 'Never'}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => setActiveTab('accounts')}
                  variant="outline"
                  className="h-20 flex flex-col gap-2"
                >
                  <Building className="h-6 w-6" />
                  <span>Manage Accounts</span>
                </Button>
                
                <Button 
                  onClick={() => setActiveTab('inventory')}
                  variant="outline"
                  className="h-20 flex flex-col gap-2"
                >
                  <Package className="h-6 w-6" />
                  <span>Sync Inventory</span>
                </Button>
                
                <Button 
                  onClick={() => window.open('/erp/analytics', '_blank')}
                  variant="outline"
                  className="h-20 flex flex-col gap-2"
                >
                  <TrendingUp className="h-6 w-6" />
                  <span>View Reports</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <ChartOfAccountsManager />
        </TabsContent>

        <TabsContent value="opening">
          <OpeningBalanceSetup />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Integration</CardTitle>
              <p className="text-sm text-gray-600">
                Synchronize your inventory values with accounting records
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {inventoryStatus && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Calculated Value</label>
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(inventoryStatus.calculatedValue)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Based on current stock × unit prices
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Recorded Value</label>
                    <div className="text-lg font-semibold text-blue-600">
                      {formatCurrency(inventoryStatus.recordedValue)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Current accounting balance
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Variance</label>
                    <div className={`text-lg font-semibold ${inventoryStatus.variance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(inventoryStatus.variance)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Difference to reconcile
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="space-y-1">
                  <div className="font-medium">Inventory Synchronization</div>
                  <div className="text-sm text-gray-600">
                    Last synced: {inventoryStatus?.lastSynced || 'Never'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Items tracked: {inventoryStatus?.itemCount || 0}
                  </div>
                </div>
                
                <Button 
                  onClick={syncInventory}
                  disabled={syncing}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </div>

              {inventoryStatus?.variance !== 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-700">
                      There is a variance between your calculated and recorded inventory values. 
                      Click &quot;Sync Now&quot; to update the accounting records with current inventory values.
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
