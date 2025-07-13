'use client';
import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit } from "lucide-react";
import { Quote } from "@/types";

export function QuoteSection({
  quoteSearch,
  setQuoteSearch,
  quoteDate,
  setQuoteDate,
  filteredQuotes,
  onNewQuote,
  onEditQuote,
}: {
  quotes: Quote[];
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
      <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
        <div>
          <CardTitle>Sales Quotes</CardTitle>
          <CardDescription>Create and manage customer quotes.</CardDescription>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <input
              type="text"
              placeholder="Search quotes…"
              className="border px-2 py-1 rounded w-full"
              value={quoteSearch}
              onChange={(e) => setQuoteSearch(e.target.value)}
            />
            <input
              type="date"
              className="border px-2 py-1 rounded w-full sm:w-auto"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
              placeholder="date"
            />
          </div>
        </div>
        <Button onClick={onNewQuote} className="mt-2 sm:mt-0 w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          New Quote
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sl/No</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuotes.map((q, idx) => (
              <TableRow key={q.id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell className="font-mono truncate max-w-[100px]" title={q.id}>
                  {q.id.slice(0, 6)}...
                </TableCell>
                <TableCell>{q.customer}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {q.total_price != null ? `$${q.total_price.toFixed(2)}` : "-"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={q.status === "Approved" ? "default" : "secondary"}
                  >
                    {q.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onEditQuote(q)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
