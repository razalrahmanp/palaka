'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Customer, Interaction, User } from '@/types';
import { Button } from '@/components/ui/button';
import { LayoutDashboard } from 'lucide-react';
import ModernCRMDashboard from '@/components/crm/ModernCRMDashboard';

// Enhanced Sales Order interface for comprehensive customer analytics
interface SalesOrder {
  id: string;
  customer_id: string;
  quote_id?: string;
  final_price?: number;
  grand_total?: number;
  original_price?: number;
  discount_amount?: number;
  tax_amount?: number;
  taxable_amount?: number;
  bajaj_finance_amount?: number;
  freight_charges?: number;
  waived_amount?: number;
  bajaj_processing_fee_amount?: number;
  bajaj_convenience_charges?: number;
  bajaj_total_customer_payment?: number;
  bajaj_merchant_receivable?: number;
  created_at: string;
  updated_at?: string;
  expected_delivery_date?: string;
  address?: string;
  notes?: string;
  status?: string;
  po_created?: boolean;
  emi_enabled?: boolean;
  emi_plan?: '10/2' | '6/0';
  emi_monthly?: number;
  delivery_floor?: string;
  first_floor_awareness?: boolean;
  sales_representative_id?: string;
  created_by?: string;
  updated_by?: string;
  customer?: {
    name: string;
  };
  sales_representative?: {
    id: string;
    name: string;
    email: string;
  };
}
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import {
  PlusCircle, Edit, Trash2, MessageSquare, CalendarIcon, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronDown, ChevronRight, Package, DollarSign, MapPin, FileText
} from 'lucide-react';
import { CustomerFilters } from '@/components/crm/CustomerFilter';
import { CustomerForm } from '@/components/crm/CustomerForm';
import { InteractionLogForm } from '@/components/crm/InteractionLogForm';

export default function CrmPage() {
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'modern' | 'classic'>('modern'); // New state for view toggle
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
  const [isInteractionModalOpen, setInteractionModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | Customer['status']>('all');
  const [filterSource, setFilterSource] = useState<'all' | Customer['source']>('all');
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string | null>(null);
  
  // Date filter states
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  
  // Time period filter for customer creation analysis
  const [timePeriod, setTimePeriod] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'custom'>('all');
  
  // Sorting state - Default sort by created_at descending (newest first)
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Expanded rows state for showing sales order details
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Pagination state
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

  const { data: customers = [], isLoading: isLoadingCustomers, error: customersError } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      console.log('=== Fetching customers ===');
      const res = await fetch('/api/crm/customers');
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      console.log('Customers fetched:', data.length, 'records');
      console.log('First customer:', data[0]);
      return data;
    },
  });

  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: ['interactions'],
    queryFn: () => fetch('/api/crm/interactions').then(res => {
      if (!res.ok) throw new Error('Failed to fetch interactions');
      return res.json();
    }),
  });

  // Fetch sales orders for customer analytics using CRM-specific API
  const { data: salesOrders = [], isLoading: isLoadingSalesOrders, error: salesOrdersError } = useQuery<SalesOrder[]>({
    queryKey: ['crm-sales-orders'],
    queryFn: async () => {
      console.log('=== Fetching CRM sales orders ===');
      const res = await fetch('/api/crm/sales-orders');
      if (!res.ok) throw new Error('Failed to fetch CRM sales orders');
      const data = await res.json();
      console.log('Sales Orders fetched:', data.length, 'records');
      console.log('First sales order:', data[0]);
      return data;
    },
    staleTime: 30000, // Cache for 30 seconds
    retry: 2
  });

  // Debug effect to track data changes
  useEffect(() => {
    console.log('=== Data Status Update ===');
    console.log('Customers loaded:', customers?.length || 0);
    console.log('Sales orders loaded:', salesOrders?.length || 0);
    console.log('Customers array is valid:', Array.isArray(customers));
    console.log('Sales orders array is valid:', Array.isArray(salesOrders));
    console.log('Loading states - customers:', isLoadingCustomers, 'sales:', isLoadingSalesOrders);
    console.log('Errors - customers:', customersError?.message, 'sales:', salesOrdersError?.message);
    if (customers?.length > 0) {
      console.log('Sample customer from state:', customers[0]);
    }
    if (salesOrders?.length > 0) {
      console.log('Sample sales order from state:', salesOrders[0]);
    }
  }, [customers, salesOrders, isLoadingCustomers, isLoadingSalesOrders, customersError, salesOrdersError]);

  // Show loading/error states in UI temporarily for debugging
  if (isLoadingCustomers || isLoadingSalesOrders) {
    console.log('LOADING: customers =', isLoadingCustomers, 'sales =', isLoadingSalesOrders);
  }
  
  if (customersError || salesOrdersError) {
    console.log('ERRORS: customers =', customersError?.message, 'sales =', salesOrdersError?.message);
  }

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
    console.log('=== CRM Sales Data Calculation START ===');
    console.log('Raw customers data:', customers);
    console.log('Raw salesOrders data:', salesOrders);
    console.log('Customers count:', customers?.length || 0);
    console.log('Sales orders count:', salesOrders?.length || 0);
    console.log('Customers isArray:', Array.isArray(customers));
    console.log('SalesOrders isArray:', Array.isArray(salesOrders));
    
    if (!Array.isArray(salesOrders) || !Array.isArray(customers)) {
      console.log('Debug: Missing data or invalid arrays');
      console.log('  - salesOrders valid?', Array.isArray(salesOrders), typeof salesOrders);
      console.log('  - customers valid?', Array.isArray(customers), typeof customers);
      return {};
    }

    console.log('Debug: Processing arrays...');
    console.log('Debug: Sales Orders Count:', salesOrders.length);
    console.log('Debug: Customers Count:', customers.length);
    
    if (salesOrders.length > 0) {
      console.log('Debug: Sample Sales Order:', salesOrders[0]);
    }
    if (customers.length > 0) {
      console.log('Debug: Sample Customer:', customers[0]);
    }
    
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
      console.log(`Processing customer: ${customer.name} (${customer.id})`);
      
      const customerOrders = salesOrders.filter((order: SalesOrder) => {
        const matches = order.customer_id === customer.id;
        if (matches) {
          console.log(`  - Found order ${order.id} with value: ${order.grand_total || order.final_price}`);
        }
        return matches;
      });
      
      console.log(`Customer ${customer.name} has ${customerOrders.length} orders`);
      
      const completedOrders = customerOrders.filter((order: SalesOrder) => order.status === 'completed' || order.po_created === true);
      const pendingOrders = customerOrders.filter((order: SalesOrder) => order.status !== 'completed' && order.po_created !== true);
      
      const totalValue = customerOrders.reduce((sum: number, order: SalesOrder) => {
        const orderValue = order.grand_total || order.final_price || 0;
        console.log(`    Order ${order.id} value: ${orderValue}`);
        return sum + orderValue;
      }, 0);
      
      console.log(`Customer ${customer.name} total value: ₹${totalValue}`);
      
      // Get the most recent purchase (order created date)
      const sortedOrders = customerOrders.sort((a: SalesOrder, b: SalesOrder) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Get the latest expected delivery date from all orders
      const ordersWithDelivery = customerOrders.filter((order: SalesOrder) => order.expected_delivery_date);
      const latestDeliveryOrder = ordersWithDelivery.sort((a: SalesOrder, b: SalesOrder) => 
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
        orders: sortedOrders // Store sorted orders for detailed view
      };
    });

    console.log('Debug: Final sales data:', salesData);
    console.log('=== CRM Sales Data Calculation END ===');
    return salesData;
  }, [salesOrders, customers]);

  // Calculate time-based customer statistics (now controls ALL stats)
  const timeBasedStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let startDate: Date;
    let endDate: Date = now;
    let isAllTime = false;
    
    switch (timePeriod) {
      case 'all':
        // Show all data - no filtering
        isAllTime = true;
        startDate = new Date(2000, 0, 1); // Very old date to include all records
        endDate = new Date(2099, 11, 31); // Very future date to include all records
        break;
      case 'daily':
        startDate = today;
        break;
      case 'weekly':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'custom':
        if (dateFrom && dateTo) {
          startDate = new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate());
          endDate = new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59);
        } else {
          // Default to today if custom dates not set
          startDate = today;
        }
        break;
      default:
        startDate = today;
    }
    
    // Filter customers created in the period (or all if 'all' selected)
    const periodCustomers = isAllTime ? customers : customers.filter(c => {
      const customerDate = new Date(c.created_at || '');
      return customerDate >= startDate && customerDate <= endDate;
    });
    
    // Filter customers with purchases in the period (or all if 'all' selected)
    const customersWithPurchases = isAllTime ? 
      customers.filter(c => customerSalesData[c.id]?.salesCount > 0) :
      customers.filter(c => {
        const customerSales = customerSalesData[c.id];
        if (!customerSales?.salesCount) return false;
        
        // Check if any purchase was made in the period
        return customerSales.orders?.some((order: SalesOrder) => {
          const orderDate = new Date(order.created_at);
          return orderDate >= startDate && orderDate <= endDate;
        });
      });
    
    // Calculate purchase values for the period (or all if 'all' selected)
    const periodSalesOrders = isAllTime ? salesOrders : salesOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= startDate && orderDate <= endDate;
    });
    
    const totalPurchaseValue = periodSalesOrders.reduce(
      (sum, order) => sum + (order.final_price || order.grand_total || 0), 0
    );
    
    // Calculate interactions in the period (or all if 'all' selected)
    const periodInteractions = isAllTime ? interactions : interactions.filter(interaction => {
      const interactionDate = new Date(interaction.interaction_date || '');
      return interactionDate >= startDate && interactionDate <= endDate;
    });
    
    return {
      periodCustomers: periodCustomers.length,
      totalCustomersWithPurchases: customersWithPurchases.length,
      periodPurchases: periodSalesOrders.length,
      totalPurchaseValue,
      periodInteractions: periodInteractions.length,
      purchaseRate: periodCustomers.length > 0 ? (customersWithPurchases.length / periodCustomers.length) * 100 : 0,
      avgOrderValue: periodSalesOrders.length > 0 ? totalPurchaseValue / periodSalesOrders.length : 0,
      startDate,
      endDate,
      isAllTime
    };
  }, [customers, customerSalesData, salesOrders, interactions, timePeriod, dateFrom, dateTo]);

  // Helper function to get period display text
  const getPeriodDisplayText = () => {
    switch (timePeriod) {
      case 'all':
        return 'All Time';
      case 'daily':
        return 'Today';
      case 'weekly':
        return 'This Week';
      case 'monthly':
        return 'This Month';
      case 'custom':
        if (dateFrom && dateTo) {
          return `${format(dateFrom, "MMM dd")} - ${format(dateTo, "MMM dd, yyyy")}`;
        }
        return 'Custom Period';
      default:
        return 'Period';
    }
  };

  // Function to toggle row expansion
  const toggleRowExpansion = (customerId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(customerId)) {
      newExpandedRows.delete(customerId);
    } else {
      newExpandedRows.add(customerId);
    }
    setExpandedRows(newExpandedRows);
  };

  // Function to get customer sales orders
  const getCustomerSalesOrders = (customerId: string): SalesOrder[] => {
    return customerSalesData[customerId]?.orders || [];
  };

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return customers.filter(c => {
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchesSource = filterSource === 'all' || c.source === filterSource;
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q);
      const matchesSalesperson =
        !isAdmin || !selectedSalespersonId || c.created_by === selectedSalespersonId;
      
      // Date filtering based on customer creation date
      let matchesDateRange = true;
      if (dateFrom || dateTo) {
        const customerDate = c.created_at ? new Date(c.created_at) : null;
        if (customerDate) {
          if (dateFrom && dateTo) {
            // Both dates provided - customer date should be between them
            const fromDate = new Date(dateFrom);
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999); // Include the entire end date
            matchesDateRange = customerDate >= fromDate && customerDate <= toDate;
          } else if (dateFrom) {
            // Only from date provided
            const fromDate = new Date(dateFrom);
            matchesDateRange = customerDate >= fromDate;
          } else if (dateTo) {
            // Only to date provided
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999); // Include the entire end date
            matchesDateRange = customerDate <= toDate;
          }
        } else {
          // No customer creation date - exclude from filtered results
          matchesDateRange = false;
        }
      }
      
      return matchesStatus && matchesSource && matchesSearch && matchesSalesperson && matchesDateRange;
    });
  }, [customers, filterStatus, filterSource, searchQuery, selectedSalespersonId, isAdmin, dateFrom, dateTo]);

  // Sorting function
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Apply sorting to filtered customers
  const sortedCustomers = useMemo(() => {
    // Always apply sorting - default to created_at desc if no sortField
    const fieldToSort = sortField || 'created_at';
    const directionToSort = sortField ? sortDirection : 'desc';

    return [...filteredCustomers].sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (fieldToSort) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'phone':
          aValue = a.phone || '';
          bValue = b.phone || '';
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'source':
          aValue = a.source;
          bValue = b.source;
          break;
        case 'tags':
          aValue = a.tags?.join(', ').toLowerCase() || '';
          bValue = b.tags?.join(', ').toLowerCase() || '';
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
        case 'purchaseDate':
          aValue = customerSalesData[a.id]?.lastPurchaseDate ? new Date(customerSalesData[a.id].lastPurchaseDate!) : new Date(0);
          bValue = customerSalesData[b.id]?.lastPurchaseDate ? new Date(customerSalesData[b.id].lastPurchaseDate!) : new Date(0);
          break;
        case 'deliveryDate':
          aValue = customerSalesData[a.id]?.lastDeliveryDate ? new Date(customerSalesData[a.id].lastDeliveryDate!) : new Date(0);
          bValue = customerSalesData[b.id]?.lastDeliveryDate ? new Date(customerSalesData[b.id].lastDeliveryDate!) : new Date(0);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return directionToSort === 'asc' ? -1 : 1;
      if (aValue > bValue) return directionToSort === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredCustomers, sortField, sortDirection, customerSalesData]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage);
  const paginatedCustomers = sortedCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Sortable header component
  const SortableHeader = ({ field, children, className = "" }: { field: string, children: React.ReactNode, className?: string }) => (
    <TableHead 
      className={`font-semibold text-gray-700 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${className} select-none`}
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
            <ArrowUpDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          )}
        </div>
      </div>
    </TableHead>
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterSource, searchQuery, selectedSalespersonId]);

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

  return (
    <>
      {/* View Toggle at the Top */}
      {viewMode === 'modern' ? (
        <ModernCRMDashboard />
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 space-y-8">
          {/* Header Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Customer Relationship Management
                </h1>
                <p className="text-gray-600 mt-2">Manage customer relationships and track interactions</p>
              </div>
              <div className="flex gap-3">
                {/* View Mode Toggle */}
                <Button 
                  onClick={() => setViewMode('modern')}
                  variant="outline"
                  className="px-4 py-2 rounded-xl border-2 hover:border-purple-500 transition-all"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Modern Dashboard
                </Button>
                
                <Button 
                  onClick={() => { setSelectedCustomer(null); setCustomerModalOpen(true); }}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <PlusCircle className="mr-2 h-5 w-5" /> Add Customer
                </Button>
              </div>
            </div>
          </div>

      {/* Enhanced Summary Cards */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Period Filter (Controls All Stats)</label>
          <Select value={timePeriod} onValueChange={(value: 'all' | 'daily' | 'weekly' | 'monthly' | 'custom') => setTimePeriod(value)}>
            <SelectTrigger className="w-full sm:w-[180px] border-gray-200 hover:border-purple-500">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="daily">Today</SelectItem>
              <SelectItem value="weekly">This Week</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Custom Date Range Pickers */}
        {timePeriod === 'custom' && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-[200px] justify-start text-left font-normal border-gray-200 hover:border-purple-500"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-[200px] justify-start text-left font-normal border-gray-200 hover:border-purple-500"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {getPeriodDisplayText()} Customers
                </p>
                <p className="text-2xl font-bold text-gray-900">{timeBasedStats.periodCustomers}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <PlusCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-blue-600 font-medium">{customers.length}</span>
              <span className="text-gray-600 ml-1">total customers</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {getPeriodDisplayText()} Purchases
                </p>
                <p className="text-2xl font-bold text-gray-900">{timeBasedStats.totalCustomersWithPurchases}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">{Math.round(timeBasedStats.purchaseRate)}%</span>
              <span className="text-gray-600 ml-1">of period customers</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {getPeriodDisplayText()} Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{timeBasedStats.totalPurchaseValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-purple-600 font-medium">
                ₹{timeBasedStats.avgOrderValue > 0 ? Math.round(timeBasedStats.avgOrderValue).toLocaleString('en-IN') : 0}
              </span>
              <span className="text-gray-600 ml-1">avg order value</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {getPeriodDisplayText()} Interactions
                </p>
                <p className="text-2xl font-bold text-gray-900">{timeBasedStats.periodInteractions}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-orange-600 font-medium">{timeBasedStats.periodPurchases}</span>
              <span className="text-gray-600 ml-1">orders in period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className={`flex gap-6 items-start ${isAdmin ? 'lg:flex-row' : 'flex-col'}`}>
        <div className={isAdmin ? 'flex-1 lg:w-3/4' : 'w-full'}>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-xl border-b border-purple-100/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">Customer Database</CardTitle>
                  <CardDescription className="text-gray-600">
                    Manage customer relationships and track engagement history
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="🔍 Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl"
                  />
                </div>
                
                {/* Date Range Filter */}
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[140px] justify-start text-left font-normal border-gray-200 hover:border-purple-500"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "MMM dd") : "From Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[140px] justify-start text-left font-normal border-gray-200 hover:border-purple-500"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "MMM dd") : "To Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {(dateFrom || dateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDateFrom(undefined);
                        setDateTo(undefined);
                      }}
                      className="h-10 px-3 text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear Dates
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-2 items-center">
                  <CustomerFilters
                    filterStatus={filterStatus}
                    onFilterStatusChange={setFilterStatus}
                    filterSource={filterSource}
                    onFilterSourceChange={setFilterSource}
                  />
                </div>
              </div>

              {/* Enhanced Active Filters Display */}
              {(searchQuery || filterStatus !== 'all' || filterSource !== 'all' || dateFrom || dateTo || selectedSalespersonId || sortField) && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-100">
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">Active Filters:</span>
                      <div className="h-4 w-0.5 bg-gray-300"></div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {searchQuery && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1 rounded-full font-medium shadow-sm">
                          <span className="text-xs mr-1">🔍</span>
                          Search: &quot;{searchQuery}&quot;
                        </Badge>
                      )}
                      {filterStatus !== 'all' && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 px-3 py-1 rounded-full font-medium shadow-sm">
                          <span className="text-xs mr-1">📊</span>
                          Status: {filterStatus}
                        </Badge>
                      )}
                      {filterSource !== 'all' && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 px-3 py-1 rounded-full font-medium shadow-sm">
                          <span className="text-xs mr-1">📍</span>
                          Source: {filterSource}
                        </Badge>
                      )}
                      {(dateFrom || dateTo) && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 px-3 py-1 rounded-full font-medium shadow-sm">
                          <span className="text-xs mr-1">📅</span>
                          Date: {dateFrom ? format(dateFrom, "MMM dd") : "Start"} - {dateTo ? format(dateTo, "MMM dd") : "End"}
                        </Badge>
                      )}
                      {selectedSalespersonId && (
                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 border-indigo-200 px-3 py-1 rounded-full font-medium shadow-sm">
                          <span className="text-xs mr-1">👤</span>
                          Salesperson
                        </Badge>
                      )}
                      {sortField && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200 px-3 py-1 rounded-full font-medium shadow-sm">
                          <span className="text-xs mr-1">↕️</span>
                          Sort: {sortField} ({sortDirection})
                        </Badge>
                      )}
                    </div>
                    
                    <div className="ml-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchQuery('');
                          setFilterStatus('all');
                          setFilterSource('all');
                          setDateFrom(undefined);
                          setDateTo(undefined);
                          setSelectedSalespersonId(null);
                          setSortField('created_at');
                          setSortDirection('desc');
                          setCurrentPage(1);
                        }}
                        className="h-8 px-3 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors border border-gray-200 hover:border-red-200 rounded-full"
                      >
                        <X className="mr-1 h-3 w-3" />
                        Clear All
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-purple-100/50">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600">Results:</span>
                      <span className="font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                        {sortedCustomers.length} customers
                      </span>
                      {timeBasedStats.totalCustomersWithPurchases > 0 && (
                        <span className="font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                          {timeBasedStats.totalCustomersWithPurchases} with purchases
                        </span>
                      )}
                      {timeBasedStats.totalPurchaseValue > 0 && (
                        <span className="font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                          ₹{timeBasedStats.totalPurchaseValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} total value
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Table */}
              <div className="rounded-xl border border-gray-200 overflow-x-auto bg-white">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <TableRow className="border-gray-200">
                      <SortableHeader field="name" className="w-[25%] min-w-[200px]">Customer Info</SortableHeader>
                      <SortableHeader field="status" className="w-[8%] min-w-[80px]">Status</SortableHeader>
                      <SortableHeader field="source" className="w-[8%] min-w-[80px]">Source</SortableHeader>
                      <SortableHeader field="tags" className="w-[12%] min-w-[100px]">Tags</SortableHeader>
                      <SortableHeader field="salesCount" className="w-[8%] min-w-[80px] text-center">Sales</SortableHeader>
                      <SortableHeader field="orderValue" className="w-[10%] min-w-[90px] text-right">Value</SortableHeader>
                      <SortableHeader field="purchaseDate" className="w-[9%] min-w-[85px]">Purchase</SortableHeader>
                      <SortableHeader field="deliveryDate" className="w-[9%] min-w-[85px]">Delivery</SortableHeader>
                      <SortableHeader field="created_at" className="w-[8%] min-w-[80px]">Created</SortableHeader>
                      <TableHead className="font-semibold text-gray-700 text-right w-[3%] min-w-[60px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCustomers.map(c => (
                      <React.Fragment key={c.id}>
                        <TableRow 
                          className={`
                            transition-colors border-gray-100 
                            ${customerSalesData[c.id]?.salesCount > 0 
                              ? 'cursor-pointer hover:bg-purple-50/70 hover:shadow-sm focus-within:bg-purple-50/70' 
                              : 'hover:bg-gray-50/50'
                            }
                          `}
                          onClick={() => {
                            // Only expand if there are sales orders
                            if (customerSalesData[c.id]?.salesCount > 0) {
                              toggleRowExpansion(c.id);
                            }
                          }}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && customerSalesData[c.id]?.salesCount > 0) {
                              e.preventDefault();
                              toggleRowExpansion(c.id);
                            }
                          }}
                          tabIndex={customerSalesData[c.id]?.salesCount > 0 ? 0 : -1}
                          role={customerSalesData[c.id]?.salesCount > 0 ? "button" : undefined}
                          aria-expanded={customerSalesData[c.id]?.salesCount > 0 ? expandedRows.has(c.id) : undefined}
                          aria-label={customerSalesData[c.id]?.salesCount > 0 ? `${expandedRows.has(c.id) ? 'Collapse' : 'Expand'} sales orders for ${c.name}` : undefined}
                          title={customerSalesData[c.id]?.salesCount > 0 ? 'Click to view sales orders' : ''}
                        >
                          <TableCell className="py-3 px-2">
                            <div className="flex items-center space-x-2">
                              {/* Expand/Collapse Indicator */}
                              {customerSalesData[c.id]?.salesCount > 0 && (
                                <div className="h-6 w-6 flex items-center justify-center">
                                  {expandedRows.has(c.id) ? (
                                    <ChevronDown className="h-4 w-4 text-purple-600 transition-transform duration-200" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-500 transition-transform duration-200" />
                                  )}
                                </div>
                              )}
                              <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-gray-900 text-sm truncate">{c.name}</div>
                                <div className="text-xs text-gray-500 truncate">{c.email}</div>
                                {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
                                {c.address && <div className="text-xs text-gray-400 truncate max-w-[150px]">{c.address}</div>}
                              </div>
                            </div>
                          </TableCell>
                        <TableCell className="py-3 px-2">
                          <Badge 
                            variant={c.status === 'Active' ? 'default' : 'secondary'}
                            className={`${
                              c.status === 'Active' 
                                ? 'bg-green-100 text-green-800 border-green-200' 
                                : 'bg-gray-100 text-gray-800 border-gray-200'
                            } px-2 py-1 rounded-full font-medium text-xs`}
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {c.source}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-2">
                          <div className="flex flex-wrap gap-1 max-w-[100px]">
                            {c.tags && c.tags.length > 0 ? (
                              c.tags.slice(0, 2).map((tag: string, index: number) => (
                                <span key={index} className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 truncate max-w-[80px]">
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                            {c.tags && c.tags.length > 2 && (
                              <span className="text-xs text-gray-500">+{c.tags.length - 2}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-2 text-center">
                          <div className={`
                            inline-flex items-center justify-center w-8 h-8 text-xs font-bold text-white rounded-full
                            ${customerSalesData[c.id]?.salesCount > 0 
                              ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-sm' 
                              : 'bg-gray-300'
                            }
                          `}>
                            {customerSalesData[c.id]?.salesCount || 0}
                          </div>
                          {customerSalesData[c.id]?.hasActivePurchases && (
                            <div className="text-xs text-gray-500 mt-1">
                              {customerSalesData[c.id]?.completedOrders > 0 && (
                                <span className="text-green-600">✓{customerSalesData[c.id].completedOrders}</span>
                              )}
                              {customerSalesData[c.id]?.pendingOrders > 0 && (
                                <span className="text-orange-600 ml-1">⏳{customerSalesData[c.id].pendingOrders}</span>
                              )}
                            </div>
                          )}
                          {customerSalesData[c.id]?.salesCount > 0 && (
                            <div className="text-xs text-purple-600 mt-1 font-medium">
                              Click to expand
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-2 text-right">
                          <span className="font-semibold text-gray-900 text-sm">
                            ₹{(customerSalesData[c.id]?.totalValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                          {customerSalesData[c.id]?.avgOrderValue > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Avg: ₹{customerSalesData[c.id].avgOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-2">
                          <div className="text-xs text-gray-600">
                            {customerSalesData[c.id]?.lastPurchaseDate 
                              ? new Date(customerSalesData[c.id].lastPurchaseDate!).toLocaleDateString('en-IN', { 
                                  day: 'numeric',
                                  month: 'short'
                                })
                              : '-'
                            }
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-2">
                          <div className="text-xs text-gray-600">
                            {customerSalesData[c.id]?.lastDeliveryDate 
                              ? new Date(customerSalesData[c.id].lastDeliveryDate!).toLocaleDateString('en-IN', { 
                                  day: 'numeric',
                                  month: 'short'
                                })
                              : '-'
                            }
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-2">
                          <div className="text-xs text-gray-600">
                            {c.created_at 
                              ? new Date(c.created_at).toLocaleDateString('en-IN', { 
                                  day: 'numeric',
                                  month: 'short'
                                })
                              : '-'
                            }
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => { 
                                e.stopPropagation(); // Prevent row click
                                setSelectedCustomer(c); 
                                setInteractionModalOpen(true); 
                              }}
                              className="h-8 w-8 p-0 hover:bg-purple-100 hover:text-purple-600 transition-colors rounded-lg"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => { 
                                e.stopPropagation(); // Prevent row click
                                setSelectedCustomer(c); 
                                setCustomerModalOpen(true); 
                              }}
                              className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600 transition-colors rounded-lg"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click
                                deleteCustomer.mutate(c.id);
                              }}
                              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 transition-colors rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Sales Order Details */}
                      {expandedRows.has(c.id) && customerSalesData[c.id]?.orders.length > 0 && (
                        <TableRow className="bg-gray-50 border-gray-100">
                          <TableCell colSpan={10} className="py-4 px-6">
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Package className="h-5 w-5 text-purple-600" />
                                <h4 className="font-semibold text-gray-900">Sales Orders ({customerSalesData[c.id].salesCount})</h4>
                              </div>
                              
                              <div className="grid gap-3">
                                {getCustomerSalesOrders(c.id).slice(0, 5).map((order) => (
                                  <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                      {/* Order Info */}
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <FileText className="h-4 w-4 text-blue-600" />
                                          <span className="font-medium text-gray-900">Order #{order.id.slice(-8)}</span>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                          })}
                                        </div>
                                        <Badge 
                                          variant={order.status === 'completed' ? 'default' : 'secondary'}
                                          className={`${
                                            order.status === 'completed' || order.po_created 
                                              ? 'bg-green-100 text-green-800' 
                                              : order.status === 'pending' 
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-gray-100 text-gray-800'
                                          } text-xs`}
                                        >
                                          {order.status || 'Draft'}
                                        </Badge>
                                      </div>
                                      
                                      {/* Financial Info */}
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <DollarSign className="h-4 w-4 text-green-600" />
                                          <span className="font-medium text-gray-900">₹{(order.grand_total || order.final_price || 0).toLocaleString('en-IN')}</span>
                                        </div>
                                        {order.emi_enabled && (
                                          <div className="text-sm text-purple-600">
                                            EMI: ₹{(order.emi_monthly || 0).toLocaleString('en-IN')}/month
                                          </div>
                                        )}
                                        {(order.bajaj_finance_amount || 0) > 0 && (
                                          <div className="text-sm text-orange-600">
                                            Bajaj Finance: ₹{(order.bajaj_finance_amount || 0).toLocaleString('en-IN')}
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Delivery Info */}
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-4 w-4 text-red-600" />
                                          <span className="font-medium text-gray-900">Delivery</span>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          {order.expected_delivery_date 
                                            ? new Date(order.expected_delivery_date).toLocaleDateString('en-IN', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                              })
                                            : 'Not scheduled'
                                          }
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          Floor: {order.delivery_floor || 'Ground'}
                                        </div>
                                      </div>
                                      
                                      {/* Additional Info */}
                                      <div className="space-y-2">
                                        <div className="text-sm text-gray-600">
                                          {order.po_created && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                              PO Created
                                            </span>
                                          )}
                                        </div>
                                        {order.notes && (
                                          <div className="text-xs text-gray-500 truncate" title={order.notes}>
                                            {order.notes}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                
                                {customerSalesData[c.id].orders.length > 5 && (
                                  <div className="text-center py-2">
                                    <span className="text-sm text-gray-500">
                                      Showing 5 of {customerSalesData[c.id].orders.length} orders
                                    </span>
                                  </div>
                                )}
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                      {Math.min(currentPage * itemsPerPage, sortedCustomers.length)} of{' '}
                      {sortedCustomers.length} customers
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-8 px-3"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNumber = currentPage <= 3 
                          ? i + 1 
                          : currentPage >= totalPages - 2 
                            ? totalPages - 4 + i 
                            : currentPage - 2 + i;
                        
                        if (pageNumber < 1 || pageNumber > totalPages) return null;
                        
                        return (
                          <Button
                            key={pageNumber}
                            variant={currentPage === pageNumber ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNumber)}
                            className="h-8 w-8 p-0"
                          >
                            {pageNumber}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-8 px-3"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {sortedCustomers.length === 0 && (
                <div className="text-center py-12">
                  <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PlusCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers found</h3>
                  <p className="text-gray-500 mb-4">Get started by adding your first customer</p>
                  <Button 
                    onClick={() => { setSelectedCustomer(null); setCustomerModalOpen(true); }}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedCustomer && (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 mt-6">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl border-b border-blue-100/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900">
                        Interactions with {selectedCustomer.name}
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        Complete interaction history and communication log
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={() => setInteractionModalOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" /> Add Interaction
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <TableRow className="border-gray-200">
                        <TableHead className="font-semibold text-gray-700 py-4">Type</TableHead>
                        <TableHead className="font-semibold text-gray-700">Notes</TableHead>
                        <TableHead className="font-semibold text-gray-700">Date & Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interactions
                        .filter(i => i.customer_id === selectedCustomer.id)
                        .map(i => (
                          <TableRow key={i.id} className="hover:bg-blue-50/50 transition-colors border-gray-100">
                            <TableCell className="py-4">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                {i.type}
                              </span>
                            </TableCell>
                            <TableCell className="py-4">
                              <p className="text-gray-700 text-sm leading-relaxed">{i.notes}</p>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  {new Date(i.interaction_date || '').toLocaleDateString()}
                                </div>
                                <div className="text-gray-500">
                                  {new Date(i.interaction_date || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>

                {interactions.filter(i => i.customer_id === selectedCustomer.id).length === 0 && (
                  <div className="text-center py-12">
                    <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No interactions yet</h3>
                    <p className="text-gray-500 mb-4">Start building a relationship by logging your first interaction</p>
                    <Button 
                      onClick={() => setInteractionModalOpen(true)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" /> Log First Interaction
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

      </div>

      <Dialog open={isCustomerModalOpen} onOpenChange={o => !o && setCustomerModalOpen(false)}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl max-w-md">
          <DialogHeader className="pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
            </DialogTitle>
          </DialogHeader>
          <CustomerForm
            initialData={selectedCustomer ?? undefined}
            onSubmit={handleSaveCustomer}
            onCancel={() => setCustomerModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isInteractionModalOpen} onOpenChange={o => !o && setInteractionModalOpen(false)}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl max-w-md">
          <DialogHeader className="pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Log Interaction for {selectedCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          <InteractionLogForm
            onSubmit={handleAddInteraction}
            onCancel={() => setInteractionModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
        </div>
      )}
    </>
  );
}
