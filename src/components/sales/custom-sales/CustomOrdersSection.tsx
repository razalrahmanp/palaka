"use client";
import React, { useEffect } from "react";
import { CustomOrder } from "./types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, PlusCircle } from "lucide-react";
import { useCustomOrders } from "./useCustomOrders";

export function CustomOrdersSection({
  onViewOrder,
  onCreatePO,
  setRefetch,
}: {
  onViewOrder: (order: CustomOrder) => void;
  onCreatePO: (order: CustomOrder) => void;
  setRefetch?: (fn: () => void) => void; 
}) {
  const {
    customOrders,
    page,
    setPage,
    customerFilter,
    setCustomerFilter,
    dateFilter,
    setDateFilter,
  } = useCustomOrders();

const refetch = React.useCallback(() => {
  setPage(1);
  setCustomerFilter("");
  setDateFilter("");
}, [setPage, setCustomerFilter, setDateFilter]);

useEffect(() => {
  if (setRefetch) {
    setRefetch(refetch); // ✅ give access to refresh method
  }
}, [refetch, setRefetch]);

  const [loadingOrderId, setLoadingOrderId] = React.useState<string | null>(null);
  return (
    <Card className="h-full flex flex-col col-span-2">
      <CardHeader>
        <CardTitle>Custom Sales Orders</CardTitle>
        <CardDescription>Orders containing custom products.</CardDescription>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <input
            type="text"
            placeholder="Filter by customer"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="border px-2 py-1 rounded w-full sm:w-auto"
          />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border px-2 py-1 rounded w-full sm:w-auto"
            title="Select Date"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sl/No</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Suppliers</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Actions</TableHead>
              <TableHead>PO Created</TableHead>

            </TableRow>
          </TableHeader>
          <TableBody>
            {customOrders.map((order, idx) => {
              // Collect unique supplier names
              const suppliers = Array.from(
                new Set(
                  order.items
                    .map((item) => item.supplierName?.trim())
                    .filter(Boolean)
                )
              );

              return (
                <TableRow key={order.orderId}>
                  <TableCell>{idx + 1 + (page - 1) * 10}</TableCell>
                  <TableCell className="font-mono">
                    {order.orderId.slice(0, 8)}...
                  </TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.orderDate}</TableCell>
                  <TableCell>
                    {suppliers.length > 0
                      ? suppliers.join(", ")
                      : "N/A"}
                  </TableCell>
                  <TableCell>${order.totalPrice.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewOrder(order)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Create Purchase Order"
                       disabled={order.poCreated || loadingOrderId === order.orderId}
                        onClick={async () => {
                          setLoadingOrderId(order.orderId);
                          await onCreatePO(order);
                          setLoadingOrderId(null);
                        }}
                    >
                      <PlusCircle className="h-4 w-4 text-green-600" />
                    </Button>


                  </TableCell>
                  <TableCell>
                    {order.poCreated ? (
                      <span className="text-green-600 font-medium">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </TableCell>

                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex justify-between items-center mt-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span>Page {page}</span>
          <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
