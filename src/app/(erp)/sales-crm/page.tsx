'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Customer, Interaction, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, Search, PlusCircle, Edit, Trash2, MessageSquare,
  DollarSign, Calendar, X, Package, FileText, MapPin,
  ChevronRight, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown
} from 'lucide-react';
import CustomerModal from '@/components/crm/CustomerModal';
import InteractionModal from '@/components/crm/InteractionModal';
import CustomerFilters from '@/components/crm/CustomerFilters';
import { format } from 'date-fns';

interface SalesOrder {
  id: string;
  customer_id: string;
  quote_id?: string;
  final_price?: number;
  grand_total?: number;
  original_price?: number;
  discount_amount?: number;
  tax_amount?: number;
  created_at: string;
  expected_delivery_date?: string;
  address?: string;
  notes?: string;
  status?: string;
  po_created?: boolean;
  emi_enabled?: boolean;
  emi_plan?: '10/2' | '6/0';
  emi_monthly?: number;
  delivery_floor?: string;
  ad_id?: string;
  ad_name?: string;
  bajaj_finance_amount?: number;
}

export default function SalesCRMPage() {
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [interactionModalOpen, setInteractionModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Customer['status']>('all');
  const [filterSource, setFilterSource] = useState<'all' | Customer['source']>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user: User = JSON.parse(storedUser);
        setCurrentUser(user);
        setIsAdmin(['System Administrator', 'HR Manager', 'HR'].includes(user.role));
      }
    }
  }, []);

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/crm/customers');
      if (!res.ok) throw new Error('Failed to fetch customers');
      return res.json();
    },
  });

  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: ['interactions'],
    queryFn: () => fetch('/api/crm/interactions').then(res => {
      if (!res.ok) throw new Error('Failed to fetch interactions');
      return res.json();
    }),
  });

  const { data: salesOrders = [], isLoading: isLoadingSalesOrders } = useQuery<SalesOrder[]>({
    queryKey: ['crm-sales-orders'],
    queryFn: async () => {
      const res = await fetch('/api/crm/sales-orders');
      if (!res.ok) throw new Error('Failed to fetch sales orders');
      return res.json();
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/crm/customers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete customer');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  // Calculate customer sales data
  const customerSalesData = useMemo(() => {
    if (!Array.isArray(salesOrders) || !Array.isArray(customers)) return {};

    const salesData: Record<string, {
      salesCount: number;
      totalValue: number;
      lastPurchaseDate: string | null;
      lastDeliveryDate: string | null;
      avgOrderValue: number;
      hasActivePurchases: boolean;
      completedOrders: number;
      pendingOrders: number;
      orders: SalesOrder[];
    }> = {};

    customers.forEach(customer => {
      const customerOrders = salesOrders.filter(order => order.customer_id === customer.id);
      const completedOrders = customerOrders.filter(order => order.status === 'completed' || order.po_created === true);
      const pendingOrders = customerOrders.filter(order => order.status !== 'completed' && order.po_created !== true);
      
      const totalValue = customerOrders.reduce((sum, order) => {
        return sum + (order.grand_total || order.final_price || 0);
      }, 0);
      
      const sortedOrders = customerOrders.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const ordersWithDelivery = customerOrders.filter(order => order.expected_delivery_date);
      const latestDeliveryOrder = ordersWithDelivery.sort((a, b) => 
        new Date(b.expected_delivery_date!).getTime() - new Date(a.expected_delivery_date!).getTime())[0];
      
      salesData[customer.id] = {
        salesCount: customerOrders.length,
        totalValue: totalValue,
        avgOrderValue: customerOrders.length > 0 ? totalValue / customerOrders.length : 0,
        lastPurchaseDate: sortedOrders.length > 0 ? sortedOrders[0].created_at : null,
        lastDeliveryDate: latestDeliveryOrder?.expected_delivery_date || null,
        hasActivePurchases: customerOrders.length > 0,
        completedOrders: completedOrders.length,
        pendingOrders: pendingOrders.length,
        orders: sortedOrders
      };
    });

    return salesData;
  }, [salesOrders, customers]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return customers.filter(c => {
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchesSource = filterSource === 'all' || c.source === filterSource;
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q);
      
      return matchesStatus && matchesSource && matchesSearch;
    });
  }, [customers, filterStatus, filterSource, searchQuery]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at || '');
          bValue = new Date(b.created_at || '');
          break;
        case 'salesCount':
          aValue = customerSalesData[a.id]?.salesCount || 0;
          bValue = customerSalesData[b.id]?.salesCount || 0;
          break;
        case 'orderValue':
          aValue = customerSalesData[a.id]?.totalValue || 0;
          bValue = customerSalesData[b.id]?.totalValue || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredCustomers, sortField, sortDirection, customerSalesData]);

  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage);
  const paginatedCustomers = sortedCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleRowExpansion = (customerId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(customerId)) {
      newExpandedRows.delete(customerId);
    } else {
      newExpandedRows.add(customerId);
    }
    setExpandedRows(newExpandedRows);
  };

  const SortableHeader = ({ field, children, className = "" }: { field: string, children: React.ReactNode, className?: string }) => (
    <TableHead 
      className={`font-semibold text-gray-700 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2 justify-between">
        <span>{children}</span>
        <div className="flex-shrink-0">
          {sortField === field ? (
            sortDirection === 'asc' ? 
              <ArrowUp className="h-4 w-4 text-purple-600" /> : 
              <ArrowDown className="h-4 w-4 text-purple-600" />
          ) : (
            <ArrowUpDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>
    </TableHead>
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterSource, searchQuery]);

  if (!currentUser) return null;

  const handleAddInteraction = (formData: { type: string; notes: string }) => {
    if (!selectedCustomer) return;
    fetch('/api/crm/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        interaction_date: new Date().toISOString(),
        customer_id: selectedCustomer.id,
        created_by: currentUser.id,
      }),
    }).then(() => {
      qc.invalidateQueries({ queryKey: ['interactions'] });
      setInteractionModalOpen(false);
    });
  };

  const handleSaveCustomer = async (data: { name: string; email?: string; phone?: string; company?: string; status: Customer['status']; source: Customer['source']; tags: string[] }) => {
    const isEdit = !!(selectedCustomer && selectedCustomer.id);
    const url = isEdit ? `/api/crm/customers/${selectedCustomer!.id}` : '/api/crm/customers';
    const method = isEdit ? 'PUT' : 'POST';
  
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        ...(isEdit ? {} : { created_by: currentUser.id }),
      }),
    });
    qc.invalidateQueries({ queryKey: ['customers'] });
    setCustomerModalOpen(false);
  };

  // Calculate summary stats
  const totalCustomers = customers.length;
  const customersWithPurchases = Object.values(customerSalesData).filter(data => data.salesCount > 0).length;
  const totalRevenue = Object.values(customerSalesData).reduce((sum, data) => sum + data.totalValue, 0);
  const totalOrders = salesOrders.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Sales & CRM
            </h1>
            <p className="text-gray-600 mt-2">Complete customer database with sales order tracking</p>
          </div>
          <Button 
            onClick={() => { setSelectedCustomer(null); setCustomerModalOpen(true); }}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <PlusCircle className="mr-2 h-5 w-5" /> Add Customer
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">With Purchases</p>
                <p className="text-2xl font-bold text-gray-900">{customersWithPurchases}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-xl border-b border-purple-100/50">
          <CardTitle>Customer Sales Database</CardTitle>
          <CardDescription>All customers with their complete sales order history</CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="🔍 Search by name, email, or phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="border-gray-200 focus:border-purple-500 rounded-xl"
              />
            </div>
            <CustomerFilters
              filterStatus={filterStatus}
              onFilterStatusChange={setFilterStatus}
              filterSource={filterSource}
              onFilterSourceChange={setFilterSource}
            />
          </div>

          {/* Table */}
          <div className="rounded-xl border border-gray-200 overflow-x-auto bg-white">
            <Table>
              <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                <TableRow className="border-gray-200">
                  <SortableHeader field="name" className="w-[25%]">Customer Info</SortableHeader>
                  <TableHead className="w-[10%]">Status</TableHead>
                  <SortableHeader field="salesCount" className="w-[10%] text-center">Orders</SortableHeader>
                  <SortableHeader field="orderValue" className="w-[15%] text-right">Total Value</SortableHeader>
                  <TableHead className="w-[12%]">Last Purchase</TableHead>
                  <TableHead className="w-[12%]">Next Delivery</TableHead>
                  <SortableHeader field="created_at" className="w-[10%]">Created</SortableHeader>
                  <TableHead className="text-right w-[6%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map(c => (
                  <React.Fragment key={c.id}>
                    <TableRow 
                      className={`transition-colors border-gray-100 ${
                        customerSalesData[c.id]?.salesCount > 0 
                          ? 'cursor-pointer hover:bg-purple-50/70' 
                          : 'hover:bg-gray-50/50'
                      }`}
                      onClick={() => {
                        if (customerSalesData[c.id]?.salesCount > 0) {
                          toggleRowExpansion(c.id);
                        }
                      }}
                    >
                      <TableCell className="py-3 px-2">
                        <div className="flex items-center space-x-2">
                          {customerSalesData[c.id]?.salesCount > 0 && (
                            <div className="h-6 w-6 flex items-center justify-center">
                              {expandedRows.has(c.id) ? (
                                <ChevronDown className="h-4 w-4 text-purple-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                              )}
                            </div>
                          )}
                          <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 text-sm">{c.name}</div>
                            <div className="text-xs text-gray-500">{c.email}</div>
                            {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-2">
                        <Badge 
                          variant={c.status === 'Active' ? 'default' : 'secondary'}
                          className={`${
                            c.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          } text-xs`}
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-2 text-center">
                        <div className={`inline-flex items-center justify-center w-8 h-8 text-xs font-bold text-white rounded-full ${
                          customerSalesData[c.id]?.salesCount > 0 
                            ? 'bg-gradient-to-r from-green-500 to-green-600' 
                            : 'bg-gray-300'
                        }`}>
                          {customerSalesData[c.id]?.salesCount || 0}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-2 text-right">
                        <span className="font-semibold text-gray-900">
                          ₹{(customerSalesData[c.id]?.totalValue || 0).toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-2 text-xs text-gray-600">
                        {customerSalesData[c.id]?.lastPurchaseDate 
                          ? format(new Date(customerSalesData[c.id].lastPurchaseDate!), 'MMM dd, yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="py-3 px-2 text-xs text-gray-600">
                        {customerSalesData[c.id]?.lastDeliveryDate 
                          ? format(new Date(customerSalesData[c.id].lastDeliveryDate!), 'MMM dd, yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="py-3 px-2 text-xs text-gray-600">
                        {c.created_at ? format(new Date(c.created_at), 'MMM dd') : '-'}
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => { 
                              e.stopPropagation();
                              setSelectedCustomer(c); 
                              setInteractionModalOpen(true); 
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => { 
                              e.stopPropagation();
                              setSelectedCustomer(c); 
                              setCustomerModalOpen(true); 
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCustomer.mutate(c.id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Sales Orders */}
                    {expandedRows.has(c.id) && customerSalesData[c.id]?.orders.length > 0 && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={8} className="py-4 px-6">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              <Package className="h-5 w-5 text-purple-600" />
                              Sales Orders ({customerSalesData[c.id].salesCount})
                            </h4>
                            {customerSalesData[c.id].orders.map((order) => (
                              <div key={order.id} className="bg-white rounded-lg border p-4">
                                <div className="grid grid-cols-4 gap-4">
                                  <div>
                                    <div className="text-sm font-medium">Order #{order.id.slice(-8)}</div>
                                    <div className="text-xs text-gray-500">{format(new Date(order.created_at), 'MMM dd, yyyy')}</div>
                                    <Badge className="mt-1 text-xs">{order.status || 'Draft'}</Badge>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium">₹{(order.grand_total || order.final_price || 0).toLocaleString('en-IN')}</div>
                                    {order.emi_enabled && (
                                      <div className="text-xs text-purple-600">EMI: ₹{order.emi_monthly}/mo</div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-sm">Delivery: {order.expected_delivery_date ? format(new Date(order.expected_delivery_date), 'MMM dd') : 'Not set'}</div>
                                    <div className="text-xs text-gray-500">Floor: {order.delivery_floor || 'Ground'}</div>
                                  </div>
                                  <div>
                                    {order.po_created && <Badge variant="outline" className="text-xs">PO Created</Badge>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedCustomers.length)} of {sortedCustomers.length}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CustomerModal
        open={customerModalOpen}
        onOpenChange={setCustomerModalOpen}
        onSave={handleSaveCustomer}
        customer={selectedCustomer || undefined}
      />
      <InteractionModal
        open={interactionModalOpen}
        onOpenChange={setInteractionModalOpen}
        onSave={handleAddInteraction}
      />
    </div>
  );
}
