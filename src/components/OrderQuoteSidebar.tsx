'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  ShoppingCart, 
  Calendar, 
  User, 
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

// Types
interface Quote {
  id: string;
  customer_id: string;
  status: string;
  created_at: string;
  final_price: number;
  original_price: number;
  discount_amount: number;
  freight_charges: number;
  tax_amount: number;
  grand_total: number;
  customers?: { name: string };
  users?: { name: string };
}

interface SalesOrder {
  id: string;
  quote_id?: string;
  customer_id: string;
  status: string;
  created_at: string;
  final_price: number;
  original_price: number;
  discount_amount: number;
  freight_charges: number;
  tax_amount: number;
  grand_total: number;
  customers?: { name: string };
  users?: { name: string };
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

  // Fetch quotes
  const fetchQuotes = async () => {
    try {
      setLoading(true);
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
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get customer name
  const getCustomerName = (item: Quote | SalesOrder) => {
    if (item.customers) {
      return Array.isArray(item.customers) ? item.customers[0]?.name : item.customers.name;
    }
    return 'Unknown Customer';
  };

  // Get created by name
  const getCreatedByName = (item: Quote | SalesOrder) => {
    if (item.users) {
      return Array.isArray(item.users) ? item.users[0]?.name : item.users.name;
    }
    return 'Unknown User';
  };

  return (
    <Card className={`w-80 h-full flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {showQuotes ? 'Recent Quotes' : 'Recent Orders'}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Label htmlFor="view-switch" className="text-sm">
              {showQuotes ? <FileText className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
            </Label>
            <Switch
              id="view-switch"
              checked={!showQuotes}
              onCheckedChange={(checked) => setShowQuotes(!checked)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{showQuotes ? quotes.length : orders.length} items</span>
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
              {(showQuotes ? quotes : orders).map((item) => (
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
                        <span className="truncate">{getCustomerName(item)}</span>
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

                      {/* Date and Created By */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                        <span className="truncate ml-2">{getCreatedByName(item)}</span>
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
              ))}

              {(showQuotes ? quotes : orders).length === 0 && !loading && (
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
