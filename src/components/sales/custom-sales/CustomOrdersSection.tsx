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
  refreshTrigger = 0, // Add refresh trigger prop
  className // Keep className prop in case you need it elsewhere
}: {
  onViewOrder: (order: CustomOrder) => void;
  onCreatePO: (order: CustomOrder) => void;
  setRefetch?: (fn: () => void) => void;
  refreshTrigger?: number; // Add this prop to trigger external refreshes
  className?: string;
}) {
  const { customOrders, isLoading, page, setPage, customerFilter, setCustomerFilter, dateFilter, setDateFilter, refetch } = useCustomOrders();
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  
  useEffect(() => {
    if (setRefetch) {
      setRefetch(() => refetch);
    }
  }, [refetch, setRefetch]);

  // Add effect to refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

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
    <Card className={`bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 h-full flex flex-col lg:col-span-2 ${className}`}>
      <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-100/50">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          Custom Sales Orders
        </CardTitle>
        <CardDescription className="text-gray-600">Orders with custom products requiring a Purchase Order.</CardDescription>
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Input
            type="text"
            placeholder="Filter by customer..."
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg w-full sm:w-1/2 md:w-1/3"
          />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg w-full sm:w-auto"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100">
                  <TableHead className="font-semibold text-gray-700">Sl/No</TableHead>
                  <TableHead className="font-semibold text-gray-700">Order ID</TableHead>
                  <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                  <TableHead className="font-semibold text-gray-700">Date</TableHead>
                  <TableHead className="font-semibold text-gray-700">Suppliers</TableHead>
                  <TableHead className="text-right font-semibold text-gray-700">Total</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700">PO Created</TableHead>
                  <TableHead className="text-right pr-4 font-semibold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-24">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin h-5 w-5 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                          <span className="text-gray-600">Loading custom orders...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                ) : customOrders.length > 0 ? customOrders.map((order, idx) => {
                  const suppliers = Array.from(new Set(order.items.map((item) => item.supplierName?.trim()).filter(Boolean)));
                  return (
                    <TableRow key={order.orderId} className="hover:bg-white/60 transition-colors duration-200">
                      <TableCell className="text-gray-600">{idx + 1 + (page - 1) * 10}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-600">{order.orderId.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium text-gray-900">{order.customerName}</TableCell>
                      <TableCell className="text-gray-600">{formatDate(order.orderDate)}</TableCell>
                      <TableCell className="truncate max-w-[200px] text-gray-600">{suppliers.join(", ") || 'N/A'}</TableCell>
                      <TableCell className="text-right font-semibold text-gray-900">{formatCurrency(order.totalPrice)}</TableCell>
                      <TableCell className="text-center">
                        {/* Enhanced styling for PO status */}
                        {order.poCreated ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            ✓ Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                            ⏳ No
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="View Order" 
                            onClick={() => onViewOrder(order)}
                            className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600 transition-colors duration-200"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" 
                            size="icon" 
                            title="Create Purchase Order"
                            disabled={order.poCreated || loadingOrderId === order.orderId}
                            className={`h-8 w-8 transition-colors duration-200 ${
                              order.poCreated || loadingOrderId === order.orderId 
                                ? 'text-gray-400 cursor-not-allowed' 
                                : 'hover:bg-green-100 hover:text-green-600'
                            }`}
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
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center space-y-3">
                          <div className="h-12 w-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                            <PlusCircle className="h-6 w-6 text-gray-400" />
                          </div>
                          <p className="text-gray-500 font-medium">No custom orders found</p>
                          <p className="text-gray-400 text-sm">Custom orders will appear here when quotes with custom products are approved</p>
                        </div>
                      </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
        </div>
      </CardContent>
       <div className="flex justify-center items-center p-4 border-t border-gray-100/50 bg-gradient-to-r from-orange-50/50 to-red-50/50">
         <Button
           variant="outline"
           disabled={page <= 1}
           onClick={() => setPage((p) => Math.max(1, p - 1))}
           className="bg-white/60 backdrop-blur-sm border border-white/30 hover:bg-white/80 transition-all duration-200"
         >
           Previous
         </Button>
         <span className="mx-4 text-sm font-medium text-gray-700 bg-white/60 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/30">
           Page {page}
         </span>
         <Button 
            variant="outline" 
            disabled={customOrders.length < 10}
            onClick={() => setPage((p) => p + 1)}
            className="bg-white/60 backdrop-blur-sm border border-white/30 hover:bg-white/80 transition-all duration-200"
         >
           Next
         </Button>
       </div>
    </Card>
  );
}
