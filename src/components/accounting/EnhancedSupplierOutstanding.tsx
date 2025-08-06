'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog'
import { 
  CreditCard, 
  Building, 
  Package, 
  Check,
  AlertCircle,
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'

interface Supplier {
  id: string
  name: string
  contact?: string
  email?: string
  products: Product[]
  total_stock_cost: number
  total_mrp_value: number
  paid_amount: number
  outstanding_amount: number
  last_payment_date?: string
  payment_status: 'PAID' | 'PARTIAL' | 'PENDING'
}

interface Product {
  id: string
  name: string
  sku: string
  quantity: number
  unit_cost: number
  mrp: number
  total_cost: number
  total_mrp: number
  supplier_id?: string
}

interface SupplierData {
  id: string
  name: string
  contact?: string
  email?: string
}

interface PaymentForm {
  amount: number
  payment_date: string
  payment_method: string
  reference_number: string
  description: string
}

export default function EnhancedSupplierOutstanding() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; supplier: Supplier | null }>({
    open: false,
    supplier: null
  })
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'CASH',
    reference_number: '',
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchSupplierOutstanding()
  }, [])

  const fetchSupplierOutstanding = async () => {
    try {
      setLoading(true)
      
      // Fetch suppliers with their products
      const [suppliersRes, productsRes] = await Promise.all([
        fetch('/api/suppliers'),
        fetch('/api/products?limit=1000')
      ])

      const suppliersData = await suppliersRes.json()
      const productsData = await productsRes.json()

      // Group products by supplier and calculate totals
      const enhancedSuppliers = suppliersData.map((supplier: SupplierData) => {
        const supplierProducts = productsData.filter((p: Product) => p.supplier_id === supplier.id)
        
        const total_stock_cost = supplierProducts.reduce((sum: number, p: Product) => 
          sum + (p.quantity * p.unit_cost), 0)
        
        const total_mrp_value = supplierProducts.reduce((sum: number, p: Product) => 
          sum + (p.quantity * p.mrp), 0)

        // Calculate paid amount (you might want to fetch this from payments table)
        const paid_amount = 0 // TODO: Fetch from supplier_payments table
        const outstanding_amount = total_stock_cost - paid_amount

        let payment_status: 'PAID' | 'PARTIAL' | 'PENDING' = 'PENDING'
        if (paid_amount >= total_stock_cost) payment_status = 'PAID'
        else if (paid_amount > 0) payment_status = 'PARTIAL'

        return {
          ...supplier,
          products: supplierProducts.map((p: Product) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            quantity: p.quantity,
            unit_cost: p.unit_cost,
            mrp: p.mrp,
            total_cost: p.quantity * p.unit_cost,
            total_mrp: p.quantity * p.mrp
          })),
          total_stock_cost,
          total_mrp_value,
          paid_amount,
          outstanding_amount,
          payment_status
        }
      })

      setSuppliers(enhancedSuppliers)
    } catch (error) {
      console.error('Error fetching supplier outstanding:', error)
      toast.error('Failed to load supplier data')
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!paymentDialog.supplier) return

    try {
      setSubmitting(true)
      
      const response = await fetch('/api/accounting/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: paymentDialog.supplier.id,
          ...paymentForm
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Payment of ₹${paymentForm.amount.toLocaleString()} recorded successfully!`)
        setPaymentDialog({ open: false, supplier: null })
        setPaymentForm({
          amount: 0,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'CASH',
          reference_number: '',
          description: ''
        })
        await fetchSupplierOutstanding() // Refresh data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast.error('Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  const openPaymentDialog = (supplier: Supplier) => {
    setPaymentDialog({ open: true, supplier })
    setPaymentForm({
      ...paymentForm,
      amount: supplier.outstanding_amount,
      description: `Payment to ${supplier.name}`
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800 border-green-200'
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'PENDING': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`

  const totalOutstanding = suppliers.reduce((sum, s) => sum + s.outstanding_amount, 0)
  const totalStockValue = suppliers.reduce((sum, s) => sum + s.total_stock_cost, 0)
  const totalMRPValue = suppliers.reduce((sum, s) => sum + s.total_mrp_value, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading supplier data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Suppliers</p>
                <p className="text-2xl font-bold text-blue-600">{suppliers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Stock Cost</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(totalStockValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">MRP Value</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalMRPValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers List */}
      <div className="space-y-4">
        {suppliers.map((supplier) => (
          <Card key={supplier.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building className="h-6 w-6 text-blue-600" />
                  <div>
                    <CardTitle className="text-lg">{supplier.name}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {supplier.products.length} products • {supplier.contact || 'No contact'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(supplier.payment_status)}>
                    {supplier.payment_status}
                  </Badge>
                  {supplier.outstanding_amount > 0 && (
                    <Button 
                      onClick={() => openPaymentDialog(supplier)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Add Payment
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Financial Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Stock Cost</label>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatCurrency(supplier.total_stock_cost)}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">MRP Value</label>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(supplier.total_mrp_value)}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Paid Amount</label>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(supplier.paid_amount)}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Outstanding</label>
                  <div className="text-lg font-semibold text-red-600">
                    {formatCurrency(supplier.outstanding_amount)}
                  </div>
                </div>
              </div>

              {/* Products List */}
              {supplier.products.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Products ({supplier.products.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Product</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Unit Cost</th>
                          <th className="px-3 py-2 text-right">MRP</th>
                          <th className="px-3 py-2 text-right">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplier.products.map((product) => (
                          <tr key={product.id} className="border-t">
                            <td className="px-3 py-2">
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-xs text-gray-500">{product.sku}</div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">{product.quantity}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(product.unit_cost)}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(product.mrp)}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(product.total_cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog.open} onOpenChange={(open) => setPaymentDialog({ open, supplier: paymentDialog.supplier })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Add Payment
            </DialogTitle>
            <DialogDescription>
              Record a payment for {paymentDialog.supplier?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="payment_date">Payment Date</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <select
                id="payment_method"
                title="Select payment method"
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
              </select>
            </div>

            <div>
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                placeholder="Transaction/Cheque number"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={paymentForm.description}
                onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                placeholder="Payment description"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handlePayment}
                disabled={submitting || paymentForm.amount <= 0}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Record Payment
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPaymentDialog({ open: false, supplier: null })}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
