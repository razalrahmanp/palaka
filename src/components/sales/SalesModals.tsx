import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QuoteBuilderForm } from '@/components/sales/QuoteBuilderForm';
import { OrderDetails } from '@/components/sales/OrderDetails';
import { BasicOrderEditForm } from '@/components/sales/BasicOrderEditForm';
import { Quote, Order, Product, Customer, User, OrderItem } from '@/types';

type QuoteFormData = {
  customer_id: string;
  customer: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
  total_price: number;
  [k: string]: unknown;
};

type Props = {
  isQuoteModalOpen: boolean;
  setIsQuoteModalOpen: (v: boolean) => void;
  isOrderModalOpen: boolean;
  setIsOrderModalOpen: (v: boolean) => void;
  isBasicOrderEditModalOpen: boolean;
  setIsBasicOrderEditModalOpen: (v: boolean) => void;
  selectedQuote: Quote | null;
  selectedOrder: Order | null;
  customers: Customer[];
  products: Product[];
  currentUser: User | null;
handleSaveQuote: (q: QuoteFormData, i: OrderItem[]) => Promise<void>;
  refresh: () => void;
  showSalesRepChangeButton?: boolean;
  onSalesRepChange?: (orderId: string) => void;
};


export function SalesModals({
  isQuoteModalOpen,
  setIsQuoteModalOpen,
  isOrderModalOpen,
  setIsOrderModalOpen,
  isBasicOrderEditModalOpen,
  setIsBasicOrderEditModalOpen,
  selectedQuote,
  selectedOrder,
  customers,
  products,
  currentUser,
  handleSaveQuote,
  refresh,
  showSalesRepChangeButton = false,
  onSalesRepChange,
}: Props) {
  return (
    <>
      <Dialog open={isQuoteModalOpen} onOpenChange={setIsQuoteModalOpen}>
        <DialogContent className="w-full max-w-6xl">
          <DialogHeader>
            <DialogTitle>{selectedQuote ? 'Edit Quote' : 'Create Quote'}</DialogTitle>
          </DialogHeader>
          <QuoteBuilderForm
            initialData={
              selectedQuote
                ? {
                    ...selectedQuote,
                    status:
                      selectedQuote.status === 'Submitted' || selectedQuote.status === 'Converted'
                        ? 'Approved'
                        : selectedQuote.status,
                  }
                : {}
            }
            availableCustomers={customers}
            availableProducts={products}
            userRole={currentUser?.role ?? 'Sales Representative'} 
            onSubmit={async (quote, items) => {
              // Ensure status is one of the allowed types
              const validStatuses = ['Draft', 'Pending', 'Approved', 'Rejected'] as const;
              const status =
                validStatuses.includes(quote.status as QuoteFormData['status'])
                  ? (quote.status as QuoteFormData['status'])
                  : 'Draft';
              await handleSaveQuote(
                { ...quote, status },
                items
              );
            }}
            onCancel={() => setIsQuoteModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="!max-w-none !max-h-none !w-screen !h-screen !m-0 !p-0 !gap-0 !rounded-none !border-0 fixed !inset-0 !transform-none !translate-x-0 !translate-y-0">
          <DialogDescription className="sr-only">
            Order details view with invoice information, customer details, and action buttons for printing and sharing.
          </DialogDescription>
          {selectedOrder && <OrderDetails order={selectedOrder} showSalesRepChangeButton={showSalesRepChangeButton} onSalesRepChange={onSalesRepChange} />}
        </DialogContent>
      </Dialog>

      {/* Basic Order Edit Modal */}
      <Dialog open={isBasicOrderEditModalOpen} onOpenChange={setIsBasicOrderEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Order Details: {selectedOrder?.id}</DialogTitle>
            <DialogDescription>
              Update delivery date, status, and delivery address
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <BasicOrderEditForm
              order={selectedOrder}
              onSave={async (updates) => {
                try {
                  const res = await fetch(`/api/sales/orders/${selectedOrder.id}/basic-update`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates),
                  });
                  
                  if (res.ok) {
                    refresh();
                    setIsBasicOrderEditModalOpen(false);
                  } else {
                    const error = await res.json();
                    console.error('Failed to update order:', error);
                  }
                } catch (error) {
                  console.error('Error updating order:', error);
                }
              }}
              onCancel={() => setIsBasicOrderEditModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
