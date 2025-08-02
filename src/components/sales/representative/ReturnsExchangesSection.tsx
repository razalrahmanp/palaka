'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RefreshCw, FileX, MessageSquare, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ReturnExchange {
  id: string
  order_id: string
  customer_name: string
  customer_id: string
  type: 'return' | 'exchange'
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'completed'
  items_count: number
  total_amount: number
  created_at: string
  processed_at?: string
  notes?: string
  return_items: Array<{
    id: string
    product_name: string
    quantity: number
    unit_price: number
    reason: string
    condition: string
  }>
}

interface ReturnsExchangesSectionProps {
  userId: string
  onRefresh?: () => void
}

export function ReturnsExchangesSection({ userId, onRefresh }: ReturnsExchangesSectionProps) {
  const [returnsExchanges, setReturnsExchanges] = useState<ReturnExchange[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<ReturnExchange | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [responseNote, setResponseNote] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchReturnsExchanges = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/sales/representative/${userId}/returns-exchanges?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReturnsExchanges(data.items || [])
        setTotalPages(data.totalPages || 1)
      } else {
        toast.error('Failed to fetch returns/exchanges')
      }
    } catch (error) {
      console.error('Error fetching returns/exchanges:', error)
      toast.error('Error loading returns/exchanges')
    } finally {
      setLoading(false)
    }
  }, [userId, page, typeFilter, statusFilter, searchTerm])

  useEffect(() => {
    fetchReturnsExchanges()
  }, [fetchReturnsExchanges])

  const handleStatusUpdate = async (itemId: string, newStatus: string, notes?: string) => {
    try {
      setActionLoading(true)
      const response = await fetch(`/api/sales/representative/returns-exchanges/${itemId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          notes: notes || responseNote 
        })
      })

      if (response.ok) {
        toast.success(`${selectedItem?.type === 'return' ? 'Return' : 'Exchange'} ${newStatus} successfully`)
        fetchReturnsExchanges()
        setDetailOpen(false)
        setResponseNote('')
        onRefresh?.()
      } else {
        toast.error('Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Error updating status')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending', icon: AlertTriangle },
      approved: { variant: 'default' as const, label: 'Approved', icon: CheckCircle },
      rejected: { variant: 'destructive' as const, label: 'Rejected', icon: FileX },
      processed: { variant: 'default' as const, label: 'Processed', icon: RefreshCw },
      completed: { variant: 'default' as const, label: 'Completed', icon: CheckCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      variant: 'secondary' as const, 
      label: status, 
      icon: AlertTriangle 
    }
    
    const IconComponent = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    return type === 'return' ? (
      <Badge variant="outline" className="text-red-600">
        <FileX className="h-3 w-3 mr-1" />
        Return
      </Badge>
    ) : (
      <Badge variant="outline" className="text-blue-600">
        <RefreshCw className="h-3 w-3 mr-1" />
        Exchange
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const filteredItems = returnsExchanges.filter(item =>
    item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.reason.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Returns & Exchanges
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Input
            placeholder="Search by customer, order ID, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="return">Returns</SelectItem>
              <SelectItem value="exchange">Exchanges</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={fetchReturnsExchanges}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Returns/Exchanges Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Loading returns & exchanges...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No returns or exchanges found
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">
                      #{item.order_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.customer_name}
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(item.type)}
                    </TableCell>
                    <TableCell>
                      {item.items_count} items
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(item.total_amount)}
                    </TableCell>
                    <TableCell className="max-w-32 truncate">
                      {item.reason}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell>
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item)
                          setDetailOpen(true)
                        }}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
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

        {/* Detail Modal */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedItem?.type === 'return' ? 'Return' : 'Exchange'} Details - #{selectedItem?.id.slice(0, 8)}
              </DialogTitle>
            </DialogHeader>
            
            {selectedItem && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Customer Information</h3>
                    <p><strong>Name:</strong> {selectedItem.customer_name}</p>
                    <p><strong>Order ID:</strong> #{selectedItem.order_id.slice(0, 8)}</p>
                    <p><strong>Type:</strong> {getTypeBadge(selectedItem.type)}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Request Information</h3>
                    <p><strong>Status:</strong> {getStatusBadge(selectedItem.status)}</p>
                    <p><strong>Date:</strong> {new Date(selectedItem.created_at).toLocaleDateString()}</p>
                    {selectedItem.processed_at && (
                      <p><strong>Processed:</strong> {new Date(selectedItem.processed_at).toLocaleDateString()}</p>
                    )}
                    <p><strong>Total Amount:</strong> {formatCurrency(selectedItem.total_amount)}</p>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <h3 className="font-semibold mb-2">Reason</h3>
                  <p className="text-gray-700">{selectedItem.reason}</p>
                  {selectedItem.notes && (
                    <div className="mt-2">
                      <p className="font-medium">Notes:</p>
                      <p className="text-gray-600">{selectedItem.notes}</p>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-semibold mb-2">Items</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedItem.return_items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.condition}</Badge>
                          </TableCell>
                          <TableCell className="max-w-32 truncate">
                            {item.reason}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Actions */}
                {selectedItem.status === 'pending' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Response Notes
                      </label>
                      <Textarea
                        value={responseNote}
                        onChange={(e) => setResponseNote(e.target.value)}
                        placeholder="Add notes about your decision..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleStatusUpdate(selectedItem.id, 'approved')}
                        disabled={actionLoading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleStatusUpdate(selectedItem.id, 'rejected')}
                        disabled={actionLoading}
                      >
                        <FileX className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {selectedItem.status === 'approved' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleStatusUpdate(selectedItem.id, 'processed')}
                      disabled={actionLoading}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Mark as Processed
                    </Button>
                  </div>
                )}

                {selectedItem.status === 'processed' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleStatusUpdate(selectedItem.id, 'completed')}
                      disabled={actionLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Completed
                    </Button>
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
