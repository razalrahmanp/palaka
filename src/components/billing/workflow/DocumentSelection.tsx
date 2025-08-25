"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Quote as QuoteIcon, ShoppingCart, Search, Calendar, User, DollarSign, FileText, ArrowRight, ArrowLeft, X, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface QuoteItem {
  id: string;
  product_id?: string;
  custom_product_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount?: number;
}

interface SalesOrderItem {
  id: string;
  product_id?: string;
  custom_product_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount?: number;
}

interface Quote {
  id: string;
  customer_id: string;
  total_price: number;
  status: string;
  created_by: string;
  created_at: string;
  customers?: {
    name: string;
    phone?: string;
  };
  users?: {
    name: string;
  };
  items?: QuoteItem[];
}

interface SalesOrder {
  id: string;
  customer_id: string;
  final_price: number;
  status: string;
  created_by: string;
  created_at: string;
  customer?: {
    name: string;
    phone?: string;
  };
  sales_representative?: {
    name: string;
  };
  items?: SalesOrderItem[];
}

interface DocumentSelectionProps {
  source: 'quote' | 'sales_order';
  quotes: Quote[];
  salesOrders: SalesOrder[];
  searchQuery: string;
  isLoading?: boolean;
  selectedQuote?: Quote | null;
  selectedSalesOrder?: SalesOrder | null;
  onSearchChange: (query: string) => void;
  onQuoteSelect: (quote: Quote) => void;
  onSalesOrderSelect: (order: SalesOrder) => void;
  onClearSelection?: () => void;
  onNext: () => void;
  onBack: () => void;
}

export function DocumentSelection({
  source,
  quotes,
  salesOrders,
  searchQuery,
  isLoading = false,
  selectedQuote,
  selectedSalesOrder,
  onSearchChange,
  onQuoteSelect, 
  onSalesOrderSelect,
  onClearSelection,
  onNext,
  onBack
}: DocumentSelectionProps) {
  const isQuoteMode = source === 'quote';
  const documents = isQuoteMode ? quotes : salesOrders;
  
  const filteredDocuments = documents.filter(doc => {
    const searchLower = searchQuery.toLowerCase();
    const customerName = isQuoteMode 
      ? (doc as Quote).customers?.name?.toLowerCase() || ''
      : (doc as SalesOrder).customer?.name?.toLowerCase() || '';
    const docId = doc.id.toLowerCase();
    
    return customerName.includes(searchLower) || docId.includes(searchLower);
  });

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('draft')) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (statusLower.includes('pending') || statusLower.includes('sent')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (statusLower.includes('approved') || statusLower.includes('confirmed')) return 'bg-green-100 text-green-800 border-green-300';
    if (statusLower.includes('rejected')) return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isQuoteMode ? (
              <QuoteIcon className="h-6 w-6 text-green-600" />
            ) : (
              <ShoppingCart className="h-6 w-6 text-purple-600" />
            )}
            <div>
              <CardTitle className="text-xl font-bold text-gray-800">
                Select {isQuoteMode ? 'Quote' : 'Sales Order'}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Choose from available {isQuoteMode ? 'quotes' : 'sales orders'} to continue billing
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm font-medium">
            {filteredDocuments.length} Available
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={`Search ${isQuoteMode ? 'quotes' : 'orders'} by customer name or ID...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-12 border-2 border-gray-200 focus:border-blue-500"
          />
        </div>

        {/* Selected Document Display */}
        {((isQuoteMode && selectedQuote) || (!isQuoteMode && selectedSalesOrder)) && (
          <div className="border-2 border-green-500 bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-800">
                    Selected {isQuoteMode ? 'Quote' : 'Sales Order'}
                  </h4>
                  <p className="text-sm text-green-700">
                    {isQuoteMode 
                      ? `Quote #${selectedQuote?.id} - ${selectedQuote?.customers?.name || 'Unknown Customer'}`
                      : `Order #${selectedSalesOrder?.id} - ${selectedSalesOrder?.customer?.name || 'Unknown Customer'}`
                    }
                  </p>
                </div>
              </div>
              {onClearSelection && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearSelection}
                  className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Documents List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading {isQuoteMode ? 'quotes' : 'sales orders'}...</span>
            </div>
          ) : filteredDocuments.length > 0 ? (
            filteredDocuments.map((doc) => {
              const isQuote = isQuoteMode;
              const customer = isQuote 
                ? (doc as Quote).customers?.name 
                : (doc as SalesOrder).customer?.name;
              const amount = isQuote 
                ? (doc as Quote).total_price 
                : (doc as SalesOrder).final_price;
              const representative = isQuote 
                ? (doc as Quote).users?.name 
                : (doc as SalesOrder).sales_representative?.name;

              // Check if this document is selected
              const isSelected = isQuote 
                ? selectedQuote?.id === doc.id
                : selectedSalesOrder?.id === doc.id;

              return (
                <Card 
                  key={doc.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] border-2 ${
                    isSelected 
                      ? 'border-green-500 bg-green-50 shadow-lg' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => {
                    if (isQuote) {
                      onQuoteSelect(doc as Quote);
                    } else {
                      onSalesOrderSelect(doc as SalesOrder);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center
                            ${isQuote ? 'bg-green-100' : 'bg-purple-100'}
                          `}>
                            {isQuote ? (
                              <QuoteIcon className="h-5 w-5 text-green-600" />
                            ) : (
                              <ShoppingCart className="h-5 w-5 text-purple-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {isQuote ? 'Quote' : 'Order'} #{doc.id}
                            </h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                <span className="truncate">{customer || 'Unknown Customer'}</span>
                              </div>
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                <span>{formatDate(doc.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Badge className={getStatusColor(doc.status)}>
                              {doc.status}
                            </Badge>
                            {representative && (
                              <span className="text-xs text-gray-500">
                                by {representative}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-gray-500" />
                            <span className="font-bold text-lg text-gray-900">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex items-center">
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {isQuoteMode ? 'quotes' : 'sales orders'} found
              </h3>
              <p className="text-gray-600">
                {searchQuery 
                  ? `No ${isQuoteMode ? 'quotes' : 'sales orders'} match your search criteria.`
                  : `There are no available ${isQuoteMode ? 'quotes' : 'sales orders'} to display.`
                }
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Navigation */}
    <div className="flex justify-between items-center mt-6">
      <Button
        variant="outline"
        onClick={onBack}
        className="flex items-center px-6 py-3 text-base"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <Button
        onClick={onNext}
        className="flex items-center px-8 py-3 text-base font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
      >
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
    </div>
  );
}
