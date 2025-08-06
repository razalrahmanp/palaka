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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Advanced Supplier Management</h2>
        <div className="flex gap-2">
          <Button onClick={fetchSupplierData} variant="outline">
            🔄 Refresh Data
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-gray-50 p-4 rounded-lg">
        <div className="flex-1 w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search suppliers by name, contact, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={(value: 'all' | 'outstanding' | 'paid' | 'scheduled') => setFilterType(value)}>
            <SelectTrigger className="w-40">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-blue-500" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Total Suppliers</p>
                <p className="text-2xl font-bold">{filteredSuppliers.length}</p>
                <p className="text-xs text-gray-500">of {suppliers.length} total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Total Outstanding</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(filteredSuppliers.reduce((sum, s) => sum + s.remaining_amount, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-purple-500" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Amount Paid</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(filteredSuppliers.reduce((sum, s) => sum + s.amount_paid, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Scheduled Payments</p>
                <p className="text-2xl font-bold">
                  {filteredSuppliers.filter(s => s.payment_schedule?.status === 'SCHEDULED').length}
                </p>
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

      {/* Supplier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map((supplierData) => (
          <Card key={supplierData.supplier.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{supplierData.supplier.name}</CardTitle>
                {getPaymentStatusBadge(supplierData.remaining_amount, supplierData.payment_schedule)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Products Summary */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Products:</span>
                  <span className="font-medium ml-1">{supplierData.total_products}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-medium ml-1">{formatCurrency(supplierData.total_cost)}</span>
                </div>
                <div>
                  <span className="text-gray-600">MRP Value:</span>
                  <span className="font-medium ml-1">{formatCurrency(supplierData.total_mrp)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Profit:</span>
                  <span className="font-medium ml-1 text-green-600">
                    {formatCurrency(supplierData.total_mrp - supplierData.total_cost)}
                  </span>
                </div>
              </div>

              {/* Payment Status */}
              <div className="border-t pt-3">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="font-medium text-green-600">{formatCurrency(supplierData.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Remaining:</span>
                    <span className="font-medium text-red-600">{formatCurrency(supplierData.remaining_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Schedule */}
              {supplierData.payment_schedule && (
                <div className="border-t pt-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-600">Scheduled:</span>
                    <span className="font-medium">
                      {format(new Date(supplierData.payment_schedule.scheduled_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {formatCurrency(supplierData.payment_schedule.amount)} via {supplierData.payment_schedule.payment_method}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Dialog open={paymentDialog && selectedSupplier?.supplier.id === supplierData.supplier.id} 
                        onOpenChange={setPaymentDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      className="flex-1"
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
                      className="flex-1"
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
