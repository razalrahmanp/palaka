'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  CheckCircle,
  Building,
  CreditCard,
  Package,
  Users,
  Calculator,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface OpeningBalanceItem {
  id: string
  account_code: string
  account_name: string
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  amount: number
  description: string
}

interface SupplierOutstanding {
  id: string
  supplier_name: string
  supplier_id: string
  amount_owed: number
  purchase_date: string
  due_date: string
  description: string
}

interface InventoryItem {
  id: string
  product_name: string
  quantity: number
  unit_cost: number // Actual cost price for asset calculation
  unit_mrp?: number // MRP for reference
  total_value: number // Total cost value (for assets)
  total_mrp?: number // Total MRP value (for reference)
  category: 'RAW_MATERIAL' | 'FINISHED_GOODS' | 'WORK_IN_PROGRESS'
  sku?: string
  supplier_id?: string
}

interface SupplierSummary {
  supplier: {
    id: string
    name: string
    contact?: string
    email?: string
    address?: string
  }
  remaining_amount: number
}

interface InventoryBreakdownItem {
  product_id: string
  product_name: string
  sku: string
  quantity: number
  unit_price: number // This is typically MRP
  cost_price?: number // This is the actual cost
  total_value: number // Total MRP value
  total_cost?: number // Total cost value
}

export default function OpeningBalanceSetup() {
  const [activeTab, setActiveTab] = useState('overview')
  const [openingBalances, setOpeningBalances] = useState<OpeningBalanceItem[]>([])
  const [supplierOutstanding, setSupplierOutstanding] = useState<SupplierOutstanding[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [suppliersLoading, setSuppliersLoading] = useState(false)
  const [inventoryError, setInventoryError] = useState(false)
  const [suppliersError, setSuppliersError] = useState(false)

  // Helper function to fetch with timeout
  const fetchWithTimeout = (url: string, timeout = 30000) => {
    return Promise.race([
      fetch(url),
      new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ])
  }

  const fetchExistingData = useCallback(async () => {
    try {
      console.log('🔄 Fetching existing inventory and supplier data...')
      setLoading(true)
      setInventoryLoading(true)
      setSuppliersLoading(true)
      setInventoryError(false)
      setSuppliersError(false)

      // Fetch data in parallel for better performance with timeout
      const fetchPromises = [
        fetchWithTimeout('/api/accounting/inventory-sync', 20000).catch(err => {
          console.error('Inventory fetch error:', err)
          setInventoryError(true)
          return null
        }),
        fetchWithTimeout('/api/accounting/suppliers/summary', 20000).catch(err => {
          console.error('Suppliers fetch error:', err)
          setSuppliersError(true)
          return null
        })
      ]

      const [inventoryResponse, suppliersResponse] = await Promise.all(fetchPromises)

      // Process inventory data
      if (inventoryResponse && inventoryResponse.ok) {
        const inventoryResult = await inventoryResponse.json()
        console.log('📦 Inventory API response:', inventoryResult)

        if (inventoryResult && inventoryResult.success && inventoryResult.data && Array.isArray(inventoryResult.data.inventoryBreakdown)) {
          const inventoryFromProducts: InventoryItem[] = inventoryResult.data.inventoryBreakdown.map((item: InventoryBreakdownItem) => {
            // Use cost_price if available, otherwise fall back to unit_price * 0.7 (estimated 30% margin)
            const costPrice = item.cost_price || (item.unit_price * 0.7)
            const totalCostValue = (item.quantity || 0) * costPrice
            
            return {
              id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity || 0,
              unit_cost: costPrice, // Use actual cost for asset calculation
              unit_mrp: item.unit_price, // Store MRP for reference
              total_value: totalCostValue, // Total cost value for assets
              total_mrp: item.total_value || ((item.quantity || 0) * (item.unit_price || 0)), // Total MRP for reference
              category: 'FINISHED_GOODS' as const,
              sku: item.sku,
              supplier_id: undefined // Not available in this data structure
            }
          })
          setInventoryItems(inventoryFromProducts)
          console.log(`📊 Loaded ${inventoryFromProducts.length} inventory items with total COST: ₹${inventoryFromProducts.reduce((sum, item) => sum + item.total_value, 0)} | total MRP: ₹${inventoryFromProducts.reduce((sum, item) => sum + (item.total_mrp || 0), 0)}`)
        } else {
          console.log('⚠️ No inventory data found or invalid format:', inventoryResult)
        }
      } else if (!inventoryResponse) {
        setInventoryError(true)
      }
      setInventoryLoading(false)

      // Process suppliers data
      if (suppliersResponse && suppliersResponse.ok) {
        const suppliersResult = await suppliersResponse.json()
        console.log('🏢 Suppliers API response:', suppliersResult)

        if (suppliersResult.success && Array.isArray(suppliersResult.suppliers)) {
          // Use actual supplier outstanding amounts from vendor bills
          const supplierEntries: SupplierOutstanding[] = suppliersResult.suppliers.map((supplierData: SupplierSummary) => ({
            id: supplierData.supplier.id,
            supplier_name: supplierData.supplier.name,
            supplier_id: supplierData.supplier.id,
            amount_owed: supplierData.remaining_amount || 0, // Use actual outstanding amount
            purchase_date: new Date().toISOString().split('T')[0],
            due_date: new Date().toISOString().split('T')[0],
            description: `Outstanding payment to ${supplierData.supplier.name}`
          }))
          setSupplierOutstanding(supplierEntries)
          console.log(`💰 Loaded ${supplierEntries.length} suppliers with total outstanding: ₹${supplierEntries.reduce((sum, s) => sum + s.amount_owed, 0)}`)
        }
      } else if (!suppliersResponse) {
        setSuppliersError(true)
      }
      setSuppliersLoading(false)

    } catch (error) {
      console.error('❌ Error fetching existing data:', error)
      toast.error('Failed to load existing inventory and supplier data')
      setInventoryLoading(false)
      setSuppliersLoading(false)
      setInventoryError(true)
      setSuppliersError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch existing inventory and supplier data
  useEffect(() => {
    fetchExistingData()
  }, [fetchExistingData])

  // Calculate totals
  const openingAssetsValue = openingBalances
    .filter(item => item.account_type === 'ASSET')
    .reduce((sum, item) => sum + item.amount, 0)
  
  const totalInventoryValue = inventoryItems
    .reduce((sum, item) => sum + item.total_value, 0)
  
  // Total Assets includes opening balance assets + inventory value
  const totalAssets = openingAssetsValue + totalInventoryValue
  
  const totalLiabilities = openingBalances
    .filter(item => item.account_type === 'LIABILITY')
    .reduce((sum, item) => sum + item.amount, 0)
  
  const totalEquity = openingBalances
    .filter(item => item.account_type === 'EQUITY')
    .reduce((sum, item) => sum + item.amount, 0)

  const totalSupplierOutstanding = supplierOutstanding
    .reduce((sum, supplier) => sum + supplier.amount_owed, 0)

  // Debug logging for stat cards
  console.log('📊 Stat Cards Debug:', {
    inventoryItemsCount: inventoryItems.length,
    totalInventoryValue,
    openingAssetsValue,
    totalAssets: openingAssetsValue + totalInventoryValue,
    supplierOutstandingCount: supplierOutstanding.length,
    totalSupplierOutstanding,
    inventoryItems: inventoryItems.slice(0, 3), // First 3 items
    supplierOutstanding: supplierOutstanding.slice(0, 3) // First 3 items
  })

  const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01

  const addOpeningBalance = () => {
    const newItem: OpeningBalanceItem = {
      id: Date.now().toString(),
      account_code: '',
      account_name: '',
      account_type: 'ASSET',
      amount: 0,
      description: ''
    }
    setOpeningBalances([...openingBalances, newItem])
  }

  const updateOpeningBalance = (id: string, field: keyof OpeningBalanceItem, value: string | number) => {
    setOpeningBalances(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  const removeOpeningBalance = (id: string) => {
    setOpeningBalances(prev => prev.filter(item => item.id !== id))
  }

  const addSupplierOutstanding = () => {
    const newSupplier: SupplierOutstanding = {
      id: Date.now().toString(),
      supplier_name: '',
      supplier_id: '',
      amount_owed: 0,
      purchase_date: '',
      due_date: '',
      description: ''
    }
    setSupplierOutstanding([...supplierOutstanding, newSupplier])
  }

  const updateSupplierOutstanding = (id: string, field: keyof SupplierOutstanding, value: string | number) => {
    setSupplierOutstanding(prev =>
      prev.map(supplier =>
        supplier.id === id ? { ...supplier, [field]: value } : supplier
      )
    )
  }

  const removeSupplierOutstanding = (id: string) => {
    setSupplierOutstanding(prev => prev.filter(supplier => supplier.id !== id))
  }

  const addInventoryItem = () => {
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      product_name: '',
      quantity: 0,
      unit_cost: 0,
      unit_mrp: 0,
      total_value: 0,
      total_mrp: 0,
      category: 'FINISHED_GOODS'
    }
    setInventoryItems([...inventoryItems, newItem])
  }

  const updateInventoryItem = (id: string, field: keyof InventoryItem, value: string | number) => {
    setInventoryItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value }
          // Auto-calculate total values when quantity, unit_cost, or unit_mrp changes
          if (field === 'quantity' || field === 'unit_cost') {
            updated.total_value = updated.quantity * updated.unit_cost
          }
          if (field === 'quantity' || field === 'unit_mrp') {
            updated.total_mrp = updated.quantity * (updated.unit_mrp || 0)
          }
          return updated
        }
        return item
      })
    )
  }

  const removeInventoryItem = (id: string) => {
    setInventoryItems(prev => prev.filter(item => item.id !== id))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const saveOpeningBalances = async () => {
    if (!isBalanced) {
      toast.error('Opening balances must be balanced (Assets = Liabilities + Equity)')
      return
    }

    try {
      setLoading(true)

      const payload = {
        openingBalances,
        supplierOutstanding: supplierOutstanding.filter(s => s.amount_owed > 0),
        inventoryItems: inventoryItems.filter(i => i.quantity > 0)
      }

      const response = await fetch('/api/accounting/opening-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save opening balances')
      }

      toast.success('Opening balances saved successfully!')
      console.log('Opening balances saved:', result)
      
    } catch (error) {
      console.error('Error saving opening balances:', error)
      toast.error('Failed to save opening balances: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Opening Balance Setup</h1>
          <p className="text-gray-600 mt-1">
            Set up your existing business balances, inventory, and supplier outstanding
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={fetchExistingData}
            disabled={inventoryLoading || suppliersLoading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${(inventoryLoading || suppliersLoading) ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button 
            onClick={saveOpeningBalances}
            disabled={loading || !isBalanced}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Opening Balances'}
          </Button>
        </div>
      </div>

      {/* Loading Progress Indicator */}
      {(inventoryLoading || suppliersLoading) && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div className="text-sm text-blue-700">
                <div className="font-medium">Loading data...</div>
                <div className="text-xs text-blue-600 mt-1">
                  {inventoryLoading && !suppliersLoading && "Fetching inventory data"}
                  {!inventoryLoading && suppliersLoading && "Fetching supplier data"}
                  {inventoryLoading && suppliersLoading && "Fetching inventory and supplier data"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={isBalanced ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Balance Status</CardTitle>
              {isBalanced ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-semibold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
              {isBalanced ? 'Balanced' : 'Not Balanced'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {isBalanced ? 'Assets = Liabilities + Equity' : 'Please adjust entries'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Assets</CardTitle>
              <Building className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-green-600">
              {inventoryLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                formatCurrency(totalAssets)
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1 space-y-1">
              <div>Opening Assets: {formatCurrency(openingAssetsValue)}</div>
              <div className="flex items-center gap-1">
                Inventory (Cost): 
                {inventoryLoading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading...
                  </span>
                ) : inventoryError ? (
                  <span className="text-red-500">Error</span>
                ) : (
                  formatCurrency(totalInventoryValue)
                )}
              </div>
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
            <div className="text-lg font-semibold text-red-600">
              {formatCurrency(totalLiabilities)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Equity</CardTitle>
              <Calculator className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-blue-600">
              {formatCurrency(totalEquity)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="balances">Opening Balances</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier Outstanding</TabsTrigger>
          <TabsTrigger value="inventory">Current Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Inventory Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Items:</span>
                    <span className="font-medium flex items-center gap-2">
                      {inventoryLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : inventoryError ? (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          Error
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={fetchExistingData}
                            className="h-6 px-2 text-xs"
                          >
                            Retry
                          </Button>
                        </div>
                      ) : (
                        inventoryItems.length.toLocaleString()
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Cost Value:</span>
                    <span className="font-medium text-green-600 flex items-center gap-2">
                      {inventoryLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : inventoryError ? (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          Error
                        </div>
                      ) : (
                        formatCurrency(totalInventoryValue)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total MRP Value:</span>
                    <span className="font-medium text-blue-600 flex items-center gap-2">
                      {inventoryLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : inventoryError ? (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          Error
                        </div>
                      ) : (
                        formatCurrency(inventoryItems.reduce((sum, item) => sum + (item.total_mrp || 0), 0))
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Supplier Outstanding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Suppliers:</span>
                    <span className="font-medium flex items-center gap-2">
                      {suppliersLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : suppliersError ? (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          Error
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={fetchExistingData}
                            className="h-6 px-2 text-xs"
                          >
                            Retry
                          </Button>
                        </div>
                      ) : (
                        supplierOutstanding.length.toLocaleString()
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Outstanding:</span>
                    <span className="font-medium text-red-600 flex items-center gap-2">
                      {suppliersLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : suppliersError ? (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          Error
                        </div>
                      ) : (
                        formatCurrency(totalSupplierOutstanding)
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {!isBalanced && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-700">
                    <div className="font-medium mb-1">Balance Sheet Not Balanced</div>
                    <div>Assets: {formatCurrency(totalAssets)}</div>
                    <div>Liabilities + Equity: {formatCurrency(totalLiabilities + totalEquity)}</div>
                    <div>Difference: {formatCurrency(totalAssets - (totalLiabilities + totalEquity))}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="balances" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Opening Balance Accounts</CardTitle>
                <Button onClick={addOpeningBalance} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openingBalances.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.account_code}
                          onChange={(e) => updateOpeningBalance(item.id, 'account_code', e.target.value)}
                          placeholder="e.g., 1100"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.account_name}
                          onChange={(e) => updateOpeningBalance(item.id, 'account_name', e.target.value)}
                          placeholder="e.g., Bank Account"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.account_type}
                          onValueChange={(value) => updateOpeningBalance(item.id, 'account_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ASSET">Asset</SelectItem>
                            <SelectItem value="LIABILITY">Liability</SelectItem>
                            <SelectItem value="EQUITY">Equity</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.amount}
                          onChange={(e) => updateOpeningBalance(item.id, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateOpeningBalance(item.id, 'description', e.target.value)}
                          placeholder="Description"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeOpeningBalance(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Supplier Outstanding Payments</CardTitle>
                <Button onClick={addSupplierOutstanding} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Amount Owed</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierOutstanding.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <Input
                          value={supplier.supplier_name}
                          onChange={(e) => updateSupplierOutstanding(supplier.id, 'supplier_name', e.target.value)}
                          placeholder="Supplier name"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={supplier.amount_owed}
                          onChange={(e) => updateSupplierOutstanding(supplier.id, 'amount_owed', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={supplier.purchase_date}
                          onChange={(e) => updateSupplierOutstanding(supplier.id, 'purchase_date', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={supplier.due_date}
                          onChange={(e) => updateSupplierOutstanding(supplier.id, 'due_date', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={supplier.description}
                          onChange={(e) => updateSupplierOutstanding(supplier.id, 'description', e.target.value)}
                          placeholder="What was purchased"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeSupplierOutstanding(supplier.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current Inventory Items</CardTitle>
                <Button onClick={addInventoryItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Unit MRP</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Total MRP</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.product_name}
                          onChange={(e) => updateInventoryItem(item.id, 'product_name', e.target.value)}
                          placeholder="Product name"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateInventoryItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unit_cost}
                          onChange={(e) => updateInventoryItem(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unit_mrp || 0}
                          onChange={(e) => updateInventoryItem(item.id, 'unit_mrp', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">
                          {formatCurrency(item.total_value)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-blue-600">
                          {formatCurrency(item.total_mrp || 0)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.category}
                          onValueChange={(value) => updateInventoryItem(item.id, 'category', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FINISHED_GOODS">Finished Goods</SelectItem>
                            <SelectItem value="RAW_MATERIAL">Raw Materials</SelectItem>
                            <SelectItem value="WORK_IN_PROGRESS">Work in Progress</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeInventoryItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
