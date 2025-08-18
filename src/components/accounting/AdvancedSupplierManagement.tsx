'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, DollarSign, Package, Clock, CheckCircle, Search, Filter } from 'lucide-react'
import { format } from 'date-fns'

interface Supplier {
  id: string
  name: string
  email?: string
  contact?: string
  phone?: string
  address?: string
}

interface SupplierProduct {
  id: string
  supplier_id: string
  product_name: string
  quantity: number
  cost_price: number
  mrp: number
  total_cost: number
  delivery_date: string
}

interface Payment {
  id: string
  supplier_id: string
  amount: number
  payment_method: 'CASH' | 'BANK' | 'CHECK'
  payment_date: string
  check_number?: string
  check_date?: string
  bank_reference?: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  notes?: string
}

interface PaymentSchedule {
  id: string
  supplier_id: string
  scheduled_date: string
  amount: number
  payment_method: 'CASH' | 'BANK' | 'CHECK'
  status: 'SCHEDULED' | 'COMPLETED' | 'OVERDUE'
  notes?: string
}

interface SupplierSummary {
  supplier: Supplier
  products: SupplierProduct[]
  total_products: number
  total_cost: number
  total_mrp: number
  amount_paid: number
  remaining_amount: number
  payment_schedule?: PaymentSchedule
  recent_payments: Payment[]
}

export default function AdvancedSupplierManagement() {
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([])
  const [filteredSuppliers, setFilteredSuppliers] = useState<SupplierSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierSummary | null>(null)
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [scheduleDialog, setScheduleDialog] = useState(false)
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'outstanding' | 'paid' | 'scheduled'>('all')
  
  // Payment form states
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CHECK'>('CASH')
  const [paymentDate, setPaymentDate] = useState<Date>(new Date())
  const [checkNumber, setCheckNumber] = useState('')
  const [checkDate, setCheckDate] = useState<Date>(new Date())
  const [bankReference, setBankReference] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  
  // Enhanced schedule form states
  const [scheduleDate, setScheduleDate] = useState<Date>(new Date())
  const [scheduleAmount, setScheduleAmount] = useState('')
  const [scheduleFrequency, setScheduleFrequency] = useState<'once' | 'weekly' | 'monthly' | 'bi-monthly'>('once')
  const [scheduleMethods, setScheduleMethods] = useState<string[]>(['BANK'])
  const [scheduleNotes, setScheduleNotes] = useState('')

  useEffect(() => {
    fetchSupplierData()
  }, [])

  // Filter suppliers based on search term and filter type
  useEffect(() => {
    let filtered = suppliers.filter(supplier => 
      supplier.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.supplier.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Apply filter type
    switch (filterType) {
      case 'outstanding':
        filtered = filtered.filter(s => s.remaining_amount > 0)
        break
      case 'paid':
        filtered = filtered.filter(s => s.remaining_amount <= 0 && s.amount_paid > 0)
        break
      case 'scheduled':
        filtered = filtered.filter(s => s.payment_schedule?.status === 'SCHEDULED')
        break
      default:
        // Show all
        break
    }

    // Sort by payment schedule date, then by outstanding amount
    filtered.sort((a, b) => {
      if (a.payment_schedule && b.payment_schedule) {
        return new Date(a.payment_schedule.scheduled_date).getTime() - 
               new Date(b.payment_schedule.scheduled_date).getTime()
      }
      if (a.payment_schedule && !b.payment_schedule) return -1
      if (!a.payment_schedule && b.payment_schedule) return 1
      return b.remaining_amount - a.remaining_amount
    })

    setFilteredSuppliers(filtered)
  }, [suppliers, searchTerm, filterType])

  const fetchSupplierData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/accounting/suppliers/summary')
      const data = await response.json()
      setSuppliers(data.suppliers || [])
    } catch (error) {
      console.error('Error fetching supplier data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getPaymentStatusBadge = (remaining: number, schedule?: PaymentSchedule) => {
    if (remaining <= 0) {
      return <Badge className="bg-green-100 text-green-800">✅ Paid</Badge>
    }
    
    if (schedule) {
      const scheduleDate = new Date(schedule.scheduled_date)
      const today = new Date()
      
      if (scheduleDate < today && schedule.status === 'SCHEDULED') {
        return <Badge className="bg-red-100 text-red-800">⚠️ Overdue</Badge>
      }
      
      if (schedule.status === 'SCHEDULED') {
        return <Badge className="bg-yellow-100 text-yellow-800">📅 Scheduled</Badge>
      }
    }
    
    return <Badge className="bg-blue-100 text-blue-800">💰 Outstanding</Badge>
  }

  const handlePayment = async () => {
    if (!selectedSupplier || !paymentAmount) return

    try {
      const paymentData = {
        supplier_id: selectedSupplier.supplier.id,
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        payment_date: format(paymentDate, 'yyyy-MM-dd'),
        check_number: paymentMethod === 'CHECK' ? checkNumber : undefined,
        check_date: paymentMethod === 'CHECK' ? format(checkDate, 'yyyy-MM-dd') : undefined,
        bank_reference: paymentMethod === 'BANK' ? bankReference : undefined,
        notes: paymentNotes
      }

      const response = await fetch('/api/accounting/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      })

      if (response.ok) {
        setPaymentDialog(false)
        fetchSupplierData()
        // Reset form
        setPaymentAmount('')
        setPaymentMethod('CASH')
        setCheckNumber('')
        setBankReference('')
        setPaymentNotes('')
      }
    } catch (error) {
      console.error('Error processing payment:', error)
    }
  }

  const handleSchedulePayment = async () => {
    if (!selectedSupplier || !scheduleAmount) return

    try {
      const scheduleData = {
        supplier_id: selectedSupplier.supplier.id,
        scheduled_date: format(scheduleDate, 'yyyy-MM-dd'),
        amount: parseFloat(scheduleAmount),
        payment_methods: scheduleMethods, // Multiple methods
        frequency: scheduleFrequency,
        notes: scheduleNotes
      }

      const response = await fetch('/api/accounting/payment-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData)
      })

      if (response.ok) {
        setScheduleDialog(false)
        fetchSupplierData()
        // Reset form
        setScheduleAmount('')
        setScheduleMethods(['BANK'])
        setScheduleFrequency('once')
        setScheduleNotes('')
      }
    } catch (error) {
      console.error('Error scheduling payment:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading supplier data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Supplier Payment Management</h2>
            <p className="text-purple-100 text-lg">Track outstanding balances and manage supplier payments efficiently</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={fetchSupplierData} 
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              🔄 Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filter Bar */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 min-w-64">
              <Label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">
                Search Suppliers
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search by name, contact, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                />
              </div>
            </div>
            <div className="min-w-48">
              <Label htmlFor="filterType" className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Status
              </Label>
              <Select value={filterType} onValueChange={(value: 'all' | 'outstanding' | 'paid' | 'scheduled') => setFilterType(value)}>
                <SelectTrigger className="border-2 border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  <SelectItem value="outstanding">Outstanding</SelectItem>
                  <SelectItem value="paid">Fully Paid</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <p className="text-sm font-semibold text-blue-900">Total Suppliers</p>
                </div>
                <p className="text-3xl font-bold text-blue-700">{filteredSuppliers.length}</p>
                <p className="text-xs text-blue-600 mt-1">of {suppliers.length} total suppliers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-rose-50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="h-5 w-5 text-red-600" />
                  <p className="text-sm font-semibold text-red-900">Total Outstanding</p>
                </div>
                <p className="text-3xl font-bold text-red-700">
                  {formatCurrency(filteredSuppliers.reduce((sum, s) => sum + s.remaining_amount, 0))}
                </p>
                <p className="text-xs text-red-600 mt-1">Amount owed to suppliers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-semibold text-green-900">Amount Paid</p>
                </div>
                <p className="text-3xl font-bold text-green-700">
                  {formatCurrency(filteredSuppliers.reduce((sum, s) => sum + s.amount_paid, 0))}
                </p>
                <p className="text-xs text-green-600 mt-1">Total payments made</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <p className="text-sm font-semibold text-orange-900">Scheduled Payments</p>
                </div>
                <p className="text-3xl font-bold text-orange-700">
                  {filteredSuppliers.filter(s => s.payment_schedule?.status === 'SCHEDULED').length}
                </p>
                <p className="text-xs text-orange-600 mt-1">Upcoming payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No Results Message */}
      {filteredSuppliers.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <div className="space-y-2">
            <Package className="h-12 w-12 mx-auto text-gray-300" />
            <h3 className="text-lg font-medium text-gray-600">No suppliers found</h3>
            <p className="text-gray-500">
              {searchTerm ? `No suppliers match "${searchTerm}"` : 'Try adjusting your filters'}
            </p>
          </div>
        </Card>
      )}

      {/* Enhanced Supplier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map((supplierData) => (
          <Card key={supplierData.supplier.id} className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50/50">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                    {supplierData.supplier.name}
                  </CardTitle>
                  <div className="text-sm text-gray-600 mt-1">
                    {supplierData.supplier.contact || supplierData.supplier.email || 'No contact info'}
                  </div>
                </div>
                {getPaymentStatusBadge(supplierData.remaining_amount, supplierData.payment_schedule)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Products Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  Product Summary
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{supplierData.total_products}</div>
                    <div className="text-xs text-blue-700 font-medium">Products</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(supplierData.total_mrp - supplierData.total_cost)}
                    </div>
                    <div className="text-xs text-blue-700 font-medium">Profit Potential</div>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                  <div className="text-xs text-green-700 font-medium mb-1">Total Cost</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(supplierData.total_cost)}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-100">
                  <div className="text-xs text-orange-700 font-medium mb-1">MRP Value</div>
                  <div className="text-lg font-bold text-orange-600">
                    {formatCurrency(supplierData.total_mrp)}
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <div className="text-xs text-green-700 font-medium mb-1">Amount Paid</div>
                    <div className="text-sm font-bold text-green-600">
                      {formatCurrency(supplierData.amount_paid)}
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <div className="text-xs text-red-700 font-medium mb-1">Outstanding</div>
                    <div className="text-sm font-bold text-red-600">
                      {formatCurrency(supplierData.remaining_amount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Payment Schedule */}
              {supplierData.payment_schedule && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-blue-900">Payment Scheduled</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    <div className="font-medium">
                      {format(new Date(supplierData.payment_schedule.scheduled_date), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-xs mt-1">
                      {formatCurrency(supplierData.payment_schedule.amount)} via {supplierData.payment_schedule.payment_method}
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <Dialog open={paymentDialog && selectedSupplier?.supplier.id === supplierData.supplier.id} 
                        onOpenChange={setPaymentDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                      onClick={() => setSelectedSupplier(supplierData)}
                    >
                      💰 Pay Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Payment to {selectedSupplier?.supplier.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="amount">Payment Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="Enter amount"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="method">Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={(value: 'CASH' | 'BANK' | 'CHECK') => setPaymentMethod(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">💵 Cash</SelectItem>
                            <SelectItem value="BANK">🏦 Bank Transfer</SelectItem>
                            <SelectItem value="CHECK">📄 Check</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Payment Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(paymentDate, 'PPP')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={paymentDate}
                              onSelect={(date) => date && setPaymentDate(date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {paymentMethod === 'CHECK' && (
                        <>
                          <div>
                            <Label htmlFor="checkNumber">Check Number</Label>
                            <Input
                              id="checkNumber"
                              placeholder="Enter check number"
                              value={checkNumber}
                              onChange={(e) => setCheckNumber(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Check Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {format(checkDate, 'PPP')}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={checkDate}
                                  onSelect={(date) => date && setCheckDate(date)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </>
                      )}

                      {paymentMethod === 'BANK' && (
                        <div>
                          <Label htmlFor="bankRef">Bank Reference</Label>
                          <Input
                            id="bankRef"
                            placeholder="Enter reference number"
                            value={bankReference}
                            onChange={(e) => setBankReference(e.target.value)}
                          />
                        </div>
                      )}

                      <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Input
                          id="notes"
                          placeholder="Payment notes (optional)"
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                        />
                      </div>

                      <Button onClick={handlePayment} className="w-full">
                        Process Payment
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={scheduleDialog && selectedSupplier?.supplier.id === supplierData.supplier.id} 
                        onOpenChange={setScheduleDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all"
                      onClick={() => setSelectedSupplier(supplierData)}
                    >
                      📅 Schedule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Schedule Payment for {selectedSupplier?.supplier.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Scheduled Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(scheduleDate, 'PPP')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={scheduleDate}
                              onSelect={(date) => date && setScheduleDate(date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label htmlFor="scheduleAmount">Amount</Label>
                        <Input
                          id="scheduleAmount"
                          type="number"
                          placeholder="Enter amount"
                          value={scheduleAmount}
                          onChange={(e) => setScheduleAmount(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="scheduleFrequency">Payment Frequency</Label>
                        <Select value={scheduleFrequency} onValueChange={(value: 'once' | 'weekly' | 'monthly' | 'bi-monthly') => setScheduleFrequency(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="once">One-time Payment</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="bi-monthly">Twice Monthly (2x)</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Payment Methods</Label>
                        <div className="space-y-2 mt-2">
                          {['CASH', 'BANK', 'CHECK'].map((method) => (
                            <div key={method} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={method}
                                className="rounded border-gray-300"
                                aria-label={`Select ${method} payment method`}
                                checked={scheduleMethods.includes(method)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setScheduleMethods([...scheduleMethods, method])
                                  } else {
                                    setScheduleMethods(scheduleMethods.filter(m => m !== method))
                                  }
                                }}
                              />
                              <Label htmlFor={method} className="flex items-center gap-1">
                                {method === 'CASH' && '💵 Cash'}
                                {method === 'BANK' && '🏦 Bank Transfer'}
                                {method === 'CHECK' && '📄 Check'}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="scheduleNotes">Notes</Label>
                        <Input
                          id="scheduleNotes"
                          placeholder="Schedule notes (optional)"
                          value={scheduleNotes}
                          onChange={(e) => setScheduleNotes(e.target.value)}
                        />
                      </div>

                      <Button 
                        onClick={handleSchedulePayment} 
                        className="w-full"
                        disabled={scheduleMethods.length === 0}
                      >
                        Schedule Payment
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
