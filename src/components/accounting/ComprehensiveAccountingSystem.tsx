'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Info,
  ChevronRight,
  Zap,
  DollarSign,
  Calendar,
  Hash
} from 'lucide-react'
import { toast } from 'sonner'
import { subcategoryMap } from '@/types'
import ChartOfAccountsManager from './ChartOfAccountsManager'
import OpeningBalanceSetup from './OpeningBalanceSetup'
import OpeningBalanceManager from './OpeningBalanceManager'
import SimplifiedJournalEntry from './SimplifiedJournalEntry'
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
  const [quickEntryType, setQuickEntryType] = useState<'payable' | 'receivable' | 'expense' | 'manual' | null>(null)
  const [suppliers, setSuppliers] = useState<Array<{id: string; name: string}>>([])
  const [customers, setCustomers] = useState<Array<{id: string; name: string}>>([])
  const [bankAccounts, setBankAccounts] = useState<Array<{id: string; name: string}>>([])
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    entityId: '',
    paymentMethod: 'bank_transfer',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    subcategory: '',
    bankAccountId: ''
  })

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
    fetchSuppliers()
    fetchCustomers()
    fetchBankAccounts()
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

  // Fetch suppliers and customers for quick entries
  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers')
      if (response.ok) {
        const result = await response.json()
        setSuppliers(result.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })))
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/crm/customers')
      if (response.ok) {
        const result = await response.json()
        setCustomers(result.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchBankAccounts = async () => {
    try {
      const response = await fetch('/api/finance/bank_accounts')
      if (response.ok) {
        const result = await response.json()
        setBankAccounts(result.data?.map((b: { id: string; name: string }) => ({ id: b.id, name: b.name })) || [])
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
    }
  }

  // Load data for quick entries
  useEffect(() => {
    if (quickEntryType) {
      fetchSuppliers()
      fetchCustomers()
      fetchBankAccounts()
    }
  }, [quickEntryType])

  // Create journal entry for quick entries
  const createQuickJournalEntry = async (entryData: {
    description: string
    reference: string
    entry_date: string
    source_document_type: string
    lines: Array<{
      account_code: string
      description: string
      debit_amount: number
      credit_amount: number
    }>
  }) => {
    try {
      const response = await fetch('/api/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryData)
      })
      
      if (response.ok) {
        const result = await response.json()
        toast.success('Transaction recorded successfully!')
        setQuickEntryType(null)
        setFormData({
          amount: '',
          description: '',
          entityId: '',
          paymentMethod: 'bank_transfer',
          reference: '',
          date: new Date().toISOString().split('T')[0],
          subcategory: '',
          bankAccountId: ''
        })
        fetchAllData()
        return result
      } else {
        throw new Error('Failed to create journal entry')
      }
    } catch (error) {
      console.error('Error creating journal entry:', error)
      toast.error('Failed to record transaction')
    }
  }

  // Handle form submission
  const handleQuickEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.amount || !formData.description) {
      toast.error('Please fill in all required fields')
      return
    }

    let journalEntryData
    const amount = parseFloat(formData.amount)

    switch (quickEntryType) {
      case 'payable':
        // Vendor Payment: Dr. Accounts Payable, Cr. Bank
        journalEntryData = {
          description: `Vendor Payment - ${formData.description}`,
          reference: formData.reference,
          entry_date: formData.date,
          source_document_type: 'VENDOR_PAYMENT',
          lines: [
            {
              account_code: '2001', // Accounts Payable
              description: formData.description,
              debit_amount: amount,
              credit_amount: 0
            },
            {
              account_code: '1002', // Bank Account
              description: `Payment via ${formData.paymentMethod}`,
              debit_amount: 0,
              credit_amount: amount
            }
          ]
        }
        break

      case 'receivable':
        // Customer Payment: Dr. Bank, Cr. Accounts Receivable
        journalEntryData = {
          description: `Customer Payment - ${formData.description}`,
          reference: formData.reference,
          entry_date: formData.date,
          source_document_type: 'CUSTOMER_PAYMENT',
          lines: [
            {
              account_code: '1002', // Bank Account
              description: `Received via ${formData.paymentMethod}`,
              debit_amount: amount,
              credit_amount: 0
            },
            {
              account_code: '1200', // Accounts Receivable
              description: formData.description,
              debit_amount: 0,
              credit_amount: amount
            }
          ]
        }
        break

      case 'expense':
        // Business Expense: Dr. Expense Account, Cr. Bank
        journalEntryData = {
          description: `Business Expense - ${formData.description}`,
          reference: formData.reference,
          entry_date: formData.date,
          source_document_type: 'EXPENSE',
          lines: [
            {
              account_code: '5000', // General Expenses
              description: formData.description,
              debit_amount: amount,
              credit_amount: 0
            },
            {
              account_code: '1002', // Bank Account
              description: `Payment via ${formData.paymentMethod}`,
              debit_amount: 0,
              credit_amount: amount
            }
          ]
        }
        break

      default:
        return
    }

    await createQuickJournalEntry(journalEntryData)
  }

  // Render quick entry forms with enhanced finance-style UI
  const renderQuickEntryForm = () => {
    if (!quickEntryType || quickEntryType === 'manual') {
      return (
        <div className="p-8 text-center text-gray-500">
          <p className="text-lg mb-4">Select a quick entry type above to get started</p>
          <p className="text-sm">Choose from vendor payments, customer receipts, expenses, or manual entries</p>
        </div>
      )
    }

    return (
      <form onSubmit={handleQuickEntrySubmit} className="space-y-6 p-6">
        {/* Amount and Date Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Amount *
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Enter amount"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date *
            </Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Entity Selection (Supplier/Customer) */}
        {(quickEntryType === 'payable' || quickEntryType === 'receivable') && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              {quickEntryType === 'payable' ? 'Supplier *' : 'Customer *'}
            </Label>
            <Select 
              value={formData.entityId} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, entityId: value }))}
              required
            >
              <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder={`Select ${quickEntryType === 'payable' ? 'supplier' : 'customer'}`} />
              </SelectTrigger>
              <SelectContent>
                {(quickEntryType === 'payable' ? suppliers : customers).map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Expense Category (for expense type) */}
        {quickEntryType === 'expense' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Expense Category *</Label>
            <Select
              value={formData.subcategory}
              onValueChange={(value) => setFormData(prev => ({ ...prev, subcategory: value }))}
              required
            >
              <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Select expense category" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(subcategoryMap).map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Payment Method and Bank Account */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Payment Method *</Label>
            <Select 
              value={formData.paymentMethod} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
            >
              <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">Bank Transfer</span>
                  </div>
                </SelectItem>
                <SelectItem value="cash">
                  <div className="flex items-center gap-2">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Cash</span>
                  </div>
                </SelectItem>
                <SelectItem value="cheque">
                  <div className="flex items-center gap-2">
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">Cheque</span>
                  </div>
                </SelectItem>
                <SelectItem value="upi">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs">UPI</span>
                  </div>
                </SelectItem>
                <SelectItem value="credit_card">
                  <div className="flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">Credit Card</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.paymentMethod === 'bank_transfer' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Bank Account</Label>
              <Select 
                value={formData.bankAccountId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, bankAccountId: value }))}
              >
                <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Description and Reference */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description *
            </Label>
            <Input
              placeholder={
                quickEntryType === 'payable' ? 'Payment to supplier for...' :
                quickEntryType === 'receivable' ? 'Payment received from customer for...' :
                'Expense description'
              }
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Reference Number
            </Label>
            <Input
              placeholder="Transaction reference"
              value={formData.reference}
              onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
          <Button 
            type="submit" 
            className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white border-0"
          >
            {quickEntryType === 'payable' && 'Record Payment'}
            {quickEntryType === 'receivable' && 'Record Receipt'}
            {quickEntryType === 'expense' && 'Record Expense'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={() => setQuickEntryType(null)}
          >
            Cancel
          </Button>
        </div>
      </form>
    )
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
          <TabsTrigger value="enhanced-balances" className="flex flex-col items-center gap-1 py-3 rounded-md">
            <Zap className="h-5 w-5" />
            <span className="text-xs font-medium">Enhanced OB</span>
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
                  onClick={() => setActiveTab('enhanced-balances')}>
              <CardContent className="p-6 text-center">
                <div className="bg-amber-100 p-3 rounded-full w-fit mx-auto mb-4">
                  <Zap className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="font-semibold text-amber-800 mb-2">Enhanced Setup</h3>
                <p className="text-sm text-amber-600">Configure opening balances with enhanced automation</p>
                <ChevronRight className="h-4 w-4 text-amber-500 mx-auto mt-3" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Enhanced Opening Balances Tab */}
        <TabsContent value="enhanced-balances" className="space-y-6">
          {/* Quick Setup Guide */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-purple-800 mb-2">Enhanced Opening Balance System</h3>
                  <p className="text-purple-700 mb-4">
                    Complete your accounting setup with our enhanced opening balance system. 
                    Set up all business entities including loans, investors, vendor outstanding, and more.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                      <div className="bg-green-100 p-2 rounded-full">
                        <Target className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-green-800">1. Opening Balances</div>
                        <div className="text-xs text-green-600">Set starting amounts</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-blue-800">2. Sync Inventory</div>
                        <div className="text-xs text-blue-600">Connect inventory</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                      <div className="bg-orange-100 p-2 rounded-full">
                        <Calculator className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <div className="font-medium text-orange-800">3. Chart Setup</div>
                        <div className="text-xs text-orange-600">Configure accounts</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('inventory')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-full">
                    <Package className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold">Sync Inventory</div>
                    <div className="text-sm text-gray-600">Connect inventory data</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('advanced')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Calculator className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold">Chart of Accounts</div>
                    <div className="text-sm text-gray-600">Setup account structure</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('transactions')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <BookOpen className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold">Start Transactions</div>
                    <div className="text-sm text-gray-600">Record journal entries</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                </div>
              </CardContent>
            </Card>
          </div>

          <OpeningBalanceManager />
        </TabsContent>

        {/* Transactions Tab - Daily Operations */}
        <TabsContent value="transactions" className="space-y-6">
          {/* Quick Entry Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setQuickEntryType('payable')}>
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-sm">Pay Vendor</h3>
                <p className="text-xs text-gray-600">Record vendor payment</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setQuickEntryType('receivable')}>
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="font-semibold text-sm">Receive Payment</h3>
                <p className="text-xs text-gray-600">Record customer payment</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setQuickEntryType('expense')}>
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="font-semibold text-sm">Record Expense</h3>
                <p className="text-xs text-gray-600">Add business expense</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setQuickEntryType('manual')}>
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-sm">Manual Entry</h3>
                <p className="text-xs text-gray-600">Custom journal entry</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Transaction Entry Form */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  {quickEntryType === 'payable' && 'Vendor Payment Entry'}
                  {quickEntryType === 'receivable' && 'Customer Payment Entry'}
                  {quickEntryType === 'expense' && 'Expense Entry'}
                  {quickEntryType === 'manual' && 'Manual Journal Entry'}
                  {!quickEntryType && 'Transaction Entry'}
                </span>
                {quickEntryType && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setQuickEntryType(null)}
                  >
                    Clear
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                {quickEntryType === 'payable' && 'Record payment to vendors and suppliers with automatic journal entries'}
                {quickEntryType === 'receivable' && 'Record payment received from customers with automatic journal entries'}
                {quickEntryType === 'expense' && 'Record business expenses and costs with automatic journal entries'}
                {quickEntryType === 'manual' && 'Create custom journal entries with manual account mapping'}
                {!quickEntryType && 'Choose a quick entry type above or create manual journal entries'}
              </CardDescription>
            </CardHeader>
            {quickEntryType === 'manual' ? (
              <div className="w-full">
                <SimplifiedJournalEntry 
                  onSave={() => {
                    fetchAllData()
                    toast.success('Transaction recorded successfully!')
                  }} 
                />
              </div>
            ) : (
              <CardContent className="space-y-6">
                {renderQuickEntryForm()}
              </CardContent>
            )}
          </Card>
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
