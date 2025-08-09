'use client';
import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { User, FileText, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';
import { QuoteSection } from '@/components/sales/QuoteSection';
import { OrderSection } from '@/components/sales/OrderSection';
import { CustomOrdersSection } from "@/components/sales/custom-sales/CustomOrdersSection";
import { useSalesData } from '@/components/sales/SalesDataLoader';
import { createSalesHandlers } from '@/components/sales/SalesHandlers';
import { SalesModals } from '@/components/sales/SalesModals';
import SalesTestRefresh from '@/components/sales/SalesTestRefresh';
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isOrderEditModalOpen, setIsOrderEditModalOpen] = useState(false);
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderDate, setOrderDate] = useState('');

  // Enhanced refresh function that triggers all sections
  const enhancedRefresh = useCallback(() => {
    refresh(); // Refreshes quotes and orders
    if (customOrdersRefetch) {
      customOrdersRefetch(); // Refreshes custom orders
    }
    setRefreshTrigger(prev => prev + 1); // Trigger any other dependent refreshes
  }, [refresh, customOrdersRefetch]);

  const { handleSaveQuote, handleDeleteOrder } = createSalesHandlers(
    currentUser,
    selectedQuote,
    enhancedRefresh, // Use enhanced refresh instead of basic refresh
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

          const result = await res.json();
          
          // Log journal entry creation status
          if (result.journal_entry_created) {
            console.log(`✅ Journal entry automatically created for PO ${result.id}`);
          } else {
            console.warn(`⚠️ Journal entry not created for PO ${result.id}. Check accounting section.`);
          }
        }
      }

      toast.success("Purchase orders created successfully with accounting entries.");

  await fetch(`/api/sales/custom-orders/mark-po-created`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orderId: order.orderId }),
});

customOrdersRefetch?.(); // ✅ Refresh the custom orders section
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-6 space-y-8">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Sales Management
            </h1>
            <p className="text-gray-600 mt-2">Manage quotes, orders, and sales performance</p>
          </div>
          <div className="flex gap-3">
            {['Sales Representative', 'Sales Manager', 'System Administrator', 'Executive'].includes(currentUser?.role || '') && (
              <Link href="/sales/representative">
                <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <User className="mr-2 h-5 w-5" />
                  {currentUser?.role === 'Sales Representative' ? 'My Dashboard' : 'Sales Dashboard'}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Test Refresh System - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <SalesTestRefresh onTest={enhancedRefresh} />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Quotes</p>
                <p className="text-2xl font-bold text-gray-900">{filteredQuotes.length}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">+{quotes.filter(q => new Date(q.created_at || '').getMonth() === new Date().getMonth()).length}</span>
              <span className="text-gray-600 ml-1">this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">+{orders.filter(o => new Date(o.date || '').getMonth() === new Date().getMonth()).length}</span>
              <span className="text-gray-600 ml-1">this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${orders.reduce((sum, order) => sum + (order.total || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">+${orders.filter(o => new Date(o.date || '').getMonth() === new Date().getMonth()).reduce((sum, order) => sum + (order.total || 0), 0).toLocaleString()}</span>
              <span className="text-gray-600 ml-1">this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {quotes.length > 0 ? Math.round((quotes.filter(q => q.status === 'Converted').length / quotes.length) * 100) : 0}%
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-600">Quote to order</span>
            </div>
          </CardContent>
        </Card>
      </div>

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
        refreshTrigger={refreshTrigger}
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
          refresh: enhancedRefresh, // Use enhanced refresh
        }}
      />
      </div>
    </div>
  );
}
