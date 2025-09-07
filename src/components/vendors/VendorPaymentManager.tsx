'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Receipt, 
  CreditCard, 
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  RefreshCw
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface VendorBill {
  id: string
  bill_number: string
  bill_date: string
  due_date: string
  total_amount: number
  paid_amount: number
  status: 'pending' | 'partial' | 'paid' | 'overdue'
  description: string
  purchase_orders?: { id: string; total: number }
}

interface PaymentRecord {
  id: string
  amount: number
  date: string
  method: string
  reference: string | null
  description: string
  status: string
}

interface PurchaseOrder {
  id: string
  purchase_order_number?: string
  created_at: string
  total: number
  paid_amount: number
  status: string
  description?: string
  supplier_id?: string
}

interface BulkPaymentAllocation {
  po_id: string
  po_number: string
  outstanding_amount: number
  allocated_amount: number
  is_selected: boolean
}

interface BankAccount {
  id: string
  name?: string
  account_name: string
  account_number?: string
  upi_id?: string
  account_type: 'BANK' | 'UPI'
  is_active: boolean
}

interface Props {
  vendorId: string
  vendorName: string
}

export default function VendorPaymentManager({ vendorId, vendorName }: Props) {
  const [bills, setBills] = useState<VendorBill[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [inventoryBalance, setInventoryBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [addBillOpen, setAddBillOpen] = useState(false)
  const [addPaymentOpen, setAddPaymentOpen] = useState(false)
  const [bulkPaymentOpen, setBulkPaymentOpen] = useState(false)

  // Bulk payment states
  const [bulkPaymentAmount, setBulkPaymentAmount] = useState('')
  const [bulkPaymentAllocations, setBulkPaymentAllocations] = useState<BulkPaymentAllocation[]>([])
  const [bulkPaymentForm, setBulkPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    bank_account_id: '',
    reference_number: '',
    notes: ''
  })

  // Form states
  const [billForm, setBillForm] = useState({
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    total_amount: '',
    description: '',
    tax_amount: '',
    discount_amount: ''
  })

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    bank_account_id: '',
    upi_account_id: '',
    reference_number: '',
    notes: '',
    bill_id: ''
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [billsRes, paymentsRes, bankRes, upiRes, purchaseOrdersRes, ledgerRes] = await Promise.all([
          fetch(`/api/vendors/${vendorId}/bills`),
          fetch(`/api/vendors/${vendorId}/payments`),
          fetch('/api/finance/bank_accounts?type=BANK'),
          fetch('/api/finance/bank_accounts?type=UPI'),
          fetch(`/api/procurement/purchase_orders?supplier_id=${vendorId}`),
          fetch(`/api/finance/ledgers?type=supplier&id=${vendorId}`)
        ])

        const [billsData, paymentsData, bankData, upiData, purchaseOrdersData, ledgerData] = await Promise.all([
          billsRes.json(),
          paymentsRes.json(),
          bankRes.json(),
          upiRes.json(),
          purchaseOrdersRes.json(),
          ledgerRes.json()
        ])

        setBills(billsData || [])
        setPayments(paymentsData || [])
        setPurchaseOrders(purchaseOrdersData || [])
        setBankAccounts([...(bankData || []), ...(upiData || [])])
        
        // Find the specific supplier ledger and get its balance
        if (ledgerData?.data) {
          console.log('Ledger API Response:', ledgerData);
          const supplierLedger = ledgerData.data.find((ledger: {id: string, type: string, balance_due?: number}) => ledger.id === vendorId && ledger.type === 'supplier');
          console.log('Found supplier ledger:', supplierLedger);
          if (supplierLedger) {
            setInventoryBalance(supplierLedger.balance_due || 0);
            console.log('Set inventory balance to:', supplierLedger.balance_due);
          }
        }
      } catch (error) {
        console.error('Error fetching vendor payment data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [vendorId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [billsRes, paymentsRes] = await Promise.all([
        fetch(`/api/vendors/${vendorId}/bills`),
        fetch(`/api/vendors/${vendorId}/payments`)
      ])

      const [billsData, paymentsData] = await Promise.all([
        billsRes.json(),
        paymentsRes.json()
      ])

      setBills(billsData)
      setPayments(paymentsData)
    } catch (error) {
      console.error('Error fetching vendor payment data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Generate bill number based on vendor name and date
  const generateBillNumber = (vendorName: string, date: string) => {
    const vendorCode = vendorName
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .substring(0, 3)
      .padEnd(3, 'X')
    
    const dateObj = new Date(date)
    const year = dateObj.getFullYear().toString().slice(-2)
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
    const day = dateObj.getDate().toString().padStart(2, '0')
    
    // Add a random 3-digit number for uniqueness
    const randomNum = Math.floor(Math.random() * 900) + 100
    
    return `${vendorCode}-${year}${month}${day}-${randomNum}`
  }

  // Auto-generate bill number when bill date changes
  const handleBillDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value
    setBillForm(prev => ({
      ...prev,
      bill_date: date,
      bill_number: generateBillNumber(vendorName, date),
      due_date: prev.due_date || new Date(new Date(date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default 30 days
    }))
  }

  // Initialize bill form with default values
  const handleAddBillClick = () => {
    const today = new Date().toISOString().split('T')[0]
    const dueDate = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    setBillForm({
      bill_number: generateBillNumber(vendorName, today),
      bill_date: today,
      due_date: dueDate,
      total_amount: '',
      description: '',
      tax_amount: '',
      discount_amount: ''
    })
    setAddBillOpen(true)
  }

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`/api/vendors/${vendorId}/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...billForm,
          total_amount: parseFloat(billForm.total_amount),
          tax_amount: parseFloat(billForm.tax_amount) || 0,
          discount_amount: parseFloat(billForm.discount_amount) || 0
        })
      })

      if (response.ok) {
        setAddBillOpen(false)
        setBillForm({
          bill_number: '',
          bill_date: '',
          due_date: '',
          total_amount: '',
          description: '',
          tax_amount: '',
          discount_amount: ''
        })
        fetchData()
      }
    } catch (error) {
      console.error('Error adding bill:', error)
    }
  }

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`/api/vendors/${vendorId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentForm,
          amount: parseFloat(paymentForm.amount),
          vendor_bill_id: paymentForm.bill_id || null
        })
      })

      if (response.ok) {
        setAddPaymentOpen(false)
        setPaymentForm({
          amount: '',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'cash',
          bank_account_id: '',
          upi_account_id: '',
          reference_number: '',
          notes: '',
          bill_id: ''
        })
        fetchData()
      }
    } catch (error) {
      console.error('Error adding payment:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'outline' as const, icon: Clock, color: 'text-yellow-600' },
      partial: { variant: 'secondary' as const, icon: AlertCircle, color: 'text-orange-600' },
      paid: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      overdue: { variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-600' }
    }
    
    const config = variants[status as keyof typeof variants] || variants.pending
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  // Bulk payment functions
  const initializeBulkPayment = () => {
    const outstandingPOs = purchaseOrders
      .filter(po => (po.total - (po.paid_amount || 0)) > 0)
      .map(po => ({
        po_id: po.id,
        po_number: po.purchase_order_number || `PO-${po.id.slice(0, 8)}`,
        outstanding_amount: po.total - (po.paid_amount || 0),
        allocated_amount: 0,
        is_selected: false
      }))
    
    setBulkPaymentAllocations(outstandingPOs)
    setBulkPaymentOpen(true)
  }

  const updateBulkPaymentDistribution = (amount: number) => {
    setBulkPaymentAmount(amount.toString())
    
    let remainingAmount = amount
    const updatedAllocations = bulkPaymentAllocations.map(allocation => {
      if (!allocation.is_selected) {
        return { ...allocation, allocated_amount: 0 }
      }
      
      const canAllocate = Math.min(remainingAmount, allocation.outstanding_amount)
      remainingAmount -= canAllocate
      
      return { ...allocation, allocated_amount: canAllocate }
    })
    
    setBulkPaymentAllocations(updatedAllocations)
  }

  const togglePOSelection = (poId: string) => {
    const updated = bulkPaymentAllocations.map(allocation => 
      allocation.po_id === poId 
        ? { ...allocation, is_selected: !allocation.is_selected, allocated_amount: 0 }
        : allocation
    )
    setBulkPaymentAllocations(updated)
    
    // Recalculate distribution if amount is set
    if (bulkPaymentAmount) {
      updateBulkPaymentDistribution(parseFloat(bulkPaymentAmount))
    }
  }

  const submitBulkPayment = async () => {
    try {
      const selectedAllocations = bulkPaymentAllocations.filter(a => a.is_selected && a.allocated_amount > 0)
      
      if (selectedAllocations.length === 0) {
        alert('Please select at least one purchase order and enter a payment amount')
        return
      }

      // Create individual payments for each PO
      for (const allocation of selectedAllocations) {
        const response = await fetch(`/api/procurement/purchase_orders/${allocation.po_id}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: allocation.allocated_amount,
            payment_date: bulkPaymentForm.payment_date,
            payment_method: bulkPaymentForm.payment_method,
            bank_account_id: bulkPaymentForm.bank_account_id,
            reference_number: bulkPaymentForm.reference_number,
            notes: `Bulk payment - ${bulkPaymentForm.notes}`,
            purchase_order_id: allocation.po_id
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to process payment for ${allocation.po_number}`)
        }
      }

      // Reset and close
      setBulkPaymentOpen(false)
      setBulkPaymentAmount('')
      setBulkPaymentAllocations([])
      setBulkPaymentForm({
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        bank_account_id: '',
        reference_number: '',
        notes: ''
      })
      
      // Refresh data
      const loadData = async () => {
        const [billsRes, paymentsRes, purchaseOrdersRes] = await Promise.all([
          fetch(`/api/vendors/${vendorId}/bills`),
          fetch(`/api/vendors/${vendorId}/payments`),
          fetch(`/api/procurement/purchase_orders?supplier_id=${vendorId}`)
        ])
        const [billsData, paymentsData, purchaseOrdersData] = await Promise.all([
          billsRes.json(),
          paymentsRes.json(),
          purchaseOrdersRes.json()
        ])
        setBills(billsData || [])
        setPayments(paymentsData || [])
        setPurchaseOrders(purchaseOrdersData || [])
      }
      loadData()
      
    } catch (error) {
      console.error('Error processing bulk payment:', error)
      alert('Error processing payment. Please try again.')
    }
  }

  const totalOutstanding = bills.reduce((sum, bill) => sum + (bill.total_amount - bill.paid_amount), 0)
  const purchaseOrdersOutstanding = purchaseOrders.reduce((sum, po) => sum + (po.total - (po.paid_amount || 0)), 0)
  // Use the actual ledger balance if available (includes inventory), otherwise fall back to bills + POs
  const totalVendorOutstanding = inventoryBalance > 0 ? inventoryBalance : (totalOutstanding + purchaseOrdersOutstanding)
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)

  console.log('VendorPaymentManager Debug:', {
    vendorId,
    inventoryBalance,
    totalOutstanding,
    purchaseOrdersOutstanding,
    totalVendorOutstanding,
    billsCount: bills.length,
    purchaseOrdersCount: purchaseOrders.length
  })

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading payment data...</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalVendorOutstanding)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {inventoryBalance > 0 ? (
                    <>Ledger Balance: {formatCurrency(inventoryBalance)} (incl. inventory)</>
                  ) : (
                    <>Bills: {formatCurrency(totalOutstanding)} + POs: {formatCurrency(purchaseOrdersOutstanding)}</>
                  )}
                </p>
              </div>
              <Receipt className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Bills</p>
                <p className="text-2xl font-bold text-orange-600">
                  {inventoryBalance > 0 ? 
                    1 : // Show 1 when ledger balance exists (representing the inventory obligation)
                    (bills.filter(b => b.status === 'pending' || b.status === 'partial').length + 
                     purchaseOrders.filter(po => (po.total - (po.paid_amount || 0)) > 0).length)
                  }
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {inventoryBalance > 0 ? (
                    <>Inventory/Stock Obligation</>
                  ) : (
                    <>Bills: {bills.filter(b => b.status === 'pending' || b.status === 'partial').length} + 
                     POs: {purchaseOrders.filter(po => (po.total - (po.paid_amount || 0)) > 0).length}</>
                  )}
                </p>
              </div>
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="bills" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bills">Vendor Bills</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="bills">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Vendor Bills</CardTitle>
                <CardDescription>Manage bills and invoices from {vendorName}</CardDescription>
              </div>
              <Dialog open={addBillOpen} onOpenChange={setAddBillOpen}>
                <Button onClick={handleAddBillClick}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bill
                </Button>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Add New Bill - {vendorName}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddBill} className="space-y-6">
                    {/* Bill Information Section */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-700 border-b pb-2">Bill Information</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="bill_number" className="text-sm font-medium">
                            Bill Number
                            <span className="text-xs text-gray-500 ml-1">(Auto-generated)</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="bill_number"
                              value={billForm.bill_number}
                              onChange={(e) => setBillForm({...billForm, bill_number: e.target.value})}
                              placeholder="Auto-generated on date selection"
                              className="pr-10"
                              required
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1 h-8 w-8 p-0"
                              onClick={() => {
                                if (billForm.bill_date) {
                                  const newBillNumber = generateBillNumber(vendorName, billForm.bill_date)
                                  setBillForm({...billForm, bill_number: newBillNumber})
                                }
                              }}
                              title="Regenerate bill number"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="bill_date" className="text-sm font-medium">Bill Date</Label>
                          <Input
                            id="bill_date"
                            type="date"
                            value={billForm.bill_date}
                            onChange={handleBillDateChange}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="due_date" className="text-sm font-medium">Due Date</Label>
                        <Input
                          id="due_date"
                          type="date"
                          value={billForm.due_date}
                          onChange={(e) => setBillForm({...billForm, due_date: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    {/* Financial Details Section */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-700 border-b pb-2">Financial Details</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="total_amount" className="text-sm font-medium">
                            Total Amount (₹)
                          </Label>
                          <Input
                            id="total_amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={billForm.total_amount}
                            onChange={(e) => setBillForm({...billForm, total_amount: e.target.value})}
                            placeholder="0.00"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="tax_amount" className="text-sm font-medium">
                            Tax Amount (₹)
                          </Label>
                          <Input
                            id="tax_amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={billForm.tax_amount}
                            onChange={(e) => setBillForm({...billForm, tax_amount: e.target.value})}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="discount_amount" className="text-sm font-medium">
                          Discount Amount (₹)
                        </Label>
                        <Input
                          id="discount_amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={billForm.discount_amount}
                          onChange={(e) => setBillForm({...billForm, discount_amount: e.target.value})}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Description Section */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-700 border-b pb-2">Additional Details</h4>
                      
                      <div>
                        <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                        <Textarea
                          id="description"
                          value={billForm.description}
                          onChange={(e) => setBillForm({...billForm, description: e.target.value})}
                          placeholder="Enter bill description, items, or notes..."
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* Amount Summary */}
                    {billForm.total_amount && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Amount Summary</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>₹{(parseFloat(billForm.total_amount) - parseFloat(billForm.tax_amount || '0') + parseFloat(billForm.discount_amount || '0')).toFixed(2)}</span>
                          </div>
                          {billForm.tax_amount && (
                            <div className="flex justify-between">
                              <span>Tax:</span>
                              <span>₹{parseFloat(billForm.tax_amount).toFixed(2)}</span>
                            </div>
                          )}
                          {billForm.discount_amount && (
                            <div className="flex justify-between text-green-600">
                              <span>Discount:</span>
                              <span>-₹{parseFloat(billForm.discount_amount).toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-medium border-t pt-1">
                            <span>Total Amount:</span>
                            <span>₹{parseFloat(billForm.total_amount).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => setAddBillOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="min-w-[100px]">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Bill
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No bills found for this vendor
                      </TableCell>
                    </TableRow>
                  ) : (
                    bills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.bill_number}</TableCell>
                        <TableCell>{new Date(bill.bill_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(bill.due_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">{formatCurrency(bill.total_amount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(bill.paid_amount)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(bill.total_amount - bill.paid_amount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(bill.status)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPaymentForm({...paymentForm, bill_id: bill.id})
                              setAddPaymentOpen(true)
                            }}
                            disabled={bill.status === 'paid'}
                          >
                            Pay
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase-orders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Purchase Orders</CardTitle>
                <CardDescription>Purchase orders from {vendorName} contributing to outstanding balance</CardDescription>
              </div>
              {purchaseOrders.filter(po => (po.total - (po.paid_amount || 0)) > 0).length > 0 && (
                <Button onClick={initializeBulkPayment} className="ml-4">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Bulk Payment
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Paid Amount</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No purchase orders found for this vendor
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchaseOrders.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium">{po.purchase_order_number || `PO-${po.id.slice(0, 8)}`}</TableCell>
                        <TableCell>{new Date(po.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(po.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(po.paid_amount || 0)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {formatCurrency(po.total - (po.paid_amount || 0))}
                        </TableCell>
                        <TableCell>{getStatusBadge(po.status)}</TableCell>
                        <TableCell className="max-w-xs truncate">{po.description || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>All payments made to {vendorName}</CardDescription>
              </div>
              <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddPayment} className="space-y-4">
                    <div>
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment_date">Payment Date</Label>
                      <Input
                        id="payment_date"
                        type="date"
                        value={paymentForm.payment_date}
                        onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment_method">Payment Method</Label>
                      <Select
                        value={paymentForm.payment_method}
                        onValueChange={(value) => setPaymentForm({...paymentForm, payment_method: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Bank Account Selection */}
                    {(paymentForm.payment_method === 'bank_transfer' || paymentForm.payment_method === 'cheque') && (
                      <div>
                        <Label htmlFor="bank_account_id">Bank Account</Label>
                        <Select
                          value={paymentForm.bank_account_id}
                          onValueChange={(value) => setPaymentForm({...paymentForm, bank_account_id: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select bank account" />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts.filter(acc => acc.account_type === 'BANK').map(account => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} - {account.account_number ? `****${account.account_number.slice(-4)}` : 'No A/C'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {paymentForm.payment_method === 'upi' && (
                      <div>
                        <Label htmlFor="upi_account_id">UPI Account</Label>
                        <Select
                          value={paymentForm.upi_account_id}
                          onValueChange={(value) => setPaymentForm({...paymentForm, upi_account_id: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select UPI account" />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts.filter(acc => acc.account_type === 'UPI').map(account => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} - {account.upi_id || 'No UPI ID'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="reference_number">Reference Number</Label>
                      <Input
                        id="reference_number"
                        value={paymentForm.reference_number}
                        onChange={(e) => setPaymentForm({...paymentForm, reference_number: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                      />
                    </div>
                    {bills.length > 0 && (
                      <div>
                        <Label htmlFor="bill_id">Link to Bill (Optional)</Label>
                        <Select
                          value={paymentForm.bill_id}
                          onValueChange={(value) => setPaymentForm({...paymentForm, bill_id: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a bill" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No specific bill</SelectItem>
                            {bills.filter(b => b.status !== 'paid').map(bill => (
                              <SelectItem key={bill.id} value={bill.id}>
                                {bill.bill_number} - {formatCurrency(bill.total_amount - bill.paid_amount)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setAddPaymentOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Record Payment</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No payment records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="capitalize">{payment.method}</TableCell>
                        <TableCell>{payment.reference || '-'}</TableCell>
                        <TableCell>{payment.description}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Payment Dialog */}
      <Dialog open={bulkPaymentOpen} onOpenChange={setBulkPaymentOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Payment to {vendorName}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Payment Amount Input */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bulk-amount">Payment Amount</Label>
                <Input
                  id="bulk-amount"
                  type="number"
                  placeholder="Enter payment amount"
                  value={bulkPaymentAmount}
                  onChange={(e) => updateBulkPaymentDistribution(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="payment-date">Payment Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={bulkPaymentForm.payment_date}
                  onChange={(e) => setBulkPaymentForm({...bulkPaymentForm, payment_date: e.target.value})}
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payment Method</Label>
                <Select 
                  value={bulkPaymentForm.payment_method} 
                  onValueChange={(value) => setBulkPaymentForm({...bulkPaymentForm, payment_method: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reference">Reference Number</Label>
                <Input
                  id="reference"
                  placeholder="Transaction reference"
                  value={bulkPaymentForm.reference_number}
                  onChange={(e) => setBulkPaymentForm({...bulkPaymentForm, reference_number: e.target.value})}
                />
              </div>
            </div>

            {/* Bank Account Selection (if needed) */}
            {(bulkPaymentForm.payment_method === 'bank_transfer' || bulkPaymentForm.payment_method === 'cheque') && (
              <div>
                <Label>Bank Account</Label>
                <Select 
                  value={bulkPaymentForm.bank_account_id} 
                  onValueChange={(value) => setBulkPaymentForm({...bulkPaymentForm, bank_account_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.filter(account => account.account_type === 'BANK').map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name} - {account.account_number || 'N/A'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Payment notes..."
                value={bulkPaymentForm.notes}
                onChange={(e) => setBulkPaymentForm({...bulkPaymentForm, notes: e.target.value})}
              />
            </div>

            {/* Purchase Orders Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Purchase Orders to Pay</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                {bulkPaymentAllocations.map((allocation) => (
                  <div key={allocation.po_id} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <input
                      type="checkbox"
                      checked={allocation.is_selected}
                      onChange={() => togglePOSelection(allocation.po_id)}
                      className="w-4 h-4"
                      aria-label={`Select ${allocation.po_number}`}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{allocation.po_number}</div>
                      <div className="text-sm text-gray-500">
                        Outstanding: {formatCurrency(allocation.outstanding_amount)}
                      </div>
                    </div>
                    {allocation.is_selected && (
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          Paying: {formatCurrency(allocation.allocated_amount)}
                        </div>
                        {allocation.allocated_amount < allocation.outstanding_amount && (
                          <div className="text-xs text-orange-600">
                            Remaining: {formatCurrency(allocation.outstanding_amount - allocation.allocated_amount)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            {bulkPaymentAmount && parseFloat(bulkPaymentAmount) > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Payment Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Payment Amount:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(bulkPaymentAmount))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Allocated Amount:</span>
                    <span className="font-medium">
                      {formatCurrency(bulkPaymentAllocations.reduce((sum, a) => sum + a.allocated_amount, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining Amount:</span>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(parseFloat(bulkPaymentAmount) - bulkPaymentAllocations.reduce((sum, a) => sum + a.allocated_amount, 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setBulkPaymentOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={submitBulkPayment}
                disabled={!bulkPaymentAmount || bulkPaymentAllocations.filter(a => a.is_selected).length === 0}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Process Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
