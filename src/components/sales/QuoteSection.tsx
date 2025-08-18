'use client';
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Edit, Package, Calendar, DollarSign, FileText, User, TrendingUp } from "lucide-react";
import { Quote } from "@/types";

// Helper function (assuming it's defined elsewhere, e.g., in a utils file)
const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export function QuoteSection({
  quoteSearch, setQuoteSearch,
  quoteDate, setQuoteDate,
  filteredQuotes,
  onNewQuote, onEditQuote,
}: {
  quoteSearch: string;
  setQuoteSearch: (v: string) => void;
  quoteDate: string;
  setQuoteDate: (v: string) => void;
  filteredQuotes: Quote[];
  onNewQuote: () => void;
  onEditQuote: (quote: Quote) => void;
}) {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
      <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-green-100/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Sales Quotes
            </CardTitle>
            <CardDescription className="text-gray-600">Create and manage customer quotes.</CardDescription>
          </div>
          <Button 
            onClick={onNewQuote} 
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 w-full sm:w-auto flex-shrink-0"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> New Quote
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Input 
            placeholder="Search by customer or ID..." 
            value={quoteSearch} 
            onChange={(e) => setQuoteSearch(e.target.value)}
            className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg"
          />
          <Input 
            type="date" 
            value={quoteDate} 
            onChange={(e) => setQuoteDate(e.target.value)} 
            className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg pl-3 pr-12 sm:w-auto w-full" 
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="overflow-auto h-full">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-green-50 to-blue-50 hover:from-green-100 hover:to-blue-100">
                <TableHead className="w-[100px] font-semibold text-gray-700">Quote</TableHead>
                <TableHead className="font-semibold text-gray-700">Customer & Items</TableHead>
                <TableHead className="hidden lg:table-cell font-semibold text-gray-700">Pricing Details</TableHead>
                <TableHead className="hidden md:table-cell font-semibold text-gray-700">Date & Status</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.length > 0 ? filteredQuotes.map((q) => (
                <TableRow key={q.id} className="hover:bg-white/60 transition-colors duration-200 group">
                  <TableCell className="py-4">
                    <div className="space-y-1">
                      <div className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        #{q.id.slice(0, 8)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <FileText className="h-3 w-3" />
                        <span>Quote</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{q.customer}</span>
                      </div>
                      {q.items && q.items.length > 0 && (
                        <div className="space-y-2">
                          {q.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-200 to-green-300 rounded-lg flex items-center justify-center">
                                <Package className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {item.name || 'Unknown Product'}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span>Qty: {item.quantity}</span>
                                  <span>Unit: {formatCurrency(item.unit_price || item.price || 0)}</span>
                                  {item.supplier_name && (
                                    <span>Supplier: {item.supplier_name}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {q.items.length > 2 && (
                            <div className="text-xs text-gray-500 text-center py-1">
                              +{q.items.length - 2} more items
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell py-4">
                    <div className="space-y-2">
                      <div className="flex flex-col gap-1">
                        {q.original_price && q.original_price !== q.final_price && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Original:</span>
                            <span className="text-sm text-gray-500 line-through">
                              {formatCurrency(q.original_price)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-bold text-lg text-gray-900">
                            {formatCurrency(q.final_price || q.total_price || 0)}
                          </span>
                        </div>
                        {q.discount_amount && q.discount_amount > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded text-green-700">
                            <TrendingUp className="h-3 w-3" />
                            <span className="text-xs font-medium">
                              Discount: {formatCurrency(q.discount_amount)}
                            </span>
                          </div>
                        )}
                        {q.payment_status && (
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            q.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                            q.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            q.payment_status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            Payment: {q.payment_status}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">{formatDate(q.created_at)}</span>
                      </div>
                      <Badge 
                        className={`${
                          q.status === 'Approved' ? 'bg-green-100 text-green-800 border-green-200' :
                          q.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          q.status === 'Submitted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          q.status === 'Converted' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          q.status === 'Rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        } border`}
                      >
                        {q.status}
                      </Badge>
                      {q.created_by && (
                        <div className="text-xs text-gray-500">
                          By: {q.created_by}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-4">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => onEditQuote(q)}
                      className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600 transition-colors duration-200"
                      title="Edit Quote"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="h-16 w-16 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center">
                        <FileText className="h-8 w-8 text-green-400" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-gray-500 font-medium text-lg">No quotes found</p>
                        <p className="text-gray-400 text-sm max-w-sm">
                          Create your first quote to start building relationships with customers
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
