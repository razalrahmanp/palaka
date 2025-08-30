'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { 
  FileText, 
  ShoppingCart, 
  Calendar, 
  User, 
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Search,
  CalendarIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

// Types
interface Quote {
  id: string;
  customer_id: string;
  customer?: string; // Direct customer name field
  status: string;
  created_at: string;
  final_price: number;
  original_price: number;
  discount_amount: number;
  freight_charges: number;
  tax_amount: number;
  grand_total: number;
  customers?: { name: string }; // Legacy field for backward compatibility
  users?: { name: string }; // Legacy field for backward compatibility
}

interface SalesOrder {
  id: string;
  quote_id?: string;
  customer_id: string;
  customer?: { name: string } | null; // API returns this as an object with name
  sales_representative?: { // API maps created_by users to this field
    id: string;
    name: string;
    email: string;
  } | null;
  status: string;
  date: string; // API returns 'date' field (formatted created_at)
  updated_at?: string;
  expected_delivery_date?: string; // API returns this field
  final_price: number;
  original_price: number;
  discount_amount: number;
  freight_charges: number;
  tax_amount: number;
  grand_total: number;
  total_paid?: number; // From payment summary
  balance_due?: number; // From payment summary
  payment_status?: string; // From payment summary
}

interface OrderQuoteSidebarProps {
  className?: string;
  onQuoteSelect?: (quote: Quote) => void;
  onOrderSelect?: (order: SalesOrder) => void;
}

const OrderQuoteSidebar: React.FC<OrderQuoteSidebarProps> = ({
  className = "",
  onQuoteSelect,
  onOrderSelect
}) => {
  const [showQuotes, setShowQuotes] = useState(true);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>();

  // Handle date range selection
  const handleDateSelect = (range: DateRange | undefined) => {
    setDateFilter(range);
  };

  // Fetch quotes
  const fetchQuotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/sales/quotes');
      if (!response.ok) throw new Error('Failed to fetch quotes');
      const data = await response.json();
      setQuotes(data.quotes || []);
    } catch (err) {
      setError('Failed to load quotes');
      console.error('Error fetching quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch sales orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/sales/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      
      setOrders(data.orders || []);
    } catch (err) {
      setError('Failed to load orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load data based on current view
  useEffect(() => {
    if (showQuotes) {
      fetchQuotes();
    } else {
      fetchOrders();
    }
  }, [showQuotes]);

  // Status badge color mapping
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: React.ReactNode }> = {
      'draft': { variant: 'outline', icon: <Clock className="w-3 h-3" /> },
      'sent': { variant: 'secondary', icon: <FileText className="w-3 h-3" /> },
      'accepted': { variant: 'default', icon: <CheckCircle className="w-3 h-3" /> },
      'rejected': { variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
      'confirmed': { variant: 'default', icon: <CheckCircle className="w-3 h-3" /> },
      'pending': { variant: 'outline', icon: <Clock className="w-3 h-3" /> },
      'processing': { variant: 'secondary', icon: <AlertCircle className="w-3 h-3" /> },
      'shipped': { variant: 'default', icon: <ShoppingCart className="w-3 h-3" /> },
      'delivered': { variant: 'default', icon: <CheckCircle className="w-3 h-3" /> },
      'cancelled': { variant: 'destructive', icon: <XCircle className="w-3 h-3" /> }
    };

    const config = statusMap[status.toLowerCase()] || { variant: 'outline' as const, icon: null };
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 text-xs">
        {config.icon}
        {status}
      </Badge>
    );
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    try {
      if (!dateString || dateString === 'null' || dateString === 'undefined') {
        return 'No Date';
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  // Get customer name
  const getCustomerName = (item: Quote | SalesOrder) => {
    // For sales orders, the API returns customer as an object with name
    if ('customer' in item && item.customer) {
      if (typeof item.customer === 'object' && item.customer.name) {
        return String(item.customer.name);
      }
      // Fallback for other formats
      if (typeof item.customer === 'string') {
        try {
          const parsed = JSON.parse(item.customer);
          return String(parsed.name || parsed);
        } catch {
          return String(item.customer);
        }
      }
      return String(item.customer);
    }
    
    // For quotes, check if customers field exists (legacy)
    if ('customers' in item && (item as Quote).customers) {
      const customers = (item as Quote).customers;
      if (Array.isArray(customers)) {
        return String(customers[0]?.name || 'Unknown');
      } else if (typeof customers === 'object') {
        return String(customers.name || 'Unknown');
      }
    }
    
    return 'Unknown Customer';
  };

  // Get created by name
  const getCreatedByName = (item: Quote | SalesOrder) => {
    // For sales orders, check sales_representative field (mapped from created_by)
    if ('sales_representative' in item && (item as SalesOrder).sales_representative) {
      const salesRep = (item as SalesOrder).sales_representative;
      if (salesRep && typeof salesRep === 'object' && salesRep.name) {
        return String(salesRep.name);
      }
    }

    // For quotes, check users field (legacy)
    if ('users' in item && (item as Quote).users) {
      const users = (item as Quote).users;
      if (Array.isArray(users)) {
        return String(users[0]?.name || 'Unknown');
      } else if (typeof users === 'object') {
        return String(users.name || 'Unknown');
      } else if (typeof users === 'string') {
        try {
          const parsed = JSON.parse(users);
          return String(parsed.name || parsed);
        } catch {
          return String(users);
        }
      }
    }
    
    return 'Unknown User';
  };

  // Filter function for search
  const filterItems = (items: (Quote | SalesOrder)[]) => {
    let filtered = items;

    // Apply text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        // Search by customer name
        const customerName = getCustomerName(item).toLowerCase();
        if (customerName.includes(query)) return true;

        // Search by created by name
        const createdByName = getCreatedByName(item).toLowerCase();
        if (createdByName.includes(query)) return true;

        // Search by date
        const dateStr = formatDate(showQuotes ? (item as Quote).created_at : (item as SalesOrder).date).toLowerCase();
        if (dateStr.includes(query)) return true;

        // Search by order/quote ID
        const idStr = item.id.toLowerCase();
        if (idStr.includes(query)) return true;

        // Search by status
        const status = item.status.toLowerCase();
        if (status.includes(query)) return true;

        // Search by amount
        const amount = (item.grand_total || item.final_price || 0).toString();
        if (amount.includes(query)) return true;

        return false;
      });
    }

    // Apply date range filter
    if (dateFilter?.from || dateFilter?.to) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(showQuotes ? (item as Quote).created_at : (item as SalesOrder).date);
        if (isNaN(itemDate.getTime())) return false;
        
        if (dateFilter.from && itemDate < dateFilter.from) return false;
        if (dateFilter.to) {
          // Set to end of day for 'to' date
          const toEndOfDay = new Date(dateFilter.to);
          toEndOfDay.setHours(23, 59, 59, 999);
          if (itemDate > toEndOfDay) return false;
        }
        
        return true;
      });
    }

    return filtered;
  };

  // Get filtered data
  const filteredData = showQuotes ? filterItems(quotes) : filterItems(orders);

  return (
    <Card className={`w-80 h-full flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          Quotes & Orders
        </CardTitle>
        
        {/* Switch for Quote/Sales Order - moved above search */}
        <div className="flex items-center justify-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <Label htmlFor="view-switch" className="text-sm font-medium">
              Quotes
            </Label>
            <Switch
              id="view-switch"
              checked={!showQuotes}
              onCheckedChange={(checked) => setShowQuotes(!checked)}
            />
            <Label htmlFor="view-switch" className="text-sm font-medium">
              Orders
            </Label>
            <ShoppingCart className="w-4 h-4 text-green-600" />
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{filteredData.length} of {showQuotes ? quotes.length : orders.length} {showQuotes ? 'quotes' : 'orders'}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => showQuotes ? fetchQuotes() : fetchOrders()}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>

      {/* Search and Date Filter - reorganized */}
      <div className="px-4 pb-3 space-y-3">
        <div className="flex gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search customer, mobile, status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Date Range Filter - moved inline with search */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className="px-3"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateFilter?.from}
                selected={dateFilter}
                onSelect={handleDateSelect}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Date Range Display and Clear */}
        {(dateFilter?.from || dateFilter?.to) && (
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            <span>
              {dateFilter?.from && dateFilter?.to ? (
                <>
                  {format(dateFilter.from, "MMM dd")} - {format(dateFilter.to, "MMM dd, yyyy")}
                </>
              ) : dateFilter?.from ? (
                `From ${format(dateFilter.from, "MMM dd, yyyy")}`
              ) : (
                'Date filter active'
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateFilter(undefined)}
              className="h-6 px-2 text-xs"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive">
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => showQuotes ? fetchQuotes() : fetchOrders()}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-3 pb-4">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer transition-all hover:shadow-md border-l-4 border-l-primary/20 hover:border-l-primary"
                  onClick={() => {
                    if (showQuotes && onQuoteSelect) {
                      onQuoteSelect(item as Quote);
                    } else if (!showQuotes && onOrderSelect) {
                      onOrderSelect(item as SalesOrder);
                    }
                  }}
                >
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {showQuotes ? (
                            <FileText className="w-4 h-4 text-blue-600" />
                          ) : (
                            <ShoppingCart className="w-4 h-4 text-green-600" />
                          )}
                          <span className="font-medium text-sm">
                            {showQuotes ? 'Quote' : 'Order'} #{item.id.slice(-8)}
                          </span>
                        </div>
                        {getStatusBadge(item.status)}
                      </div>

                      {/* Customer */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span className="truncate">{String(getCustomerName(item))}</span>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3 h-3 text-green-600" />
                        <span className="font-semibold text-sm">
                          {formatCurrency(item.grand_total || item.final_price || 0)}
                        </span>
                        {(item.discount_amount || 0) > 0 && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatCurrency(item.original_price || 0)}
                          </span>
                        )}
                      </div>

                      {/* Date Information */}
                      <div className="space-y-1">
                        {/* Created Date */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>Created: {String(formatDate(showQuotes ? (item as Quote).created_at : (item as SalesOrder).date))}</span>
                        </div>
                        
                        {/* Delivery Date (for Sales Orders only) */}
                        {!showQuotes && (item as SalesOrder).expected_delivery_date && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>Delivery: {String(formatDate((item as SalesOrder).expected_delivery_date))}</span>
                          </div>
                        )}
                        
                        {/* Created By */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span className="truncate">By: {String(getCreatedByName(item))}</span>
                        </div>
                      </div>

                      {/* Additional Details */}
                      {(item.freight_charges || 0) > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Freight: {formatCurrency(item.freight_charges)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="mb-2">
                    <Search className="w-12 h-12 mx-auto opacity-50" />
                  </div>
                  <p>No results found for &ldquo;{searchQuery}&rdquo;</p>
                  <p className="text-xs mt-1">Try adjusting your search terms</p>
                </div>
              )}

              {(showQuotes ? quotes : orders).length === 0 && !loading && !searchQuery && (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="mb-2">
                    {showQuotes ? (
                      <FileText className="w-12 h-12 mx-auto opacity-50" />
                    ) : (
                      <ShoppingCart className="w-12 h-12 mx-auto opacity-50" />
                    )}
                  </div>
                  <p>No {showQuotes ? 'quotes' : 'orders'} found</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default OrderQuoteSidebar;
