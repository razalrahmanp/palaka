'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Phone, Mail, MapPin, Calendar, ShoppingCart, Star } from 'lucide-react'
import { toast } from 'sonner'

interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  customer_type: 'individual' | 'business'
  status: 'active' | 'inactive'
  created_at: string
  last_order_date?: string
  total_orders: number
  total_spent: number
  average_order_value: number
  preferred_categories?: string[]
  assigned_sales_rep: string
  satisfaction_rating?: number
  notes?: string
}

interface CustomerInteraction {
  id: string
  type: 'call' | 'email' | 'meeting' | 'quote' | 'order' | 'complaint'
  description: string
  date: string
  outcome?: string
}

interface MyCustomersSectionProps {
  userId: string
  onRefresh?: () => void
}

export function MyCustomersSection({ userId }: Omit<MyCustomersSectionProps, 'onRefresh'>) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerInteractions, setCustomerInteractions] = useState<CustomerInteraction[]>([])
  const [detailOpen, setDetailOpen] = useState(false)
  const [interactionsLoading, setInteractionsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/sales/representative/${userId}/customers?${params}`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
        setTotalPages(data.totalPages || 1)
      } else {
        toast.error('Failed to fetch customers')
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Error loading customers')
    } finally {
      setLoading(false)
    }
  }, [userId, page, typeFilter, statusFilter, searchTerm])

  const fetchCustomerInteractions = async (customerId: string) => {
    try {
      setInteractionsLoading(true)
      const response = await fetch(`/api/sales/representative/customers/${customerId}/interactions`)
      if (response.ok) {
        const data = await response.json()
        setCustomerInteractions(data.interactions || [])
      } else {
        toast.error('Failed to fetch customer interactions')
      }
    } catch (error) {
      console.error('Error fetching interactions:', error)
      toast.error('Error loading interactions')
    } finally {
      setInteractionsLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    setDetailOpen(true)
    fetchCustomerInteractions(customer.id)
  }

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge variant="default" className="text-green-600">
        Active
      </Badge>
    ) : (
      <Badge variant="secondary" className="text-gray-600">
        Inactive
      </Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    return type === 'business' ? (
      <Badge variant="outline" className="text-blue-600">
        Business
      </Badge>
    ) : (
      <Badge variant="outline" className="text-purple-600">
        Individual
      </Badge>
    )
  }

  const getInteractionTypeBadge = (type: string) => {
    const typeConfig = {
      call: { variant: 'outline' as const, label: 'Call', className: 'text-blue-600' },
      email: { variant: 'outline' as const, label: 'Email', className: 'text-green-600' },
      meeting: { variant: 'outline' as const, label: 'Meeting', className: 'text-purple-600' },
      quote: { variant: 'outline' as const, label: 'Quote', className: 'text-orange-600' },
      order: { variant: 'outline' as const, label: 'Order', className: 'text-indigo-600' },
      complaint: { variant: 'outline' as const, label: 'Complaint', className: 'text-red-600' }
    }

    const config = typeConfig[type as keyof typeof typeConfig] || { 
      variant: 'outline' as const, 
      label: type, 
      className: 'text-gray-600' 
    }

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          My Customers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Customer Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={fetchCustomers}>
            <Users className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Customers Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Avg Order</TableHead>
                <TableHead>Last Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Loading customers...
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        {customer.email && (
                          <p className="text-sm text-gray-500">{customer.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </div>
                        )}
                        {customer.city && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="h-3 w-3" />
                            {customer.city}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(customer.customer_type)}
                    </TableCell>
                    <TableCell className="text-center">
                      {customer.total_orders}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(customer.total_spent)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(customer.average_order_value)}
                    </TableCell>
                    <TableCell>
                      {customer.last_order_date ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(customer.last_order_date).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-gray-500">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(customer.status)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCustomerSelect(customer)}
                      >
                        <Users className="h-4 w-4" />
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

        {/* Customer Detail Modal */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Customer Details - {selectedCustomer?.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedCustomer && (
              <div className="space-y-6">
                {/* Customer Information */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Contact Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span>{selectedCustomer.email || 'No email'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{selectedCustomer.phone || 'No phone'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          {selectedCustomer.address && (
                            <p>{selectedCustomer.address}</p>
                          )}
                          {(selectedCustomer.city || selectedCustomer.state || selectedCustomer.postal_code) && (
                            <p className="text-sm text-gray-600">
                              {[selectedCustomer.city, selectedCustomer.state, selectedCustomer.postal_code]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Customer Details</h3>
                    <div className="space-y-2">
                      <p><strong>Type:</strong> {getTypeBadge(selectedCustomer.customer_type)}</p>
                      <p><strong>Status:</strong> {getStatusBadge(selectedCustomer.status)}</p>
                      <p><strong>Customer Since:</strong> {new Date(selectedCustomer.created_at).toLocaleDateString()}</p>
                      {selectedCustomer.satisfaction_rating && (
                        <div className="flex items-center gap-2">
                          <strong>Satisfaction:</strong>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-400" />
                            <span>{selectedCustomer.satisfaction_rating}/5</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Purchase Statistics */}
                <div>
                  <h3 className="font-semibold mb-3">Purchase Statistics</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold">Total Orders</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{selectedCustomer.total_orders}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="font-semibold">Total Spent</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(selectedCustomer.total_spent)}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="font-semibold">Avg Order</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(selectedCustomer.average_order_value)}
                      </p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Calendar className="h-5 w-5 text-orange-600" />
                        <span className="font-semibold">Last Order</span>
                      </div>
                      <p className="text-sm font-bold text-orange-600">
                        {selectedCustomer.last_order_date
                          ? new Date(selectedCustomer.last_order_date).toLocaleDateString()
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preferred Categories */}
                {selectedCustomer.preferred_categories && selectedCustomer.preferred_categories.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Preferred Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCustomer.preferred_categories.map((category, index) => (
                        <Badge key={index} variant="outline">{category}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedCustomer.notes && (
                  <div>
                    <h3 className="font-semibold mb-3">Notes</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700">{selectedCustomer.notes}</p>
                    </div>
                  </div>
                )}

                {/* Recent Interactions */}
                <div>
                  <h3 className="font-semibold mb-3">Recent Interactions</h3>
                  {interactionsLoading ? (
                    <p className="text-center py-4 text-gray-500">Loading interactions...</p>
                  ) : customerInteractions.length === 0 ? (
                    <p className="text-center py-4 text-gray-500">No interactions found</p>
                  ) : (
                    <div className="space-y-3">
                      {customerInteractions.slice(0, 5).map((interaction) => (
                        <div key={interaction.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getInteractionTypeBadge(interaction.type)}
                              <span className="text-sm text-gray-500">
                                {new Date(interaction.date).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{interaction.description}</p>
                            {interaction.outcome && (
                              <p className="text-xs text-gray-600 mt-1">
                                <strong>Outcome:</strong> {interaction.outcome}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
