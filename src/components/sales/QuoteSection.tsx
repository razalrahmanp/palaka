'use client';
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Edit } from "lucide-react";
import { Quote } from "@/types";

// Helper function (assuming it's defined elsewhere, e.g., in a utils file)
const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
                <TableHead className="w-[80px] font-semibold text-gray-700">Quote ID</TableHead>
                <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                <TableHead className="hidden md:table-cell text-right font-semibold text-gray-700">Total</TableHead>
                <TableHead className="hidden sm:table-cell font-semibold text-gray-700">Date</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.length > 0 ? filteredQuotes.map((q) => (
                <TableRow key={q.id} className="hover:bg-white/60 transition-colors duration-200">
                  <TableCell className="font-mono text-xs text-gray-600">{q.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium text-gray-900">{q.customer}</TableCell>
                  <TableCell className="hidden md:table-cell text-right font-semibold text-gray-900">{formatCurrency(q.total_price)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-600">{formatDate(q.created_at)}</TableCell>
                  <TableCell>
                    <Badge 
                      className={`${
                        q.status === 'Approved' ? 'bg-green-100 text-green-800 border-green-200' :
                        q.status === 'Submitted' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        q.status === 'Draft' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                        q.status === 'Converted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      } border`}
                    >
                      {q.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => onEditQuote(q)}
                      className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600 transition-colors duration-200"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="h-12 w-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                        <PlusCircle className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">No quotes found</p>
                      <p className="text-gray-400 text-sm">Create your first quote to get started</p>
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
