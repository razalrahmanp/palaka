'use client';
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Edit, Trash2 } from "lucide-react";
import { Order } from "@/types";

// Helper function (assuming it's defined elsewhere, e.g., in a utils file)
const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export function OrderSection({
  orderSearch, setOrderSearch,
  orderDate, setOrderDate,
  filteredOrders,
  onViewOrder, onEditOrder, onDeleteOrder,
}: {
  orderSearch: string;
  setOrderSearch: (v: string) => void;
  orderDate: string;
  setOrderDate: (v: string) => void;
  filteredOrders: Order[];
  onViewOrder: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onDeleteOrder: (orderId: string) => void;
}) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Sales Orders</CardTitle>
        <CardDescription>Confirmed orders from converted quotes.</CardDescription>
        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <Input placeholder="Search by customer or ID..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} />
          <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="pl-3 pr-12 sm:w-auto" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="overflow-auto h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Total</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? filteredOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                    <TableCell>{o.customer}</TableCell>
                    <TableCell className="hidden md:table-cell text-right">{formatCurrency(o.total)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(o.date)}</TableCell>
                    <TableCell><Badge>{o.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => onViewOrder(o)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onEditOrder(o)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => onDeleteOrder(o.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                    <TableRow><TableCell colSpan={6} className="text-center">No orders found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
