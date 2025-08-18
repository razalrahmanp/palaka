'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle,
  Building,
  CreditCard,
  Package,
  Users,
  Calculator,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  MapPin,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'

interface EnhancedOpeningBalance {
  id?: string
  balance_type: 'VENDOR_OUTSTANDING' | 'BANK_LOAN' | 'PERSONAL_LOAN' | 'GOLD_LOAN' | 
               'INVESTOR_CAPITAL' | 'MONTHLY_RETURNS' | 'GOVERNMENT_DUES' | 'TAX_LIABILITY' |
               'EMPLOYEE_ADVANCE' | 'CUSTOMER_ADVANCE' | 'OTHER_RECEIVABLES' | 'OTHER_PAYABLES'
  entity_id: string
  entity_name: string
  entity_type: string
  amount: number
  financial_year: number
  entry_date: string
  reference_number?: string
  description?: string
  status: 'DRAFT' | 'POSTED'
  debit_account_id?: string
  credit_account_id?: string
  created_by?: string
  posted_by?: string
  posted_at?: string
}

interface EntityOption {
  balance_type: string
  entity_id: string
  entity_name: string
  entity_type: string
}

interface VendorOption {
  id: string
  name: string
  supplier_code: string
  outstanding_amount?: number
}

interface AccountMapping {
  balance_type: string
  default_debit_account: string
  default_credit_account: string
  debit_account_name: string
  credit_account_name: string
}

interface BalanceTypeSummary {
  type: string
  count: number
  draft_total: number
  posted_total: number
  total: number
}

const BALANCE_TYPE_CONFIG = {
  'VENDOR_OUTSTANDING': { 
    label: 'Vendor Outstanding', 
    icon: Building, 
    color: 'bg-blue-500',
    description: 'Amounts owed to suppliers and vendors'
  },
  'BANK_LOAN': { 
    label: 'Bank Loans', 
    icon: CreditCard, 
    color: 'bg-red-500',
    description: 'Outstanding bank loans and credit facilities'
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
    description: 'Investment capital from investors'
  },
  'MONTHLY_RETURNS': { 
    label: 'Monthly Returns', 
    icon: Calendar, 
    color: 'bg-purple-500',
    description: 'Monthly returns payable to investors'
  },
  'GOVERNMENT_DUES': { 
    label: 'Government Dues', 
    icon: MapPin, 
    color: 'bg-gray-500',
    description: 'Taxes and government obligations'
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
    description: 'Advances received from customers'
  },
  'OTHER_RECEIVABLES': { 
    label: 'Other Receivables', 
    icon: TrendingUp, 
    color: 'bg-lime-500',
    description: 'Other amounts receivable'
  },
  'OTHER_PAYABLES': { 
    label: 'Other Payables', 
    icon: TrendingDown, 
    color: 'bg-pink-500',
    description: 'Other amounts payable'
  }
}

interface SummaryData {
  count: number
  draft: number
  posted: number
}

export default function EnhancedOpeningBalanceSetup() {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedBalanceType, setSelectedBalanceType] = useState<string>('')
  const [isTraditionalMode, setIsTraditionalMode] = useState(false)
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [openingBalances, setOpeningBalances] = useState<EnhancedOpeningBalance[]>([])
  const [availableEntities, setAvailableEntities] = useState<EntityOption[]>([])
  const [accountMapping, setAccountMapping] = useState<AccountMapping | null>(null)
  const [balanceTypeSummary, setBalanceTypeSummary] = useState<BalanceTypeSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [entitiesLoading, setEntitiesLoading] = useState(false)
  const [vendorsLoading, setVendorsLoading] = useState(false)
  const [currentYear] = useState(new Date().getFullYear())

  // Fetch vendors for traditional mode
  const fetchVendorsForTraditionalMode = useCallback(async () => {
    setVendorsLoading(true)
    try {
      const response = await fetch('/api/vendors?include_outstanding=true')
      if (response.ok) {
        const result = await response.json()
        setVendors(result.vendors || [])
      } else {
        toast.error('Failed to fetch vendors')
      }
    } catch (error) {
      console.error('Error fetching vendors:', error)
      toast.error('Error fetching vendors')
    } finally {
      setVendorsLoading(false)
    }
  }, [])

  // Fetch balance type summary
  const fetchBalanceTypeSummary = useCallback(async () => {
    try {
      const response = await fetch(`/api/accounting/opening-balances?summary=true&year=${currentYear}`)
      if (response.ok) {
        const result = await response.json()
        const summaryArray = Object.entries(result.summary).map(([type, data]) => {
          const summaryData = data as SummaryData
          return {
            type,
            count: summaryData.count || 0,
            draft_total: summaryData.draft || 0,
            posted_total: summaryData.posted || 0,
            total: (summaryData.draft || 0) + (summaryData.posted || 0)
          }
        })
        setBalanceTypeSummary(summaryArray)
      }
    } catch (error) {
      console.error('Error fetching balance type summary:', error)
    }
  }, [currentYear])

  // Fetch entities for selected balance type
  const fetchEntitiesForBalanceType = useCallback(async (balanceType: string) => {
    if (!balanceType) return
    
    setEntitiesLoading(true)
    try {
      const response = await fetch(`/api/accounting/opening-balances/entities?balance_type=${balanceType}`)
      if (response.ok) {
        const result = await response.json()
        setAvailableEntities(result.entities || [])
      } else {
        toast.error('Failed to fetch entities for balance type')
      }
    } catch (error) {
      console.error('Error fetching entities:', error)
      toast.error('Error fetching entities')
    } finally {
      setEntitiesLoading(false)
    }
  }, [])

  // Fetch account mapping for balance type
  const fetchAccountMapping = useCallback(async (balanceType: string) => {
    if (!balanceType) return
    
    try {
      const response = await fetch(`/api/accounting/opening-balances/account-mapping?balance_type=${balanceType}`)
      if (response.ok) {
        const result = await response.json()
        setAccountMapping(result.mapping)
      }
    } catch (error) {
      console.error('Error fetching account mapping:', error)
    }
  }, [])

  // Fetch existing opening balances
  const fetchOpeningBalances = useCallback(async (balanceType?: string) => {
    setLoading(true)
    try {
      const url = balanceType 
        ? `/api/accounting/opening-balances?balance_type=${balanceType}&year=${currentYear}`
        : `/api/accounting/opening-balances?year=${currentYear}`
      
      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        setOpeningBalances(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching opening balances:', error)
      toast.error('Error fetching opening balances')
    } finally {
      setLoading(false)
    }
  }, [currentYear])

  // Handle balance type selection
  const handleBalanceTypeChange = (balanceType: string) => {
    setSelectedBalanceType(balanceType)
    setAvailableEntities([])
    setAccountMapping(null)
    setIsTraditionalMode(false)
    
    if (balanceType) {
      // For vendor outstanding, enable traditional mode option
      if (balanceType === 'VENDOR_OUTSTANDING') {
        fetchVendorsForTraditionalMode()
      }
      
      fetchEntitiesForBalanceType(balanceType)
      fetchAccountMapping(balanceType)
      fetchOpeningBalances(balanceType)
    }
  }

  // Add new opening balance
  const addOpeningBalance = () => {
    if (!selectedBalanceType) {
      toast.error('Please select a balance type first')
      return
    }

    const newBalance: EnhancedOpeningBalance = {
      id: `new_${Date.now()}`,
      balance_type: selectedBalanceType as EnhancedOpeningBalance['balance_type'],
      entity_id: '',
      entity_name: '',
      entity_type: '',
      amount: 0,
      financial_year: currentYear,
      entry_date: new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      debit_account_id: accountMapping?.default_debit_account || '',
      credit_account_id: accountMapping?.default_credit_account || ''
    }

    setOpeningBalances(prev => [...prev, newBalance])
  }

  // Update opening balance
  const updateOpeningBalance = (id: string, field: keyof EnhancedOpeningBalance, value: string | number) => {
    setOpeningBalances(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value }
          
          // Auto-populate entity details when entity_id changes
          if (field === 'entity_id' && value) {
            const selectedEntity = availableEntities.find(e => e.entity_id === value)
            if (selectedEntity) {
              updated.entity_name = selectedEntity.entity_name
              updated.entity_type = selectedEntity.entity_type
            }
          }
          
          return updated
        }
        return item
      })
    )
  }

  // Remove opening balance
  const removeOpeningBalance = (id: string) => {
    setOpeningBalances(prev => prev.filter(item => item.id !== id))
  }

  // Save opening balances
  const saveOpeningBalances = async () => {
    if (openingBalances.length === 0) {
      toast.error('No opening balances to save')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/accounting/opening-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openingBalances: openingBalances.filter(item => item.entity_id && item.amount > 0)
        })
      })

      if (response.ok) {
        toast.success('Opening balances saved successfully')
        fetchOpeningBalances(selectedBalanceType)
        fetchBalanceTypeSummary()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save opening balances')
      }
    } catch (error) {
      console.error('Error saving opening balances:', error)
      toast.error('Error saving opening balances')
    } finally {
      setLoading(false)
    }
  }

  // Post opening balance (individual)
  const postOpeningBalance = async (id: string) => {
    try {
      const response = await fetch(`/api/accounting/opening-balances/${id}/post`, {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Opening balance posted successfully')
        fetchOpeningBalances(selectedBalanceType)
        fetchBalanceTypeSummary()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to post opening balance')
      }
    } catch (error) {
      console.error('Error posting opening balance:', error)
      toast.error('Error posting opening balance')
    }
  }

  // Calculate totals
  const currentTypeBalances = openingBalances.filter(b => b.balance_type === selectedBalanceType)
  const draftTotal = currentTypeBalances
    .filter(b => b.status === 'DRAFT')
    .reduce((sum, b) => sum + (b.amount || 0), 0)
  const postedTotal = currentTypeBalances
    .filter(b => b.status === 'POSTED')
    .reduce((sum, b) => sum + (b.amount || 0), 0)

  // Initial data load
  useEffect(() => {
    fetchBalanceTypeSummary()
  }, [fetchBalanceTypeSummary])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Opening Balance Setup</h1>
          <p className="text-muted-foreground">
            Setup opening balances for loans, investments, and other business liabilities
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchBalanceTypeSummary} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="setup">Balance Setup</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(BALANCE_TYPE_CONFIG).map(([type, config]) => {
              const summary = balanceTypeSummary.find(s => s.type === type)
              const Icon = config.icon
              
              return (
                <Card key={type} className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        setActiveTab('setup')
                        handleBalanceTypeChange(type)
                      }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                    <div className={`p-2 rounded-full ${config.color} bg-opacity-10`}>
                      <Icon className={`h-4 w-4 ${config.color.replace('bg-', 'text-')}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ₹{(summary?.total || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                      <span>{summary?.count || 0} entries</span>
                      <div className="flex gap-2">
                        <Badge variant="outline">Draft: ₹{(summary?.draft_total || 0).toLocaleString()}</Badge>
                        <Badge variant="default">Posted: ₹{(summary?.posted_total || 0).toLocaleString()}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{config.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Balance Type Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Balance Type</label>
                  <Select value={selectedBalanceType} onValueChange={handleBalanceTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select balance type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BALANCE_TYPE_CONFIG).map(([type, config]) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {accountMapping && (
                  <div>
                    <label className="text-sm font-medium">Account Mapping</label>
                    <div className="text-sm text-muted-foreground">
                      <p>Debit: {accountMapping.debit_account_name}</p>
                      <p>Credit: {accountMapping.credit_account_name}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {selectedBalanceType && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">₹{draftTotal.toLocaleString()}</div>
                    <div className="text-sm text-blue-600">Draft Total</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">₹{postedTotal.toLocaleString()}</div>
                    <div className="text-sm text-green-600">Posted Total</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">₹{(draftTotal + postedTotal).toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Grand Total</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedBalanceType && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {BALANCE_TYPE_CONFIG[selectedBalanceType as keyof typeof BALANCE_TYPE_CONFIG]?.label} Setup
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={addOpeningBalance} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Entry
                    </Button>
                    <Button onClick={saveOpeningBalances} disabled={loading} size="sm">
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Traditional Mode Toggle for Vendor Outstanding */}
                {selectedBalanceType === 'VENDOR_OUTSTANDING' && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-yellow-800">Entry Mode</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${!isTraditionalMode ? 'font-medium' : ''}`}>Enhanced</span>
                        <Button
                          size="sm"
                          variant={isTraditionalMode ? "default" : "outline"}
                          onClick={() => setIsTraditionalMode(!isTraditionalMode)}
                        >
                          {isTraditionalMode ? 'Traditional' : 'Switch to Traditional'}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-yellow-700">
                      {isTraditionalMode 
                        ? 'Traditional Mode: Select vendors and enter amounts manually like the original system'
                        : 'Enhanced Mode: Automated entity selection with improved UI/UX'
                      }
                    </p>
                    
                    {/* Traditional Mode Vendor Selection */}
                    {isTraditionalMode && (
                      <div className="mt-4 p-3 bg-white border rounded">
                        <h5 className="font-medium mb-2">Quick Vendor Selection</h5>
                        {vendorsLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading vendors...
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Select onValueChange={(vendorId) => {
                              const vendor = vendors.find(v => v.id === vendorId)
                              if (vendor) {
                                const newBalance: EnhancedOpeningBalance = {
                                  id: `new_${Date.now()}`,
                                  balance_type: 'VENDOR_OUTSTANDING',
                                  entity_id: vendor.id,
                                  entity_name: vendor.name,
                                  entity_type: 'Supplier',
                                  amount: vendor.outstanding_amount || 0,
                                  financial_year: currentYear,
                                  entry_date: new Date().toISOString().split('T')[0],
                                  status: 'DRAFT',
                                  debit_account_id: accountMapping?.default_debit_account || '',
                                  credit_account_id: accountMapping?.default_credit_account || ''
                                }
                                setOpeningBalances(prev => [...prev, newBalance])
                              }
                            }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select vendor to add..." />
                              </SelectTrigger>
                              <SelectContent>
                                {vendors.map((vendor) => (
                                  <SelectItem key={vendor.id} value={vendor.id}>
                                    <div className="flex justify-between items-center w-full">
                                      <div>
                                        <div className="font-medium">{vendor.name}</div>
                                        <div className="text-xs text-muted-foreground">{vendor.supplier_code}</div>
                                      </div>
                                      {vendor.outstanding_amount && vendor.outstanding_amount > 0 && (
                                        <Badge variant="outline" className="ml-2">
                                          ₹{vendor.outstanding_amount.toLocaleString()}
                                        </Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Showing {vendors.length} vendors. Outstanding amounts will be auto-filled when available.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {currentTypeBalances.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No entries found. Click &ldquo;Add Entry&rdquo; to get started.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Entity</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentTypeBalances.map((balance) => (
                          <TableRow key={balance.id}>
                            <TableCell>
                              {entitiesLoading ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Loading...
                                </div>
                              ) : selectedBalanceType === 'VENDOR_OUTSTANDING' && isTraditionalMode ? (
                                <div>
                                  <div className="font-medium">{balance.entity_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Vendor ID: {balance.entity_id}
                                  </div>
                                </div>
                              ) : (
                                <Select
                                  value={balance.entity_id}
                                  onValueChange={(value) => updateOpeningBalance(balance.id!, 'entity_id', value)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select entity..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableEntities.map((entity) => (
                                      <SelectItem key={entity.entity_id} value={entity.entity_id}>
                                        <div>
                                          <div className="font-medium">{entity.entity_name}</div>
                                          <div className="text-xs text-muted-foreground">{entity.entity_type}</div>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={balance.amount}
                                onChange={(e) => updateOpeningBalance(balance.id!, 'amount', parseFloat(e.target.value) || 0)}
                                className="w-32"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={balance.entry_date}
                                onChange={(e) => updateOpeningBalance(balance.id!, 'entry_date', e.target.value)}
                                className="w-40"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={balance.reference_number || ''}
                                onChange={(e) => updateOpeningBalance(balance.id!, 'reference_number', e.target.value)}
                                placeholder="Reference..."
                                className="w-32"
                              />
                            </TableCell>
                            <TableCell>
                              <Badge variant={balance.status === 'POSTED' ? 'default' : 'secondary'}>
                                {balance.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {balance.status === 'DRAFT' && balance.entity_id && balance.amount > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => postOpeningBalance(balance.id!)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeOpeningBalance(balance.id!)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Opening Balance Summary Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Balance Type</TableHead>
                      <TableHead>Entries</TableHead>
                      <TableHead>Draft Amount</TableHead>
                      <TableHead>Posted Amount</TableHead>
                      <TableHead>Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balanceTypeSummary.map((summary) => {
                      const config = BALANCE_TYPE_CONFIG[summary.type as keyof typeof BALANCE_TYPE_CONFIG]
                      return (
                        <TableRow key={summary.type}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {config?.icon && <config.icon className="h-4 w-4" />}
                              {config?.label || summary.type}
                            </div>
                          </TableCell>
                          <TableCell>{summary.count}</TableCell>
                          <TableCell>₹{summary.draft_total.toLocaleString()}</TableCell>
                          <TableCell>₹{summary.posted_total.toLocaleString()}</TableCell>
                          <TableCell className="font-semibold">₹{summary.total.toLocaleString()}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
