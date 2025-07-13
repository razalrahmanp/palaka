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
import { Eye, Edit, Trash2 } from "lucide-react";
import { Order } from "@/types";

export function OrderSection({
  orderSearch,
  setOrderSearch,
  orderDate,
  setOrderDate,
  filteredOrders,
  onViewOrder,
  onEditOrder,
  onDeleteOrder,
}: {
  orders: Order[];
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
      <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
        <div>
          <CardTitle>Sales Orders</CardTitle>
          <CardDescription>Confirmed orders from converted quotes.</CardDescription>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <input
              type="text"
              placeholder="Search orders…"
              className="border px-2 py-1 rounded w-full"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
            <input
              type="date"
              className="border px-2 py-1 rounded w-full sm:w-auto"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              placeholder="date"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sl/No</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Total</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((o, idx) => (
              <TableRow key={o.id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell className="font-mono truncate max-w-[100px]" title={o.id}>
                  {o.id.slice(0, 6)}...
                </TableCell>
                <TableCell>{o.customer}</TableCell>
                <TableCell className="hidden md:table-cell">
                  ${o.total.toFixed(2)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {o.date}
                </TableCell>
                <TableCell>
                  <Badge>{o.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onViewOrder(o)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEditOrder(o)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => onDeleteOrder(o.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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
