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
import { MessageSquare, AlertTriangle, Clock, CheckCircle, XCircle, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Complaint {
  id: string
  order_id: string
  customer_name: string
  customer_id: string
  customer_contact?: string
  subject: string
  description: string
  category: 'product_quality' | 'delivery' | 'service' | 'billing' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  created_at: string
  updated_at: string
  resolved_at?: string
  assigned_to?: string
  resolution_notes?: string
  customer_satisfaction?: number
  related_products?: string[]
}

interface ComplaintsSectionProps {
  userId: string
  onRefresh?: () => void
}

export function ComplaintsSection({ userId, onRefresh }: ComplaintsSectionProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(priorityFilter !== 'all' && { priority: priorityFilter }),
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/sales/representative/${userId}/complaints?${params}`)
      if (response.ok) {
        const data = await response.json()
        setComplaints(data.complaints || [])
        setTotalPages(data.totalPages || 1)
      } else {
        toast.error('Failed to fetch complaints')
      }
    } catch (error) {
      console.error('Error fetching complaints:', error)
      toast.error('Error loading complaints')
    } finally {
      setLoading(false)
    }
  }, [userId, page, categoryFilter, statusFilter, priorityFilter, searchTerm])

  useEffect(() => {
    fetchComplaints()
  }, [fetchComplaints])

  const handleStatusUpdate = async (complaintId: string, newStatus: string, notes?: string) => {
    try {
      setActionLoading(true)
      const response = await fetch(`/api/sales/representative/complaints/${complaintId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          resolution_notes: notes || resolutionNotes 
        })
      })

      if (response.ok) {
        toast.success('Complaint status updated successfully')
        fetchComplaints()
        setDetailOpen(false)
        setResolutionNotes('')
        onRefresh?.()
      } else {
        toast.error('Failed to update complaint status')
      }
    } catch (error) {
      console.error('Error updating complaint status:', error)
      toast.error('Error updating complaint status')
    } finally {
      setActionLoading(false)
    }
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { variant: 'secondary' as const, label: 'Low', className: 'text-green-600' },
      medium: { variant: 'default' as const, label: 'Medium', className: 'text-yellow-600' },
      high: { variant: 'default' as const, label: 'High', className: 'text-orange-600' },
      urgent: { variant: 'destructive' as const, label: 'Urgent', className: 'text-red-600' }
    }

    const config = priorityConfig[priority as keyof typeof priorityConfig] || { 
      variant: 'secondary' as const, 
      label: priority, 
      className: '' 
    }
    
    return (
      <Badge variant={config.variant} className={config.className}>
        <AlertTriangle className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { variant: 'destructive' as const, label: 'Open', icon: AlertTriangle },
      in_progress: { variant: 'default' as const, label: 'In Progress', icon: Clock },
      resolved: { variant: 'default' as const, label: 'Resolved', icon: CheckCircle },
      closed: { variant: 'secondary' as const, label: 'Closed', icon: XCircle }
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

  const getCategoryLabel = (category: string) => {
    const categoryLabels = {
      product_quality: 'Product Quality',
      delivery: 'Delivery',
      service: 'Service',
      billing: 'Billing',
      other: 'Other'
    }
    return categoryLabels[category as keyof typeof categoryLabels] || category
  }

  const filteredComplaints = complaints.filter(complaint =>
    complaint.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    complaint.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    complaint.order_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Customer Complaints
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Input
            placeholder="Search by customer, subject, or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="product_quality">Product Quality</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={fetchComplaints}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Complaints Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading complaints...
                  </TableCell>
                </TableRow>
              ) : filteredComplaints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No complaints found
                  </TableCell>
                </TableRow>
              ) : (
                filteredComplaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-mono text-sm">
                      #{complaint.order_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {complaint.customer_name}
                    </TableCell>
                    <TableCell className="max-w-48 truncate">
                      {complaint.subject}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCategoryLabel(complaint.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(complaint.priority)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(complaint.status)}
                    </TableCell>
                    <TableCell>
                      {new Date(complaint.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedComplaint(complaint)
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

        {/* Complaint Detail Modal */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Complaint Details - #{selectedComplaint?.id.slice(0, 8)}
              </DialogTitle>
            </DialogHeader>
            
            {selectedComplaint && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Customer Information</h3>
                    <p><strong>Name:</strong> {selectedComplaint.customer_name}</p>
                    <p><strong>Contact:</strong> {selectedComplaint.customer_contact || 'N/A'}</p>
                    <p><strong>Order ID:</strong> #{selectedComplaint.order_id.slice(0, 8)}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Complaint Information</h3>
                    <p><strong>Category:</strong> {getCategoryLabel(selectedComplaint.category)}</p>
                    <p><strong>Priority:</strong> {getPriorityBadge(selectedComplaint.priority)}</p>
                    <p><strong>Status:</strong> {getStatusBadge(selectedComplaint.status)}</p>
                    <p><strong>Date:</strong> {new Date(selectedComplaint.created_at).toLocaleDateString()}</p>
                    {selectedComplaint.resolved_at && (
                      <p><strong>Resolved:</strong> {new Date(selectedComplaint.resolved_at).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>

                {/* Subject and Description */}
                <div>
                  <h3 className="font-semibold mb-2">Subject</h3>
                  <p className="text-gray-700 font-medium">{selectedComplaint.subject}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedComplaint.description}</p>
                  </div>
                </div>

                {/* Related Products */}
                {selectedComplaint.related_products && selectedComplaint.related_products.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Related Products</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedComplaint.related_products.map((product, index) => (
                        <Badge key={index} variant="outline">{product}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution Notes */}
                {selectedComplaint.resolution_notes && (
                  <div>
                    <h3 className="font-semibold mb-2">Resolution Notes</h3>
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <p className="text-green-800">{selectedComplaint.resolution_notes}</p>
                    </div>
                  </div>
                )}

                {/* Customer Satisfaction */}
                {selectedComplaint.customer_satisfaction && (
                  <div>
                    <h3 className="font-semibold mb-2">Customer Satisfaction Rating</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-green-600">
                        {selectedComplaint.customer_satisfaction}/5
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-xl ${
                              star <= selectedComplaint.customer_satisfaction!
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {selectedComplaint.status !== 'closed' && (
                  <div className="space-y-4">
                    {(selectedComplaint.status === 'open' || selectedComplaint.status === 'in_progress') && (
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Resolution Notes
                        </label>
                        <Textarea
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="Enter resolution details..."
                          rows={4}
                        />
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      {selectedComplaint.status === 'open' && (
                        <Button
                          onClick={() => handleStatusUpdate(selectedComplaint.id, 'in_progress')}
                          disabled={actionLoading}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Start Working
                        </Button>
                      )}
                      
                      {selectedComplaint.status === 'in_progress' && (
                        <Button
                          onClick={() => handleStatusUpdate(selectedComplaint.id, 'resolved')}
                          disabled={actionLoading || !resolutionNotes.trim()}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Resolved
                        </Button>
                      )}
                      
                      {selectedComplaint.status === 'resolved' && (
                        <Button
                          onClick={() => handleStatusUpdate(selectedComplaint.id, 'closed')}
                          disabled={actionLoading}
                          variant="outline"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Close Complaint
                        </Button>
                      )}
                    </div>
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
