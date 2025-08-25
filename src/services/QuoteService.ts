// Quote Service to match mobile app workflow
import { CartItem, CreateQuoteRequest } from './CartService';

export interface Quote {
  id: string;
  quote_number: string;
  customer_id: string;
  status: 'Draft' | 'Pending_Approval' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired' | 'Converted' | 'Cancelled';
  valid_until?: Date;
  
  // Pricing Information
  subtotal: number;
  original_price: number;
  discount_amount: number;
  discount_percentage: number;
  tax_amount: number;
  freight_charges: number;
  total_price: number;
  final_price: number;
  
  // Financial Options
  emi_enabled: boolean;
  emi_plan: Record<string, string | number | boolean>;
  emi_monthly: number;
  bajaj_finance_amount: number;
  
  // Customer Information
  billing_address?: string;
  shipping_address?: string;
  customer_notes?: string;
  internal_notes?: string;
  
  // Sales Information
  sales_representative_id: string;
  probability_percentage: number;
  expected_close_date?: Date;
  
  // Metadata
  created_by: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  
  // Audit & Tracking
  revision_number: number;
  parent_quote_id?: string;
  conversion_date?: string;
  is_deleted: boolean;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  line_number: number;
  
  // Product Information
  product_id?: string;
  custom_product_id?: string;
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  
  // Pricing & Quantity
  quantity: number;
  unit_price: number;
  cost_price: number;
  discount_percentage: number;
  discount_amount: number;
  line_total: number;
  
  // Product Configuration
  configuration: Record<string, string | number | boolean>;
  specifications?: string;
  finish_type?: string;
  material?: string;
  dimensions?: string;
  color?: string;
  
  // Supplier Information
  supplier_id?: string;
  supplier_name?: string;
  supplier_part_number?: string;
  lead_time_days: number;
  
  // Media & Documentation
  image_url?: string;
  technical_drawing_url?: string;
  
  // Delivery Information
  delivery_timeline?: string;
  special_instructions?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export class QuoteService {
  /**
   * Create a new quote from cart items
   */
  static async createQuoteFromCart(request: CreateQuoteRequest): Promise<Quote> {
    try {
      // Validate the request
      await this.validateQuoteRequest(request);
      
      // Generate unique quote number
      const quoteNumber = await this.generateQuoteNumber();
      
      // Calculate totals
      const totals = this.calculateQuoteTotals(request.cart_items, request.pricing_options);
      
      // Prepare quote data
      const quoteData = {
        quote_number: quoteNumber,
        customer_id: request.customer_id,
        sales_representative_id: request.sales_representative_id,
        status: 'Draft' as const,
        valid_until: request.quote_details.valid_until?.toISOString(),
        billing_address: request.quote_details.billing_address,
        shipping_address: request.quote_details.shipping_address,
        customer_notes: request.quote_details.customer_notes,
        internal_notes: request.quote_details.internal_notes,
        probability_percentage: request.quote_details.probability_percentage || 50,
        expected_close_date: request.quote_details.expected_close_date?.toISOString(),
        created_by: request.sales_representative_id,
        revision_number: 1,
        is_deleted: false,
        ...totals
      };

      // Create quote record
      const quote = await this.createQuoteRecord(quoteData);
      
      // Create quote items
      await this.createQuoteItems(quote.id, request.cart_items);
      
      // Check if approval required
      if (await this.requiresApproval(quote)) {
        await this.createApprovalRequest(quote.id, totals.final_price);
      }
      
      return quote;
    } catch (error) {
      console.error('Failed to create quote:', error);
      throw new Error(`Failed to create quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate unique quote number
   */
  private static async generateQuoteNumber(): Promise<string> {
    const prefix = 'QT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Calculate quote totals from cart items and pricing options
   */
  private static calculateQuoteTotals(
    cartItems: CartItem[], 
    pricingOptions: CreateQuoteRequest['pricing_options']
  ) {
    const subtotal = cartItems.reduce((sum, item) => sum + item.line_total, 0);
    
    const additional_discount_amount = pricingOptions.discount_amount || 0;
    const additional_discount_percentage = pricingOptions.discount_percentage || 0;
    const additional_discount = (subtotal * additional_discount_percentage / 100) + additional_discount_amount;
    
    const original_price = subtotal;
    const discount_amount = additional_discount;
    const freight_charges = pricingOptions.freight_charges || (subtotal > 50000 ? 0 : 2000);
    const tax_amount = (subtotal - discount_amount) * 0.18; // 18% GST
    const total_price = subtotal - discount_amount + tax_amount + freight_charges;
    const final_price = pricingOptions.emi_enabled ? 
      pricingOptions.emi_plan?.total_amount || total_price : total_price;

    return {
      subtotal,
      original_price,
      discount_amount,
      discount_percentage: additional_discount_percentage,
      tax_amount,
      freight_charges,
      total_price,
      final_price,
      emi_enabled: pricingOptions.emi_enabled || false,
      emi_plan: pricingOptions.emi_plan || {},
      emi_monthly: pricingOptions.emi_plan?.monthly_amount || 0,
      bajaj_finance_amount: pricingOptions.emi_enabled ? 
        pricingOptions.emi_plan?.total_amount || 0 : 0
    };
  }

  /**
   * Create quote record in database
   */
  private static async createQuoteRecord(quoteData: Record<string, unknown>): Promise<Quote> {
    const response = await fetch('/api/quotes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quoteData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create quote');
    }

    return await response.json();
  }

  /**
   * Create quote items in database
   */
  private static async createQuoteItems(quoteId: string, cartItems: CartItem[]): Promise<void> {
    const quoteItems = cartItems.map((item, index) => ({
      quote_id: quoteId,
      line_number: index + 1,
      product_id: item.product_id,
      custom_product_id: item.custom_product_id,
      name: item.name,
      description: item.description,
      sku: item.sku,
      category: '', // Extract from product data
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_price: item.cost_price || 0,
      discount_percentage: item.discount_percentage,
      discount_amount: item.discount_amount,
      line_total: item.line_total,
      configuration: item.configuration || {},
      specifications: item.specifications,
      finish_type: item.finish_type,
      material: item.material,
      dimensions: item.dimensions,
      color: item.color,
      supplier_id: item.supplier_id,
      supplier_name: item.supplier_name,
      lead_time_days: item.lead_time_days || 0,
      image_url: item.image_url,
      delivery_timeline: item.lead_time_days ? `${item.lead_time_days} days` : undefined,
      special_instructions: item.notes
    }));

    const response = await fetch('/api/quote-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items: quoteItems })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create quote items');
    }
  }

  /**
   * Check if quote requires approval
   */
  private static async requiresApproval(quote: Quote): Promise<boolean> {
    const APPROVAL_RULES = [
      {
        condition: (q: Quote) => q.final_price > 100000 || q.discount_percentage > 10,
        level: 1
      },
      {
        condition: (q: Quote) => q.final_price > 500000 || q.discount_percentage > 20,
        level: 2
      },
      {
        condition: (q: Quote) => q.final_price > 1000000 || q.discount_percentage > 30,
        level: 3
      }
    ];

    return APPROVAL_RULES.some(rule => rule.condition(quote));
  }

  /**
   * Create approval request
   */
  private static async createApprovalRequest(quoteId: string, amount: number): Promise<void> {
    const response = await fetch('/api/quote-approvals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quote_id: quoteId,
        required_for_amount: amount
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create approval request');
    }
  }

  /**
   * Validate quote request
   */
  private static async validateQuoteRequest(request: CreateQuoteRequest): Promise<void> {
    if (!request.customer_id) {
      throw new Error('Customer is required');
    }

    if (!request.cart_items || request.cart_items.length === 0) {
      throw new Error('Cart items are required');
    }

    if (!request.sales_representative_id) {
      throw new Error('Sales representative is required');
    }

    // Validate cart items
    for (const item of request.cart_items) {
      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity for item: ${item.name}`);
      }
      if (item.unit_price <= 0) {
        throw new Error(`Invalid price for item: ${item.name}`);
      }
    }
  }

  /**
   * Get quote by ID
   */
  static async getQuoteById(quoteId: string): Promise<Quote | null> {
    try {
      const response = await fetch(`/api/quotes/${quoteId}`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get quote:', error);
      return null;
    }
  }

  /**
   * Get quote with items
   */
  static async getQuoteWithItems(quoteId: string): Promise<Quote & { items: QuoteItem[] } | null> {
    try {
      const response = await fetch(`/api/quotes/${quoteId}?include_items=true`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get quote with items:', error);
      return null;
    }
  }

  /**
   * Update quote status
   */
  static async updateQuoteStatus(quoteId: string, status: Quote['status']): Promise<void> {
    const response = await fetch(`/api/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update quote status');
    }
  }

  /**
   * Send quote to customer
   */
  static async sendQuote(quoteId: string): Promise<void> {
    await this.updateQuoteStatus(quoteId, 'Sent');
    
    // Here you could add email sending logic
    // await EmailService.sendQuoteToCustomer(quoteId);
  }

  /**
   * Accept quote
   */
  static async acceptQuote(quoteId: string): Promise<void> {
    await this.updateQuoteStatus(quoteId, 'Accepted');
  }

  /**
   * Convert quote to sales order
   */
  static async convertToSalesOrder(quoteId: string, orderData: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await fetch(`/api/quotes/${quoteId}/convert-to-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to convert quote to sales order');
    }

    return await response.json();
  }
}
