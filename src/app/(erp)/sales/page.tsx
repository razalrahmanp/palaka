'use client';
import React, { useState } from 'react';
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
  async function handleCreatePO(order: any) {
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

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create purchase orders.");
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
      <QuoteSection
        quotes={quotes}
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
          orders={orders}
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
            date: order.orderDate,
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
  );
}
