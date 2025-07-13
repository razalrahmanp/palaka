import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QuoteBuilderForm } from '@/components/sales/QuoteBuilderForm';
import { OrderDetails } from '@/components/sales/OrderDetails';
import { OrderEditForm } from '@/components/sales/OrderEditForm';
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
  isOrderEditModalOpen: boolean;
  setIsOrderEditModalOpen: (v: boolean) => void;
  selectedQuote: Quote | null;
  selectedOrder: Order | null;
  customers: Customer[];
  products: Product[];
  currentUser: User | null;
handleSaveQuote: (q: QuoteFormData, i: OrderItem[]) => void;
  refresh: () => void;
};


export function SalesModals({
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
            userRole={currentUser?.role}
            onSubmit={handleSaveQuote}
            onCancel={() => setIsQuoteModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Details: {selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          {selectedOrder && <OrderDetails order={selectedOrder} />}
        </DialogContent>
      </Dialog>

      <Dialog open={isOrderEditModalOpen} onOpenChange={setIsOrderEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Order: {selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <OrderEditForm
              order={selectedOrder}
              customerId={customers.find((c) => c.name === selectedOrder.customer)?.id || ''}
              availableProducts={products}
              onSave={async (updates) => {
                const res = await fetch(`/api/sales/orders`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updates),
                });
                if (res.ok) {
                  refresh();
                  setIsOrderEditModalOpen(false);
                } else {
                  console.error(await res.json());
                }
              }}
              onCancel={() => setIsOrderEditModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
