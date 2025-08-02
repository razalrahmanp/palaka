'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { QuoteSection } from '@/components/sales/QuoteSection';
import { OrderSection } from '@/components/sales/OrderSection';
import { CustomOrdersSection } from "@/components/sales/custom-sales/CustomOrdersSection";
import { useSalesData } from '@/components/sales/SalesDataLoader';
import { createSalesHandlers } from '@/components/sales/SalesHandlers';
import { SalesModals } from '@/components/sales/SalesModals';
import { Order, Quote } from '@/types';
import { toast } from "sonner";

export default function SalesPage() {
  const {
    quotes,
    orders,
    products,
    customers,
    currentUser,
    refresh,
  } = useSalesData();

  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [customOrdersRefetch, setCustomOrdersRefetch] = useState<(() => void) | null>(null);

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isOrderEditModalOpen, setIsOrderEditModalOpen] = useState(false);
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderDate, setOrderDate] = useState('');

  const { handleSaveQuote, handleDeleteOrder } = createSalesHandlers(
    currentUser,
    selectedQuote,
    refresh,
    setIsQuoteModalOpen
  );

  const filteredQuotes = quotes
    .filter(
      (q) =>
        (!quoteSearch ||
          q.customer.toLowerCase().includes(quoteSearch.toLowerCase()) ||
          q.id.includes(quoteSearch)) &&
        (!quoteDate || q.created_at?.slice(0, 10) === quoteDate)
    )
    .filter((q) => q.status !== 'Converted');

  const filteredOrders = orders.filter(
    (o) =>
      (!orderSearch ||
        o.customer.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.id.includes(orderSearch)) &&
      (!orderDate || o.date?.slice(0, 10) === orderDate)
  );

  const canViewOrders = ['Finance Manager', 'System Administrator'].includes(
    currentUser?.role || ''
  );

  // 🆕 Handle PO creation from custom order
  async function handleCreatePO(order: {
    orderId: string;
    customerName: string;
    orderDate: string | Date;
    totalPrice: number;
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      supplierName?: string;
    }>;
  }) {
    if (!currentUser?.id) return;

    const groupedBySupplier = new Map<
      string,
      {
        supplierName: string;
        items: typeof order.items;
      }
    >();

    for (const item of order.items) {
      if (!item.supplierName) continue;

      if (!groupedBySupplier.has(item.supplierName)) {
        groupedBySupplier.set(item.supplierName, {
          supplierName: item.supplierName,
          items: [],
        });
      }

      groupedBySupplier.get(item.supplierName)!.items.push(item);
    }

    try {
      for (const [, { supplierName, items }] of groupedBySupplier) {
        for (const item of items) {
          const res = await fetch("/api/procurement/purchase_orders/custom", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              supplier_id: null,
              supplier_name: supplierName,
              product_id: null, // Will be resolved in backend
              product_name: item.productName,
              quantity: item.quantity,
              price: item.unitPrice,
              status: "pending",
              is_custom: true,
              custom_type: "custom-sales",
              description: `PO from order ${order.orderId} for ${item.productName}`,
              materials: null,
              images: null,
              created_by: currentUser.id,
              total: item.unitPrice * item.quantity,
            }),
          });

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Failed to create purchase order");
          }
        }
      }

      toast.success("Purchase orders created successfully.");

  await fetch(`/api/sales/custom-orders/mark-po-created`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orderId: order.orderId }),
});

customOrdersRefetch?.(); // ✅ Refresh the custom orders section
toast.success("Purchase orders created successfully.");
setCustomOrdersRefetch(() => () => refresh()); // Update refetch function
refresh();

    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        toast.error(err.message || "Failed to create purchase orders.");
      } else {
        toast.error("Failed to create purchase orders.");
      }
    }
  }

  return (
    <div className="p-4 space-y-6">
      {/* Sales Navigation Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sales Management</span>
            <div className="flex gap-2">
              {['Sales Representative', 'Sales Manager', 'System Administrator', 'Executive'].includes(currentUser?.role || '') && (
                <Link href="/sales/representative">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {currentUser?.role === 'Sales Representative' ? 'My Dashboard' : 'Sales Dashboard'}
                  </Button>
                </Link>
              )}
              {/* {['Sales Manager', 'System Administrator', 'Executive'].includes(currentUser?.role || '') && (
                <Link href="/sales/representative">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </Button>
                </Link>
              )} */}
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Sales Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <QuoteSection
        quoteSearch={quoteSearch}
        setQuoteSearch={setQuoteSearch}
        quoteDate={quoteDate}
        setQuoteDate={setQuoteDate}
        filteredQuotes={filteredQuotes}
        onNewQuote={() => {
          setSelectedQuote(null);
          setIsQuoteModalOpen(true);
        }}
        onEditQuote={(q) => {
          setSelectedQuote(q);
          setIsQuoteModalOpen(true);
        }}
      />

      {canViewOrders && (
        <OrderSection
          orderSearch={orderSearch}
          setOrderSearch={setOrderSearch}
          orderDate={orderDate}
          setOrderDate={setOrderDate}
          filteredOrders={filteredOrders}
          onViewOrder={(o) => {
            setSelectedOrder(o);
            setIsOrderModalOpen(true);
          }}
          onEditOrder={(o) => {
            setSelectedOrder(o);
            setIsOrderEditModalOpen(true);
          }}
          onDeleteOrder={handleDeleteOrder}
        />
      )}

      <CustomOrdersSection
        onViewOrder={(order) => {
          setSelectedOrder({
            id: order.orderId,
            customer: order.customerName,
            date: typeof order.orderDate === 'string' ? order.orderDate : order.orderDate?.toISOString(),
            total: order.totalPrice,
            status: "confirmed",
            items: order.items.map((i) => ({
              product_id: "",
              name: i.productName,
              quantity: i.quantity,
              price: i.unitPrice,
              supplier_name: i.supplierName,
            })),
          });
          setIsOrderModalOpen(true);
        }}
        onCreatePO={handleCreatePO}
        setRefetch={setCustomOrdersRefetch}
      />

      <SalesModals
        {...{
          isQuoteModalOpen,
          setIsQuoteModalOpen,
          isOrderModalOpen,
          setIsOrderModalOpen,
          isOrderEditModalOpen,
          setIsOrderEditModalOpen,
          selectedQuote,
          selectedOrder,
          customers,
          products,
          currentUser,
          handleSaveQuote,
          refresh,
        }}
      />
      </div>
    </div>
  );
}
