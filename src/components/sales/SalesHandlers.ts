import { OrderItem, Quote, User } from '@/types';

export function createSalesHandlers(
  currentUser: User | null,
  selectedQuote: Quote | null,
  refresh: () => void,
  setIsQuoteModalOpen: (open: boolean) => void
) {
  async function handleSaveQuote(
    quoteData: {
      customer_id: string;
      customer: string;
      status: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
      total_price: number;
      [k: string]: unknown;
    },
    items: OrderItem[]
  ) {
    if (!currentUser) return;

    const isEdit = Boolean(selectedQuote);
    const payload = {
      ...quoteData,
      items,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };

    const url = isEdit ? '/api/sales/quotes/update' : '/api/sales/quotes';
    const method = isEdit ? 'PUT' : 'POST';
    const body = isEdit ? { id: selectedQuote!.id, ...payload } : payload;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error('Quote save error', await res.json());
      return;
    }

    // Always refresh data after quote save/update
    refresh();

    if (quoteData.status === 'Approved') {
      const createdQuote = isEdit ? selectedQuote : await res.json();
      const orderItems = await Promise.all(
        items.map(async (item) => {
          let customProductId: string | undefined;
          if (
            !item.product_id ||
            item.product_id.trim() === '' ||
            (item.configuration && Object.keys(item.configuration).length > 0)
          ) {
            const createRes = await fetch('/api/products/createCustom', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: item.name,
                configuration: item.configuration,
              }),
            });
            if (!createRes.ok) {
              console.error('Failed to create custom product', await createRes.json());
              return null;
            }
            const created = await createRes.json();
            customProductId = created.id;
          }
          return {
            product_id: customProductId ? undefined : item.product_id,
            custom_product_id: customProductId,
            quantity: item.quantity,
            unit_price: item.unit_price ?? item.price ?? 0,
              name: item.name,
              supplier_name: item.supplier_name ?? null,
          };
        })
      );

      const orderRes = await fetch('/api/sales/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: createdQuote.id,
          customer_id: quoteData.customer_id,
          date: new Date().toISOString(),
          status: 'confirmed',
          created_by: currentUser.id,
          items: orderItems.filter(Boolean),
        }),
      });

      if (!orderRes.ok) {
        console.error('Failed to create order', await orderRes.json());
        return;
      }

      // Refresh again after order creation to ensure all sections see the new data
      setTimeout(() => {
        refresh();
      }, 500); // Small delay to ensure backend processing is complete

      await Promise.all(
        orderItems
          .filter((i) => i?.product_id)
          .map((i) =>
            fetch('/api/inventory/adjust', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product_id: i!.product_id,
                quantity: i!.quantity,
                type: 'decrease',
              }),
            })
          )
      );

      if (createdQuote?.id) {
        await fetch('/api/sales/quotes/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: createdQuote.id, status: 'Converted' }),
        });
      }
    }

    setIsQuoteModalOpen(false);
    refresh();
  }

  async function handleDeleteOrder(orderId: string) {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    const res = await fetch(`/api/sales/orders`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId }),
    });
    if (!res.ok) {
      console.error('Failed to delete order', await res.json());
      return;
    }
    refresh();
  }

  return { handleSaveQuote, handleDeleteOrder };
}
