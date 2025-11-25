'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Customer, Interaction, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabaseClient';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, PlusCircle, Edit, Trash2, MessageSquare, Calendar,
  DollarSign, Package, FileText,
  ChevronRight, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown,
  TrendingUp, BarChart3, PhoneCall, Target, Activity, Search, MoreVertical, Filter, CalendarDays
} from 'lucide-react';
import { CustomerForm } from '@/components/crm/CustomerForm';
import { InteractionLogForm } from '@/components/crm/InteractionLogForm';
import { CustomerVisitDialog } from '@/components/crm/CustomerVisitDialog';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  items?: {
    id: string;
    product_id: string;
    quantity: number;
    price: number;
    name: string;
    sku?: string;
  }[];
}

export default function SalesCRMPage() {
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [interactionModalOpen, setInteractionModalOpen] = useState(false);
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'customers' | 'interactions' | 'sales' | 'analytics'>('customers');
  const [fabOpen, setFabOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [interactionTypeFilter, setInteractionTypeFilter] = useState<'all' | 'visit' | 'Call' | 'Email' | 'Meeting' | 'review_request' | 'review_given'>('all');
  
  // Date range filter states
  const [timeRange, setTimeRange] = useState<string>('today');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [calendarView, setCalendarView] = useState<'start' | 'end'>('start');
  const [dateFilterType, setDateFilterType] = useState<'visit' | 'created'>('visit');
  const [filterExpanded, setFilterExpanded] = useState(false);
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
      }
    }
  }, []);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      console.log('Fetching customers from API...');
      const res = await fetch('/api/crm/customers', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!res.ok) {
        console.error('Failed to fetch customers:', res.status, res.statusText);
        throw new Error('Failed to fetch customers');
      }
      const data = await res.json();
      console.log('Customers fetched from API:', data.length);
      return data;
    },
    staleTime: 0, // Don't cache
    gcTime: 0, // Don't keep in memory (formerly cacheTime)
    refetchOnMount: true,
  });

  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: ['interactions'],
    queryFn: () => fetch('/api/crm/interactions').then(res => {
      if (!res.ok) throw new Error('Failed to fetch interactions');
      return res.json();
    }),
  });

  const { data: salesOrders = [] } = useQuery<SalesOrder[]>({
    queryKey: ['crm-sales-orders'],
    queryFn: async () => {
      const res = await fetch('/api/crm/sales-orders');
      if (!res.ok) throw new Error('Failed to fetch sales orders');
      return res.json();
    },
  });

  // Fetch sales representatives
  const { data: salesReps = [] } = useQuery<User[]>({
    queryKey: ['sales-reps'],
    queryFn: async () => {
      const res = await fetch('/api/users?role=sales');
      if (!res.ok) throw new Error('Failed to fetch sales reps');
      return res.json();
    },
  });

  // Fetch total customer count directly from Supabase (like dashboard does)
  const { data: totalCustomerCount = 0 } = useQuery<number>({
    queryKey: ['total-customer-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Error fetching customer count:', error);
        return 0;
      }
      
      console.log('Total customer count from Supabase:', count);
      return count || 0;
    },
    staleTime: 0,
    refetchOnMount: true,
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
    
    // Calculate date range based on selection
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (customStartDate) {
      // Custom date range
      startDate = startOfDay(customStartDate);
      endDate = customEndDate ? endOfDay(customEndDate) : endOfDay(customStartDate);
    } else {
      const now = new Date();
      switch (timeRange) {
        case 'today':
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case 'week1':
        case 'week2':
        case 'week3':
        case 'week4':
          // Week-based selection
          const weekNum = parseInt(timeRange.replace('week', ''));
          const monthStart = startOfMonth(now);
          const weekStart = new Date(monthStart);
          weekStart.setDate(1 + (weekNum - 1) * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          startDate = startOfDay(weekStart);
          endDate = endOfDay(weekEnd > endOfMonth(now) ? endOfMonth(now) : weekEnd);
          break;
        default:
          // Month-based selection (e.g., 'month-0' for current month, 'month-1' for last month)
          if (timeRange.startsWith('month-')) {
            const monthOffset = parseInt(timeRange.replace('month-', ''));
            const targetDate = new Date(now);
            targetDate.setMonth(now.getMonth() - monthOffset);
            startDate = startOfMonth(targetDate);
            endDate = endOfMonth(targetDate);
          }
      }
    }

    return customers.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q);
      
      // Date range filter
      let matchesDateRange = true;
      if (startDate && endDate) {
        const dateToCheck = dateFilterType === 'visit' 
          ? (c.customer_visit_date ? new Date(c.customer_visit_date) : null)
          : new Date(c.created_at);
        
        if (dateToCheck) {
          matchesDateRange = dateToCheck >= startDate && dateToCheck <= endDate;
        } else if (dateFilterType === 'visit') {
          // If filtering by visit date and customer has no visit date, exclude them
          matchesDateRange = false;
        }
      }
      
      return matchesSearch && matchesDateRange;
    });
  }, [customers, searchQuery, timeRange, customStartDate, customEndDate, dateFilterType]);

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
  }, [searchQuery]);

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

  const handleRecordVisit = async (visitData: {
    visit_type: string;
    interest_level: string;
    notes: string;
    products_discussed?: string;
    follow_up_required: boolean;
    follow_up_date?: string;
  }) => {
    if (!selectedCustomer) return;
    
    const res = await fetch(`/api/crm/customers/${selectedCustomer.id}/visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...visitData,
        created_by: currentUser.id,
      }),
    });

    if (res.ok) {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['interactions'] });
      setVisitModalOpen(false);
      setSelectedCustomer(null);
    }
  };

  const handleSaveCustomer = async (data: { 
    name: string; 
    email?: string; 
    phone?: string; 
    company?: string; 
    status: Customer['status']; 
    source: Customer['source']; 
    tags: string[];
    assigned_sales_rep_id?: string;
  }) => {
    const isEdit = !!(selectedCustomer && selectedCustomer.id);
    const url = isEdit ? `/api/crm/customers/${selectedCustomer!.id}` : '/api/crm/customers';
    const method = isEdit ? 'PUT' : 'POST';
  
    // Remove company field and convert empty strings to null for unique fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { company, ...customerData } = data;
    
    // Convert empty strings to null/undefined to avoid unique constraint violations
    const cleanedData = {
      ...customerData,
      email: customerData.email?.trim() || undefined,
      phone: customerData.phone?.trim() || undefined,
      source: customerData.source || 'Website', // Ensure source has a value
    };
  
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...cleanedData,
        ...(isEdit ? {} : { created_by: currentUser.id }),
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Error saving customer:', error);
      alert('Failed to save customer: ' + (error.error || 'Unknown error'));
      return;
    }
    
    qc.invalidateQueries({ queryKey: ['customers'] });
    qc.invalidateQueries({ queryKey: ['total-customer-count'] });
    setCustomerModalOpen(false);
  };

  // Calculate summary stats
  const totalCustomers = totalCustomerCount; // Use count from Supabase like dashboard
  const customersWithPurchases = Object.values(customerSalesData).filter(data => data.salesCount > 0).length;
  const totalRevenue = Object.values(customerSalesData).reduce((sum, data) => sum + data.totalValue, 0);
  const totalOrders = salesOrders.length;

  console.log('Customer Stats:', {
    totalCustomers,
    totalCustomersFromArray: customers.length, // For comparison
    customersWithPurchases,
    totalRevenue,
    totalOrders
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 space-y-3">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Customer Relationship Management
          </h1>
          <p className="text-gray-600 mt-2">Manage customers, track interactions, and analyze sales performance</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
                <p className="text-xs text-gray-500">Active database</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">With Purchases</p>
                <p className="text-2xl font-bold text-gray-900">{customersWithPurchases}</p>
                <p className="text-xs text-gray-500">
                  {totalCustomers > 0 ? `${Math.round((customersWithPurchases / totalCustomers) * 100)}% conversion` : '0% conversion'}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{(totalRevenue / 100000).toFixed(1)}L
                </p>
                <p className="text-xs text-gray-500">Lifetime value</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
                <p className="text-xs text-gray-500">
                  Avg: ₹{totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(0) : '0'}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <CardContent className="p-6">
            {/* CUSTOMERS TAB */}
            <TabsContent value="customers" className="mt-0 space-y-4">
              {/* Search and Date Filter */}
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex-1 w-full">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                    />
                  </div>
                </div>

                {/* Date Filter Type Toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={dateFilterType === 'visit' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateFilterType('visit')}
                    className="text-xs"
                  >
                    Visit Date
                  </Button>
                  <Button
                    variant={dateFilterType === 'created' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateFilterType('created')}
                    className="text-xs"
                  >
                    Created Date
                  </Button>
                </div>

                {/* Date Range Selector Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTimeSelector(!showTimeSelector)}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <CalendarDays className="h-4 w-4" />
                  {customStartDate 
                    ? customEndDate
                      ? `${format(customStartDate, 'MMM d')} - ${format(customEndDate, 'MMM d')}`
                      : format(customStartDate, 'MMM d, yyyy')
                    : timeRange === 'today'
                    ? `Today (${format(new Date(), 'MMM d')})`
                    : timeRange.startsWith('week')
                    ? `Week ${timeRange.replace('week', '')}`
                    : timeRange.startsWith('month-')
                    ? format(new Date(new Date().setMonth(new Date().getMonth() - parseInt(timeRange.replace('month-', '')))), 'MMM yyyy')
                    : 'Select Date'}
                </Button>
              </div>

              {/* Floating Date Range Selector */}
              {showTimeSelector && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setShowTimeSelector(false)}>
                  <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-80 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    {!showCalendar ? (
                      <div className="p-4">
                        {/* Today */}
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">Today</h3>
                        <button
                          onClick={() => { setTimeRange('today'); setShowTimeSelector(false); setCustomStartDate(null); setCustomEndDate(null); }}
                          className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all mb-3 ${
                            timeRange === 'today' && !customStartDate
                              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          Today ({format(new Date(), 'MMM d')})
                        </button>

                        {/* Current Month Weeks */}
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">This Month Weeks</h3>
                        <div className="flex flex-col gap-2 mb-3">
                          {(() => {
                            const now = new Date();
                            const monthStart = startOfMonth(now);
                            const monthEnd = endOfMonth(now);
                            const weeks = [];
                            
                            for (let weekNum = 1; weekNum <= 4; weekNum++) {
                              const weekStart = new Date(monthStart);
                              weekStart.setDate(1 + (weekNum - 1) * 7);
                              const weekEnd = new Date(weekStart);
                              weekEnd.setDate(weekStart.getDate() + 6);
                              
                              // Don't show weeks that haven't started yet
                              if (weekStart > now) break;
                              
                              weeks.push(
                                <button
                                  key={weekNum}
                                  onClick={() => { setTimeRange(`week${weekNum}`); setShowTimeSelector(false); setCustomStartDate(null); setCustomEndDate(null); }}
                                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                    timeRange === `week${weekNum}` && !customStartDate
                                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                                      : 'hover:bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  Week {weekNum} ({format(weekStart, 'MMM d')} - {format(weekEnd > monthEnd ? monthEnd : weekEnd, 'MMM d')})
                                </button>
                              );
                            }
                            return weeks;
                          })()}
                        </div>

                        {/* Months */}
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">Months</h3>
                        <div className="flex flex-col gap-2 mb-3">
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((monthName, idx) => {
                            const now = new Date();
                            const currentMonth = now.getMonth();
                            const currentYear = now.getFullYear();
                            
                            // Calculate which year this month belongs to
                            const targetYear = idx > currentMonth ? currentYear - 1 : currentYear;
                            const targetDate = new Date(targetYear, idx, 1);
                            
                            // Only show past months and current month
                            if (targetDate > now) return null;
                            
                            const monthOffset = (currentYear - targetYear) * 12 + (currentMonth - idx);
                            
                            return (
                              <button
                                key={idx}
                                onClick={() => { setTimeRange(`month-${monthOffset}`); setShowTimeSelector(false); setCustomStartDate(null); setCustomEndDate(null); }}
                                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                  timeRange === `month-${monthOffset}` && !customStartDate
                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                                    : 'hover:bg-gray-100 text-gray-700'
                                }`}
                              >
                                {monthName} {targetYear}
                              </button>
                            );
                          }).filter(Boolean)}
                        </div>

                        {/* Custom Range */}
                        <div className="border-t border-gray-200 pt-3">
                          <button
                            onClick={() => {
                              setTempStartDate(customStartDate);
                              setTempEndDate(customEndDate);
                              setShowCalendar(true);
                            }}
                            className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                              customStartDate
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            {customStartDate 
                              ? customEndDate
                                ? `${format(customStartDate, 'MMM d')} - ${format(customEndDate, 'MMM d, yyyy')}`
                                : format(customStartDate, 'MMM d, yyyy')
                              : 'Custom Range'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <button
                            onClick={() => {
                              setShowCalendar(false);
                              setCalendarView('start');
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            ← Back
                          </button>
                          <h3 className="text-sm font-semibold text-gray-700">
                            {calendarView === 'start' ? 'Select Start Date' : 'Select End Date (Optional)'}
                          </h3>
                          {calendarView === 'end' && tempStartDate && (
                            <button
                              onClick={() => {
                                setTempEndDate(null);
                              }}
                              className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                            >
                              Skip →
                            </button>
                          )}
                          {calendarView === 'start' && <div className="w-12"></div>}
                        </div>

                        {/* Year & Month Selector */}
                        <div className="flex items-center justify-between mb-4">
                          <button
                            onClick={() => {
                              const newDate = new Date(currentMonth);
                              newDate.setMonth(newDate.getMonth() - 1);
                              setCurrentMonth(newDate);
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <div className="flex gap-2">
                            <select
                              value={currentMonth.getMonth()}
                              onChange={(e) => {
                                const newDate = new Date(currentMonth);
                                newDate.setMonth(parseInt(e.target.value));
                                setCurrentMonth(newDate);
                              }}
                              title="Select Month"
                              className="px-3 py-1 text-sm font-medium border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => (
                                <option key={idx} value={idx}>{month}</option>
                              ))}
                            </select>
                            <select
                              value={currentYear}
                              onChange={(e) => {
                                setCurrentYear(parseInt(e.target.value));
                                const newDate = new Date(currentMonth);
                                newDate.setFullYear(parseInt(e.target.value));
                                setCurrentMonth(newDate);
                              }}
                              title="Select Year"
                              className="px-3 py-1 text-sm font-medium border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={() => {
                              const newDate = new Date(currentMonth);
                              newDate.setMonth(newDate.getMonth() + 1);
                              setCurrentMonth(newDate);
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1 mb-3">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                              {day}
                            </div>
                          ))}
                          {(() => {
                            const year = currentMonth.getFullYear();
                            const month = currentMonth.getMonth();
                            const firstDay = new Date(year, month, 1).getDay();
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            const days = [];

                            // Empty cells for days before month starts
                            for (let i = 0; i < firstDay; i++) {
                              days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
                            }

                            // Days of the month
                            for (let day = 1; day <= daysInMonth; day++) {
                              const currentDate = new Date(year, month, day);
                              const isSelected = 
                                (calendarView === 'start' && tempStartDate && 
                                  format(currentDate, 'yyyy-MM-dd') === format(tempStartDate, 'yyyy-MM-dd')) ||
                                (calendarView === 'end' && tempEndDate && 
                                  format(currentDate, 'yyyy-MM-dd') === format(tempEndDate, 'yyyy-MM-dd'));
                              
                              const isInRange = tempStartDate && tempEndDate && 
                                currentDate >= tempStartDate && currentDate <= tempEndDate;

                              const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                              days.push(
                                <button
                                  key={day}
                                  onClick={() => {
                                    if (calendarView === 'start') {
                                      setTempStartDate(currentDate);
                                      setTempEndDate(null);
                                      setCalendarView('end');
                                    } else {
                                      if (tempStartDate && currentDate < tempStartDate) {
                                        setTempEndDate(tempStartDate);
                                        setTempStartDate(currentDate);
                                      } else {
                                        setTempEndDate(currentDate);
                                      }
                                    }
                                  }}
                                  className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-all ${
                                    isSelected
                                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold shadow-md'
                                      : isInRange
                                      ? 'bg-purple-100 text-purple-700'
                                      : isToday
                                      ? 'bg-blue-50 text-blue-600 font-medium'
                                      : 'hover:bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            }

                            return days;
                          })()}
                        </div>

                        {/* Selected Range Info */}
                        <div className="text-xs text-center text-gray-600 py-2 bg-gray-50 rounded-lg mb-3">
                          {!tempStartDate ? (
                            'Please select a start date'
                          ) : calendarView === 'end' && !tempEndDate ? (
                            <>
                              <div>From: {format(tempStartDate, 'MMM d, yyyy')}</div>
                              <div className="text-purple-600 mt-1">Select end date or skip for single day</div>
                            </>
                          ) : tempEndDate ? (
                            `${format(tempStartDate, 'MMM d, yyyy')} - ${format(tempEndDate, 'MMM d, yyyy')}`
                          ) : (
                            format(tempStartDate, 'MMM d, yyyy')
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setShowCalendar(false);
                              setCalendarView('start');
                              setTempStartDate(null);
                              setTempEndDate(null);
                            }}
                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium border border-gray-300 hover:bg-gray-50 text-gray-700 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (tempStartDate) {
                                setCustomStartDate(tempStartDate);
                                setCustomEndDate(tempEndDate);
                                setShowCalendar(false);
                                setShowTimeSelector(false);
                                setCalendarView('start');
                              }
                            }}
                            disabled={!tempStartDate}
                            className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                              tempStartDate
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-xl'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Table */}
              <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow className="border-b border-gray-200">
                      <SortableHeader field="name" className="w-[20%] font-semibold text-gray-700 text-center">Customer Info</SortableHeader>
                      <TableHead className="w-[8%] font-semibold text-gray-700 text-center">Status</TableHead>
                      <TableHead className="w-[12%] font-semibold text-gray-700 text-center">Sales Rep</TableHead>
                      <SortableHeader field="customer_visit_date" className="w-[12%] font-semibold text-gray-700 text-center">Last Visited</SortableHeader>
                      <SortableHeader field="salesCount" className="w-[8%] text-center font-semibold text-gray-700">Orders</SortableHeader>
                      <SortableHeader field="orderValue" className="w-[12%] text-center font-semibold text-gray-700">Total Value</SortableHeader>
                      <TableHead className="w-[14%] font-semibold text-gray-700 text-center">Delivery Date</TableHead>
                      <TableHead className="text-center w-[14%] font-semibold text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCustomers.map(c => (
                      <React.Fragment key={c.id}>
                        <TableRow 
                          className={`transition-all duration-150 border-b border-gray-100 ${
                            customerSalesData[c.id]?.salesCount > 0 
                              ? 'cursor-pointer hover:bg-blue-50/40' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            if (customerSalesData[c.id]?.salesCount > 0) {
                              toggleRowExpansion(c.id);
                            }
                          }}
                        >
                          <TableCell className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              {customerSalesData[c.id]?.salesCount > 0 && (
                                <div className="h-5 w-5 flex items-center justify-center flex-shrink-0">
                                  {expandedRows.has(c.id) ? (
                                    <ChevronDown className="h-4 w-4 text-blue-600" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                  )}
                                </div>
                              )}
                              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-sm">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-gray-900 text-sm truncate">{c.name}</div>
                                <div className="text-xs text-gray-500 truncate">{c.email}</div>
                                {c.phone && <div className="text-xs text-gray-400">{c.phone}</div>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-4">
                            <Badge 
                              variant={c.status === 'Active' ? 'default' : 'secondary'}
                              className={`${
                                c.status === 'Active' 
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                  : c.status === 'Lead'
                                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                                  : c.status === 'Churned'
                                  ? 'bg-red-100 text-red-700 border-red-200'
                                  : 'bg-gray-100 text-gray-700 border-gray-200'
                              } text-xs font-medium border`}
                            >
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-4 text-center">
                            {c.assigned_sales_rep_id ? (
                              <div className="text-sm text-gray-700">
                                {salesReps.find(rep => rep.id === c.assigned_sales_rep_id)?.name || 'Unknown'}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell className="py-4 px-4 text-center">
                            <div className="text-sm text-gray-600">
                              {c.customer_visit_date 
                                ? format(new Date(c.customer_visit_date), 'MMM dd, yyyy')
                                : <span className="text-gray-400 italic text-xs">No visits yet</span>
                              }
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-4 text-center">
                            <div className={`inline-flex items-center justify-center min-w-[2rem] h-8 px-2 text-sm font-semibold text-white rounded-md shadow-sm ${
                              customerSalesData[c.id]?.salesCount > 0 
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
                                : 'bg-gray-400'
                            }`}>
                              {customerSalesData[c.id]?.salesCount || 0}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-4 text-center">
                            <span className="font-semibold text-gray-900 text-sm">
                              ₹{(customerSalesData[c.id]?.totalValue || 0).toLocaleString('en-IN')}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 px-4 text-center">
                            <div className="text-sm text-gray-600">
                              {customerSalesData[c.id]?.lastDeliveryDate 
                                ? format(new Date(customerSalesData[c.id].lastDeliveryDate!), 'MMM dd, yyyy')
                                : <span className="text-gray-400">-</span>
                              }
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-4">
                            <div className="flex justify-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCustomer(c);
                                      setVisitModalOpen(true);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Calendar className="h-4 w-4 mr-2 text-green-600" />
                                    <span>Record Visit</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCustomer(c);
                                      setCustomerModalOpen(true);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Edit className="h-4 w-4 mr-2 text-blue-600" />
                                    <span>Edit Customer</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(`Delete customer ${c.name}?`)) {
                                        deleteCustomer.mutate(c.id);
                                      }
                                    }}
                                    className="cursor-pointer text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    <span>Delete Customer</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded Sales Orders */}
                        {expandedRows.has(c.id) && customerSalesData[c.id]?.orders.length > 0 && (
                          <TableRow className="bg-purple-50/30">
                            <TableCell colSpan={7} className="py-4 px-6">
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  <Package className="h-5 w-5 text-purple-600" />
                                  Sales Orders ({customerSalesData[c.id].salesCount})
                                </h4>
                                <div className="grid gap-3">
                                  {customerSalesData[c.id].orders.map((order) => (
                                    <div key={order.id} className="bg-white rounded-lg border border-purple-100 p-4 hover:shadow-md transition-shadow">
                                      <div className="grid grid-cols-5 gap-4">
                                        <div className="col-span-2">
                                          <div className="text-xs text-gray-500 mb-2">Order Items</div>
                                          {order.items && order.items.length > 0 ? (
                                            <div className="space-y-1">
                                              {order.items.map((item, idx) => (
                                                <div key={idx} className="text-sm">
                                                  <span className="font-medium text-gray-900">{item.name}</span>
                                                  <span className="text-gray-500"> × {item.quantity}</span>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="text-sm text-gray-400 italic">No items</div>
                                          )}
                                          <div className="text-xs text-gray-400 mt-2">{format(new Date(order.created_at), 'MMM dd, yyyy')}</div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-gray-500 mb-1">Status</div>
                                          <Badge className="text-xs">
                                            {order.po_created ? 'PO Created' : order.status || 'Draft'}
                                          </Badge>
                                        </div>
                                        <div>
                                          <div className="text-xs text-gray-500 mb-1">Amount</div>
                                          <div className="text-sm font-semibold text-green-600">
                                            ₹{(order.grand_total || order.final_price || 0).toLocaleString('en-IN')}
                                          </div>
                                          {order.emi_enabled && (
                                            <div className="text-xs text-purple-600 mt-1">EMI: ₹{order.emi_monthly}/mo</div>
                                          )}
                                        </div>
                                        <div>
                                          <div className="text-xs text-gray-500 mb-1">Delivery</div>
                                          <div className="text-sm">
                                            {order.expected_delivery_date ? format(new Date(order.expected_delivery_date), 'MMM dd, yyyy') : 'Not set'}
                                          </div>
                                          <div className="text-xs text-gray-500 mt-1">Floor: {order.delivery_floor || 'Ground'}</div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-gray-500 mb-1">Details</div>
                                          {order.ad_name && <div className="text-xs">Ad: {order.ad_name}</div>}
                                          {order.bajaj_finance_amount && (
                                            <div className="text-xs text-blue-600">Bajaj: ₹{order.bajaj_finance_amount.toLocaleString()}</div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
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
                    <div className="flex items-center px-4 text-sm">
                      Page {currentPage} of {totalPages}
                    </div>
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
            </TabsContent>

            {/* INTERACTIONS TAB */}
            <TabsContent value="interactions" className="mt-0 space-y-4">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-3">
                    <div className="text-xs font-medium text-blue-900 mb-1">Total Interactions</div>
                    <div className="text-xl font-bold text-blue-900">{interactions.length}</div>
                    <p className="text-xs text-blue-700">All time</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="p-3">
                    <div className="text-xs font-medium text-purple-900 mb-1">Customer Visits</div>
                    <div className="text-xl font-bold text-purple-900">
                      {interactions.filter(i => i.type === 'visit').length}
                    </div>
                    <p className="text-xs text-purple-700">In-person visits</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-3">
                    <div className="text-xs font-medium text-green-900 mb-1">Reviews</div>
                    <div className="text-xl font-bold text-green-900">
                      {interactions.filter(i => i.type === 'review_given').length}
                    </div>
                    <p className="text-xs text-green-700">Customer feedback</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <CardContent className="p-3">
                    <div className="text-xs font-medium text-orange-900 mb-1">This Week</div>
                    <div className="text-xl font-bold text-orange-900">
                      {interactions.filter(i => {
                        const date = new Date(i.interaction_date);
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return date >= weekAgo;
                      }).length}
                    </div>
                    <p className="text-xs text-orange-700">Last 7 days</p>
                  </CardContent>
                </Card>
              </div>

              {/* Compact Filter Section with Expand */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Filters</span>
                    <Badge variant="secondary" className="text-xs">
                      {interactionTypeFilter === 'all' ? 'All Types' : interactionTypeFilter}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilterExpanded(!filterExpanded)}
                    className="h-8"
                  >
                    {filterExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
                
                {filterExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant={interactionTypeFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setInteractionTypeFilter('all')}
                        className="h-7 text-xs"
                      >
                        All ({interactions.length})
                      </Button>
                      <Button
                        variant={interactionTypeFilter === 'visit' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setInteractionTypeFilter('visit')}
                        className="h-7 text-xs"
                      >
                        🏪 Visits ({interactions.filter(i => i.type === 'visit').length})
                      </Button>
                      <Button
                        variant={interactionTypeFilter === 'Call' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setInteractionTypeFilter('Call')}
                        className="h-7 text-xs"
                      >
                        📞 Calls ({interactions.filter(i => i.type === 'Call').length})
                      </Button>
                      <Button
                        variant={interactionTypeFilter === 'Email' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setInteractionTypeFilter('Email')}
                        className="h-7 text-xs"
                      >
                        📧 Emails ({interactions.filter(i => i.type === 'Email').length})
                      </Button>
                      <Button
                        variant={interactionTypeFilter === 'Meeting' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setInteractionTypeFilter('Meeting')}
                        className="h-7 text-xs"
                      >
                        🤝 Meetings ({interactions.filter(i => i.type === 'Meeting').length})
                      </Button>
                      <Button
                        variant={interactionTypeFilter === 'review_given' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setInteractionTypeFilter('review_given')}
                        className="h-7 text-xs"
                      >
                        ✨ Reviews ({interactions.filter(i => i.type === 'review_given').length})
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Interactions Table */}
              <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow className="border-b border-gray-200">
                      <TableHead className="w-[12%] font-semibold text-gray-700">Customer</TableHead>
                      <TableHead className="w-[10%] font-semibold text-gray-700 text-center">Type</TableHead>
                      <TableHead className="w-[12%] font-semibold text-gray-700 text-center">Date & Time</TableHead>
                      <TableHead className="w-[28%] font-semibold text-gray-700 text-center">Notes</TableHead>
                      <TableHead className="w-[12%] font-semibold text-gray-700 text-center">Contact</TableHead>
                      <TableHead className="w-[26%] font-semibold text-gray-700 text-center">Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const filteredInteractions = interactionTypeFilter === 'all' 
                        ? interactions 
                        : interactions.filter(i => i.type === interactionTypeFilter);
                      
                      return filteredInteractions && filteredInteractions.length > 0 ? (
                        filteredInteractions.map((interaction) => {
                          const customerName = interaction.customer?.name || 'Unknown Customer';
                          const customerInitial = customerName.charAt(0).toUpperCase();
                          
                          const getTypeConfig = (type: string) => {
                            switch(type) {
                              case 'visit':
                                return { icon: '🏪', color: 'from-purple-500 to-purple-600', label: 'Visit' };
                              case 'Call':
                                return { icon: '📞', color: 'from-blue-500 to-blue-600', label: 'Call' };
                              case 'Email':
                                return { icon: '📧', color: 'from-green-500 to-green-600', label: 'Email' };
                              case 'Meeting':
                                return { icon: '🤝', color: 'from-orange-500 to-orange-600', label: 'Meeting' };
                              case 'review_request':
                                return { icon: '⭐', color: 'from-yellow-500 to-yellow-600', label: 'Review Request' };
                              case 'review_given':
                                return { icon: '✨', color: 'from-pink-500 to-pink-600', label: 'Review' };
                              default:
                                return { icon: '📝', color: 'from-gray-500 to-gray-600', label: type };
                            }
                          };
                          
                          const config = getTypeConfig(interaction.type);
                          
                          return (
                            <TableRow key={interaction.id} className="hover:bg-gray-50 border-b border-gray-100">
                              <TableCell className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <div className={`h-8 w-8 bg-gradient-to-br ${config.color} rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm`}>
                                    {customerInitial}
                                  </div>
                                  <span className="font-medium text-gray-900 text-sm">{customerName}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-4 px-4 text-center">
                                <Badge variant="outline" className="text-xs">
                                  <span className="mr-1">{config.icon}</span>
                                  {config.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4 px-4 text-center">
                                <div className="text-sm text-gray-900">
                                  {format(new Date(interaction.interaction_date), 'MMM dd, yyyy')}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {format(new Date(interaction.interaction_date), 'HH:mm')}
                                </div>
                              </TableCell>
                              <TableCell className="py-4 px-4">
                                <p className="text-sm text-gray-700 line-clamp-2">{interaction.notes}</p>
                              </TableCell>
                              <TableCell className="py-4 px-4 text-center">
                                <div className="space-y-1">
                                  {interaction.customer?.phone && (
                                    <div className="text-xs text-gray-700 font-medium flex items-center justify-center gap-1">
                                      <PhoneCall className="h-3 w-3" />
                                      {interaction.customer.phone}
                                    </div>
                                  )}
                                  {interaction.customer?.email && (
                                    <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                                      📧 {interaction.customer.email}
                                    </div>
                                  )}
                                  {!interaction.customer?.phone && !interaction.customer?.email && (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-4 px-4">
                                {interaction.customer?.address ? (
                                  <p className="text-xs text-gray-700 line-clamp-2">{interaction.customer.address}</p>
                                ) : (
                                  <span className="text-xs text-gray-400 text-center block">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg text-gray-500">
                              {interactionTypeFilter === 'all' 
                                ? 'No interactions recorded yet' 
                                : `No ${interactionTypeFilter} interactions found`}
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                              {interactionTypeFilter === 'all'
                                ? 'Start tracking customer communications and visits'
                                : 'Try selecting a different filter'}
                            </p>
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* SALES ORDERS TAB */}
            <TabsContent value="sales" className="mt-0 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">All Sales Orders</h3>
                  <p className="text-sm text-gray-600">Complete order history across all customers</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 overflow-x-auto bg-white">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>EMI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesOrders && salesOrders.length > 0 ? (
                      salesOrders.map((order) => {
                        const customer = customers.find(c => c.id === order.customer_id);
                        return (
                          <TableRow key={order.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">#{order.id.slice(-8)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                  {customer?.name.charAt(0).toUpperCase() || '?'}
                                </div>
                                <span>{customer?.name || 'Unknown'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(order.created_at), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={order.po_created ? 'default' : 'secondary'}>
                                {order.po_created ? 'PO Created' : order.status || 'Draft'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              ₹{(order.grand_total || order.final_price || 0).toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-sm">
                              {order.expected_delivery_date 
                                ? format(new Date(order.expected_delivery_date), 'MMM dd, yyyy')
                                : '-'
                              }
                            </TableCell>
                            <TableCell>
                              {order.emi_enabled ? (
                                <div className="text-xs">
                                  <div className="font-semibold text-purple-600">₹{order.emi_monthly}/mo</div>
                                  <div className="text-gray-500">{order.emi_plan}</div>
                                </div>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg">No sales orders yet</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* ANALYTICS TAB */}
            <TabsContent value="analytics" className="mt-0 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Sales Analytics</h3>
                  <p className="text-sm text-gray-600">Performance metrics and insights</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Top Customers by Revenue */}
                <Card className="col-span-full lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      Top Customers by Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(customerSalesData)
                        .sort(([, a], [, b]) => b.totalValue - a.totalValue)
                        .slice(0, 10)
                        .map(([customerId, data]) => {
                          const customer = customers.find(c => c.id === customerId);
                          if (!customer) return null;
                          const percentage = totalRevenue > 0 ? (data.totalValue / totalRevenue) * 100 : 0;
                          return (
                            <div key={customerId} className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                                {customer.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm truncate">{customer.name}</span>
                                  <span className="font-semibold text-sm text-green-600 ml-2">
                                    ₹{data.totalValue.toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-gray-500">{data.salesCount} orders</span>
                                  <span className="text-xs text-gray-500">{percentage.toFixed(1)}% of total</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Segmentation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      Customer Segments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Active Customers</span>
                          <span className="text-sm font-semibold text-green-600">
                            {customers.filter(c => c.status === 'Active').length}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${(customers.filter(c => c.status === 'Active').length / totalCustomers) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">With Purchases</span>
                          <span className="text-sm font-semibold text-purple-600">
                            {customersWithPurchases}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${(customersWithPurchases / totalCustomers) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">With Pending Orders</span>
                          <span className="text-sm font-semibold text-orange-600">
                            {Object.values(customerSalesData).filter(d => d.pendingOrders > 0).length}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full"
                            style={{ 
                              width: `${(Object.values(customerSalesData).filter(d => d.pendingOrders > 0).length / totalCustomers) * 100}%` 
                            }}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <div className="text-sm text-gray-600 mb-2">Average Order Value</div>
                        <div className="text-2xl font-bold text-gray-900">
                          ₹{totalOrders > 0 ? Math.round(totalRevenue / totalOrders).toLocaleString('en-IN') : '0'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Order Status Distribution */}
                <Card className="col-span-full">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <PhoneCall className="h-5 w-5 text-green-600" />
                      Recent Activity Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                        <div className="text-sm text-green-700 mb-1">Completed Orders</div>
                        <div className="text-2xl font-bold text-green-900">
                          {salesOrders.filter(o => o.status === 'completed' || o.po_created).length}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                        <div className="text-sm text-orange-700 mb-1">Pending Orders</div>
                        <div className="text-2xl font-bold text-orange-900">
                          {salesOrders.filter(o => o.status !== 'completed' && !o.po_created).length}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                        <div className="text-sm text-purple-700 mb-1">EMI Orders</div>
                        <div className="text-2xl font-bold text-purple-900">
                          {salesOrders.filter(o => o.emi_enabled).length}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="text-sm text-blue-700 mb-1">This Month</div>
                        <div className="text-2xl font-bold text-blue-900">
                          {salesOrders.filter(o => {
                            const orderDate = new Date(o.created_at);
                            const now = new Date();
                            return orderDate.getMonth() === now.getMonth() && 
                                   orderDate.getFullYear() === now.getFullYear();
                          }).length}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Modals */}
      <Dialog open={customerModalOpen} onOpenChange={setCustomerModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  {selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  {selectedCustomer ? 'Update customer information and settings' : 'Create a new customer record in your CRM'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="pt-2">
            <CustomerForm
              initialData={selectedCustomer || undefined}
              onSubmit={handleSaveCustomer}
              onCancel={() => setCustomerModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={interactionModalOpen} onOpenChange={setInteractionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Interaction</DialogTitle>
            <DialogDescription>
              Record a new interaction with {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          <InteractionLogForm
            onSubmit={handleAddInteraction}
            onCancel={() => setInteractionModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Visit Recording Dialog */}
      <CustomerVisitDialog
        isOpen={visitModalOpen}
        onClose={() => {
          setVisitModalOpen(false);
          setSelectedCustomer(null);
        }}
        onSubmit={handleRecordVisit}
        customer={selectedCustomer}
      />

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50">
        {/* FAB Menu - Appears when fabOpen is true */}
        <div className={`absolute bottom-20 right-0 transition-all duration-300 ${fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <div className="flex flex-col gap-3">
            {/* Tab Navigation Buttons */}
            <button
              onClick={() => {
                setActiveTab('customers');
                setFabOpen(false);
              }}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transition-all hover:shadow-xl ${
                activeTab === 'customers' 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="h-5 w-5" />
              <span className="font-medium whitespace-nowrap">Customers</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab('interactions');
                setFabOpen(false);
              }}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transition-all hover:shadow-xl ${
                activeTab === 'interactions' 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="font-medium whitespace-nowrap">Interactions</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab('sales');
                setFabOpen(false);
              }}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transition-all hover:shadow-xl ${
                activeTab === 'sales' 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Target className="h-5 w-5" />
              <span className="font-medium whitespace-nowrap">Sales Orders</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab('analytics');
                setFabOpen(false);
              }}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transition-all hover:shadow-xl ${
                activeTab === 'analytics' 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="font-medium whitespace-nowrap">Analytics</span>
            </button>

            {/* Divider */}
            <div className="h-px bg-gray-200 my-1"></div>

            {/* Add Customer Button */}
            <button
              onClick={() => {
                setSelectedCustomer(null);
                setCustomerModalOpen(true);
                setFabOpen(false);
              }}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transition-all hover:shadow-xl bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
            >
              <PlusCircle className="h-5 w-5" />
              <span className="font-medium whitespace-nowrap">Add Customer</span>
            </button>
          </div>
        </div>

        {/* Main FAB Button */}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className={`h-16 w-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${
            fabOpen 
              ? 'bg-gradient-to-r from-red-500 to-red-600 rotate-45' 
              : 'bg-gradient-to-r from-purple-600 to-blue-600'
          }`}
        >
          <PlusCircle className="h-8 w-8 text-white" />
        </button>
      </div>
    </div>
  );
}