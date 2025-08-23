'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Edit, Search, Filter, RotateCcw, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

interface ApiOrder {
  id: string
  customer_id: string
  status: string
  created_at: string
  delivery_date?: string
  items_count: number
  has_returns?: boolean
  has_complaints?: boolean
  quote_id?: string
  customer?: {
    name: string
    email?: string
  } | null
  display_total?: number
  calculated_total?: number
}

interface MyOrder {
  id: string
  customer_name: string
  customer_id: string
  total_amount: number
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  created_at: string
  delivery_date?: string
  items_count: number
  has_returns?: boolean
  has_complaints?: boolean
  quote_id?: string
}

interface OrderDetail {
  id: string
  customer_name: string
  customer_contact: string
  total_amount: number
  status: string
  created_at: string
  delivery_date?: string
  items: Array<{
    id: string
    product_name: string
    quantity: number
    unit_price: number
    total_price: number
    supplier_name?: string
  }>
  quote_details?: {
    id: string
    created_at: string
    total_price: number
  }
}

interface MyOrdersSectionProps {
  userId: string
  onRefresh?: () => void
}

export function MyOrdersSection({ userId, onRefresh }: MyOrdersSectionProps) {
  const [orders, setOrders] = useState<MyOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)
  const [orderDetailOpen, setOrderDetailOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchMyOrders = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(dateFilter && { date: dateFilter }),
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/sales/representative/${userId}/orders?${params}`)
      if (response.ok) {
        const data = await response.json()
        // Transform the data to match expected interface
        const transformedOrders = (data.orders || []).map((order: ApiOrder) => ({
          ...order,
          customer_name: order.customer?.name || 'Unknown Customer',
          total_amount: order.display_total || order.calculated_total || 0
        }))
        setOrders(transformedOrders)
        setTotalPages(data.pagination?.totalPages || data.totalPages || 1)
      } else {
        toast.error('Failed to fetch orders')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Error loading orders')
    } finally {
      setLoading(false)
    }
  }, [userId, page, statusFilter, dateFilter, searchTerm])

  useEffect(() => {
    fetchMyOrders()
  }, [fetchMyOrders])

  const fetchOrderDetails = async (orderId: string) => {
    try {
      const response = await fetch(`/api/sales/representative/orders/${orderId}/details`)
      if (response.ok) {
        const data = await response.json()
        setSelectedOrder(data)
        setOrderDetailOpen(true)
      } else {
        toast.error('Failed to fetch order details')
      }
    } catch (error) {
      console.error('Error fetching order details:', error)
      toast.error('Error loading order details')
    }
  }

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/sales/representative/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        toast.success('Order status updated successfully')
        fetchMyOrders()
        onRefresh?.()
      } else {
        toast.error('Failed to update order status')
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Error updating order status')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
      confirmed: { variant: 'default' as const, label: 'Confirmed' },
      processing: { variant: 'default' as const, label: 'Processing' },
      shipped: { variant: 'default' as const, label: 'Shipped' },
      delivered: { variant: 'default' as const, label: 'Delivered' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'secondary' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const filteredOrders = (Array.isArray(orders) ? orders : []).filter(order =>
    (order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (order.id?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          My Orders
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by customer or order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-40"
          />

          <Button variant="outline" onClick={fetchMyOrders}>
            <Filter className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
        </div>

        {/* Orders Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">
                      #{order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.customer_name || 'Unknown Customer'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(order.total_amount)}
                    </TableCell>
                    <TableCell>
                      {order.items_count} items
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {order.has_returns && (
                          <Badge variant="outline" className="text-orange-600">
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Return
                          </Badge>
                        )}
                        {order.has_complaints && (
                          <Badge variant="outline" className="text-red-600">
                            Issue
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchOrderDetails(order.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(order.status === 'pending' || order.status === 'confirmed') && (
                          <Select
                            value={order.status}
                            onValueChange={(value) => handleStatusUpdate(order.id, value)}
                          >
                            <SelectTrigger className="w-28">
                              <Edit className="h-4 w-4" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}

        {/* Order Details Modal */}
        <Dialog open={orderDetailOpen} onOpenChange={setOrderDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Customer Information</h3>
                    <p><strong>Name:</strong> {selectedOrder.customer_name}</p>
                    <p><strong>Contact:</strong> {selectedOrder.customer_contact}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Order Information</h3>
                    <p><strong>Status:</strong> {getStatusBadge(selectedOrder.status)}</p>
                    <p><strong>Date:</strong> {new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                    {selectedOrder.delivery_date && (
                      <p><strong>Delivery Date:</strong> {new Date(selectedOrder.delivery_date).toLocaleDateString()}</p>
                    )}
                    <p><strong>Total:</strong> {formatCurrency(selectedOrder.total_amount)}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold mb-2">Order Items</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>{item.supplier_name || 'N/A'}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell>{formatCurrency(item.total_price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Quote Information */}
                {selectedOrder.quote_details && (
                  <div>
                    <h3 className="font-semibold mb-2">Related Quote</h3>
                    <p><strong>Quote ID:</strong> #{selectedOrder.quote_details.id.slice(0, 8)}</p>
                    <p><strong>Quote Date:</strong> {new Date(selectedOrder.quote_details.created_at).toLocaleDateString()}</p>
                    <p><strong>Quote Amount:</strong> {formatCurrency(selectedOrder.quote_details.total_price)}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
