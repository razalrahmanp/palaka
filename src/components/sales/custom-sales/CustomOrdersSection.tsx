'use client';
import React, { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, PlusCircle } from "lucide-react";
import { toast } from "sonner";

// --- Type Definitions ---
interface CustomOrderItem {
  supplierName?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface CustomOrder {
  orderId: string;
  customerName: string;
  orderDate: string | Date;
  items: CustomOrderItem[];
  totalPrice: number;
  poCreated: boolean;
}

// --- Data Fetching Hook ---
function useCustomOrders() {
  const [customOrders, setCustomOrders] = useState<CustomOrder[]>([]);
  const [page, setPage] = useState(1);
  const [customerFilter, setCustomerFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async (currentPage = 1) => {
    setIsLoading(true);
    const params = new URLSearchParams({
      page: currentPage.toString(),
      perPage: "10",
    });
    if (customerFilter) params.set("customer", customerFilter);
    if (dateFilter) params.set("date", dateFilter);

    try {
      const res = await fetch(`/api/sales/custom-orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCustomOrders(data || []);
      } else {
        console.error("Failed to fetch custom orders");
        toast.error("Could not load custom orders.");
        setCustomOrders([]);
      }
    } catch (error) {
      console.error("Failed to fetch custom orders:", error);
      toast.error("An error occurred while fetching orders.");
      setCustomOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [customerFilter, dateFilter]);

  // Initial fetch and fetch on page change
  useEffect(() => {
    fetchOrders(page);
  }, [page, fetchOrders]);
  
  // Debounced fetch for filter changes
  useEffect(() => {
    const handler = setTimeout(() => {
      if (page !== 1) setPage(1); // Reset to first page if not already there
      else fetchOrders(1);
    }, 500); // Debounce filter changes by 500ms
    return () => clearTimeout(handler);
  },[customerFilter, dateFilter, fetchOrders, page])


  return { customOrders, isLoading, page, setPage, customerFilter, setCustomerFilter, dateFilter, setDateFilter, refetch: fetchOrders };
}

// --- Main Component ---
export function CustomOrdersSection({
  onViewOrder,
  onCreatePO,
  setRefetch,
  className // Keep className prop in case you need it elsewhere
}: {
  onViewOrder: (order: CustomOrder) => void;
  onCreatePO: (order: CustomOrder) => void;
  setRefetch?: (fn: () => void) => void;
  className?: string;
}) {
  const { customOrders, isLoading, page, setPage, customerFilter, setCustomerFilter, dateFilter, setDateFilter, refetch } = useCustomOrders();
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  
  useEffect(() => {
    if (setRefetch) {
      setRefetch(() => refetch);
    }
  }, [refetch, setRefetch]);

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '₹ 0.00';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    // Restored col-span-2 for full-width layout in a 2-column grid
    <Card className={`h-full flex flex-col lg:col-span-2 ${className}`}>
      <CardHeader>
        <CardTitle>Custom Sales Orders</CardTitle>
        <CardDescription>Orders with custom products requiring a Purchase Order.</CardDescription>
        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <Input
            type="text"
            placeholder="Filter by customer..."
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="w-full sm:w-1/2 md:w-1/3"
          />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full sm:w-auto"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Sl/No</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Suppliers</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">PO Created</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center h-24">Loading...</TableCell></TableRow>
                ) : customOrders.length > 0 ? customOrders.map((order, idx) => {
                  const suppliers = Array.from(new Set(order.items.map((item) => item.supplierName?.trim()).filter(Boolean)));
                  return (
                    <TableRow key={order.orderId}>
                      <TableCell>{idx + 1 + (page - 1) * 10}</TableCell>
                      <TableCell className="font-mono text-xs">{order.orderId.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium">{order.customerName}</TableCell>
                      <TableCell>{formatDate(order.orderDate)}</TableCell>
                      <TableCell className="truncate max-w-[200px]">{suppliers.join(", ") || 'N/A'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(order.totalPrice)}</TableCell>
                      <TableCell className="text-center">
                        {/* Reverted to original span-based styling */}
                        {order.poCreated ? (
                          <span className="text-green-600 font-medium">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" title="View Order" onClick={() => onViewOrder(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" title="Create Purchase Order"
                            disabled={order.poCreated || loadingOrderId === order.orderId}
                            onClick={async () => {
                              setLoadingOrderId(order.orderId);
                              await onCreatePO(order);
                              setLoadingOrderId(null);
                            }}
                          >
                            <PlusCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                    <TableRow><TableCell colSpan={8} className="text-center h-24">No custom orders found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
        </div>
      </CardContent>
       <div className="flex justify-center items-center p-4 border-t">
         <Button
           variant="outline"
           disabled={page <= 1}
           onClick={() => setPage((p) => Math.max(1, p - 1))}
         >
           Previous
         </Button>
         <span className="mx-4 text-sm font-medium">Page {page}</span>
         <Button 
            variant="outline" 
            disabled={customOrders.length < 10}
            onClick={() => setPage((p) => p + 1)}>
           Next
         </Button>
       </div>
    </Card>
  );
}
