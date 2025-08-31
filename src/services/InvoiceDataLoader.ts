export class InvoiceDataLoader {
  /**
   * Load quote data into billing form for editing
   */
  static async loadQuoteIntoBilling(quoteId: string): Promise<{
    type: 'quote';
    data: Record<string, unknown>;
    isEditing: boolean;
    existingId: string;
    existingStatus: string;
  } | null> {
    try {
      console.log("Loading quote for editing:", quoteId);
      
      const response = await fetch(`/api/sales/quotes/${quoteId}`);
      if (!response.ok) {
        console.error("Failed to fetch quote:", response.status);
        return null;
      }
      
      const quote = await response.json();
      console.log("Loaded quote data:", quote);
      
      // Enhance quote data with customer_details for proper form population
      const enhancedQuote = {
        ...quote,
        // Ensure customer_details is available for address/contact population
        customer_details: quote.customer_details || quote.customers || {
          id: quote.customer_id,
          name: typeof quote.customer === 'string' ? quote.customer : 'Unknown Customer'
        }
      };
      
      console.log("Enhanced quote with customer details:", enhancedQuote.customer_details);
      
      return {
        type: 'quote',
        data: enhancedQuote,
        isEditing: true,
        existingId: quoteId,
        existingStatus: quote.status
      };
    } catch (error) {
      console.error("Error loading quote:", error);
      return null;
    }
  }

  /**
   * Load sales order data into billing form for editing
   */
  static async loadSalesOrderIntoBilling(orderId: string): Promise<{
    type: 'order';
    data: Record<string, unknown>;
    isEditing: boolean;
    existingId: string;
    existingQuoteId?: string;
    existingStatus: string;
  } | null> {
    try {
      console.log("Loading sales order for editing:", orderId);
      
      const response = await fetch(`/api/sales/orders/${orderId}`);
      if (!response.ok) {
        console.error("Failed to fetch sales order:", response.status);
        return null;
      }
      
      const order = await response.json();
      console.log("Loaded sales order data:", order);
      
      // Enhance order data with customer_details for proper form population
      const enhancedOrder = {
        ...order,
        // Ensure customer_details is available for address/contact population
        customer_details: order.customer || order.customers || {
          id: order.customer_id,
          name: typeof order.customer === 'string' ? order.customer : 'Unknown Customer'
        }
      };
      
      console.log("Enhanced order with customer details:", enhancedOrder.customer_details);
      
      return {
        type: 'order',
        data: enhancedOrder,
        isEditing: true,
        existingId: orderId,
        existingQuoteId: order.quote_id,
        existingStatus: order.status
      };
    } catch (error) {
      console.error("Error loading sales order:", error);
      return null;
    }
  }
}
