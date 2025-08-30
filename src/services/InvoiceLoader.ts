// services/InvoiceLoader.ts - Simple version for loading quote/order data into billing form

interface LoadedData {
  type: 'quote' | 'order';
  data: Record<string, unknown>;
  isEditing: boolean;
  existingId: string;
  existingQuoteId?: string;
  existingStatus: string;
}

export class InvoiceDataLoader {
  /**
   * Load quote data and transform it into billing form
   */
  static async loadQuoteIntoBilling(quoteId: string): Promise<LoadedData | null> {
    try {
      console.log('Loading quote into billing form:', quoteId);
      
      // Try to fetch individual quote first for better data
      let quote;
      try {
        const singleResponse = await fetch(`/api/sales/quotes/${quoteId}`);
        if (singleResponse.ok) {
          quote = await singleResponse.json();
          console.log('Quote data loaded from individual API:', quote);
        }
      } catch {
        console.log('Individual quote API not available, using list API');
      }
      
      // Fallback to list API if individual API not available
      if (!quote) {
        const response = await fetch('/api/sales/quotes');
        if (!response.ok) {
          throw new Error('Failed to fetch quotes');
        }
        
        const data = await response.json();
        quote = data.quotes?.find((q: Record<string, unknown>) => q.id === quoteId);
        
        if (!quote) {
          throw new Error('Quote not found');
        }
        console.log('Quote data loaded from list API:', quote);
      }
      
      // Enhance quote data with customer details if available
      if (quote.customer_id && !quote.customer_details) {
        try {
          const customerResponse = await fetch(`/api/crm/customers/${quote.customer_id}`);
          if (customerResponse.ok) {
            const customerData = await customerResponse.json();
            quote.customer_details = customerData;
            console.log('Enhanced quote with customer details:', customerData);
          }
        } catch (error) {
          console.log('Could not fetch customer details:', error);
        }
      }
      
      // Return the quote data for the form to use
      return {
        type: 'quote',
        data: quote,
        isEditing: true,
        existingId: String(quote.id),
        existingStatus: String(quote.status)
      };
    } catch (error) {
      console.error('Error loading quote:', error);
      return null;
    }
  }
  
  /**
   * Load sales order data and transform it into billing form
   */
  static async loadSalesOrderIntoBilling(orderId: string): Promise<LoadedData | null> {
    try {
      console.log('Loading sales order into billing form:', orderId);
      
      // Try to fetch individual order first for better data
      let order;
      try {
        const singleResponse = await fetch(`/api/sales/orders/${orderId}`);
        if (singleResponse.ok) {
          order = await singleResponse.json();
          console.log('Order data loaded from individual API:', order);
        }
      } catch {
        console.log('Individual order API not available, using list API');
      }
      
      // Fallback to list API if individual API not available
      if (!order) {
        const response = await fetch('/api/sales/orders');
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        
        const data = await response.json();
        order = data.orders?.find((o: Record<string, unknown>) => o.id === orderId);
        
        if (!order) {
          throw new Error('Sales order not found');
        }
        console.log('Order data loaded from list API:', order);
      }
      
      // Enhance order data with customer details if available
      if (order.customer_id && !order.customer_details) {
        try {
          const customerResponse = await fetch(`/api/crm/customers/${order.customer_id}`);
          if (customerResponse.ok) {
            const customerData = await customerResponse.json();
            order.customer_details = customerData;
            console.log('Enhanced order with customer details:', customerData);
          }
        } catch (error) {
          console.log('Could not fetch customer details:', error);
        }
      }
      
      // Return the order data for the form to use
      return {
        type: 'order',
        data: order,
        isEditing: true,
        existingId: String(order.id),
        existingQuoteId: order.quote_id ? String(order.quote_id) : undefined,
        existingStatus: String(order.status)
      };
    } catch (error) {
      console.error('Error loading sales order:', error);
      return null;
    }
  }
}
