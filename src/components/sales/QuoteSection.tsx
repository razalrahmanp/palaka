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
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Sales Quotes</CardTitle>
            <CardDescription>Create and manage customer quotes.</CardDescription>
          </div>
          <Button onClick={onNewQuote} className="w-full sm:w-auto flex-shrink-0">
            <PlusCircle className="mr-2 h-4 w-4" /> New Quote
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <Input placeholder="Search by customer or ID..." value={quoteSearch} onChange={(e) => setQuoteSearch(e.target.value)} />
          <Input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className=" pl-3 pr-12 sm:w-auto w-full" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="overflow-auto h-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Quote ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell text-right">Total</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.length > 0 ? filteredQuotes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono text-xs">{q.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium">{q.customer}</TableCell>
                  <TableCell className="hidden md:table-cell text-right">{formatCurrency(q.total_price)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(q.created_at)}</TableCell>
                  <TableCell><Badge>{q.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onEditQuote(q)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={6} className="text-center">No quotes found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
