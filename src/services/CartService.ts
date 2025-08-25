// Enhanced Cart Service to match mobile app structure
import { BillingCustomer } from '@/components/billing/CustomerForm';

export interface CartItem {
  id: string;
  type: 'product' | 'custom_product';
  product_id?: string;
  custom_product_id?: string;
  name: string;
  description?: string;
  sku?: string;
  
  // Quantity & Pricing
  quantity: number;
  unit_price: number;
  cost_price?: number;
  discount_percentage: number;
  discount_amount: number;
  line_total: number;
  
  // Configuration
  configuration?: Record<string, string | number | boolean>;
  specifications?: string;
  finish_type?: string;
  material?: string;
  dimensions?: string;
  color?: string;
  
  // Supplier Information
  supplier_id?: string;
  supplier_name?: string;
  lead_time_days?: number;
  
  // Media
  image_url?: string;
  
  // Notes
  notes?: string;
  internal_notes?: string;
  
  // Metadata
  added_at: string;
  updated_at: string;
}

export interface CartTotals {
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  freight_estimate: number;
  total: number;
  items_count: number;
}

export interface Cart {
  id: string;
  customer_id?: string;
  sales_rep_id: string;
  items: CartItem[];
  metadata: {
    session_id: string;
    created_at: string;
    updated_at: string;
    expires_at: string;
    device_id: string;
  };
  totals: CartTotals;
}

export interface CreateQuoteRequest {
  customer_id: string;
  sales_representative_id: string;
  cart_items: CartItem[];
  quote_details: {
    valid_until?: Date;
    billing_address?: string;
    shipping_address?: string;
    customer_notes?: string;
    internal_notes?: string;
    probability_percentage?: number;
    expected_close_date?: Date;
  };
  pricing_options: {
    discount_percentage?: number;
    discount_amount?: number;
    freight_charges?: number;
    emi_enabled?: boolean;
    emi_plan?: EMIPlan;
  };
}

export interface EMIPlan {
  tenure_months: number;
  interest_rate: number;
  monthly_amount: number;
  total_amount: number;
  processing_fee: number;
}

export class CartService {
  private static CART_KEY = 'alrams_billing_cart';

  static async getCart(): Promise<Cart> {
    const stored = localStorage.getItem(this.CART_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Create new cart
    const newCart: Cart = {
      id: this.generateCartId(),
      sales_rep_id: 'current-user-id', // Get from auth context
      items: [],
      metadata: {
        session_id: this.generateSessionId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        device_id: this.getDeviceId()
      },
      totals: this.calculateCartTotals([])
    };
    
    await this.saveCart(newCart);
    return newCart;
  }

  static async addItem(cartItem: Omit<CartItem, 'id' | 'added_at' | 'updated_at' | 'line_total'>): Promise<CartItem> {
    const cart = await this.getCart();
    
    // Create temporary item for validation
    const tempItem: CartItem = {
      ...cartItem,
      id: 'temp',
      line_total: 0,
      added_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Validate item
    await this.validateCartItem(tempItem);
    
    // Check for existing item (same product + configuration)
    const existingItem = this.findExistingItem(cart.items, tempItem);
    
    if (existingItem) {
      // Update quantity of existing item
      return this.updateItemQuantity(existingItem.id, existingItem.quantity + cartItem.quantity);
    } else {
      // Add new item
      const newItem: CartItem = {
        ...cartItem,
        id: this.generateItemId(),
        line_total: this.calculateLineTotal(tempItem),
        added_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      cart.items.push(newItem);
      cart.totals = this.calculateCartTotals(cart.items);
      cart.metadata.updated_at = new Date().toISOString();
      
      await this.saveCart(cart);
      return newItem;
    }
  }

  static async updateItemQuantity(itemId: string, newQuantity: number): Promise<CartItem> {
    const cart = await this.getCart();
    const item = cart.items.find(i => i.id === itemId);
    
    if (!item) {
      throw new Error('Cart item not found');
    }
    
    if (newQuantity <= 0) {
      await this.removeItem(itemId);
      throw new Error('Item removed');
    }
    
    // Validate new quantity
    await this.validateQuantity(item, newQuantity);
    
    item.quantity = newQuantity;
    item.line_total = this.calculateLineTotal(item);
    item.updated_at = new Date().toISOString();
    
    cart.totals = this.calculateCartTotals(cart.items);
    cart.metadata.updated_at = new Date().toISOString();
    
    await this.saveCart(cart);
    return item;
  }

  static async removeItem(itemId: string): Promise<void> {
    const cart = await this.getCart();
    cart.items = cart.items.filter(item => item.id !== itemId);
    cart.totals = this.calculateCartTotals(cart.items);
    cart.metadata.updated_at = new Date().toISOString();
    
    await this.saveCart(cart);
  }

  static async clearCart(): Promise<void> {
    const cart = await this.getCart();
    cart.items = [];
    cart.totals = this.calculateCartTotals([]);
    cart.metadata.updated_at = new Date().toISOString();
    
    await this.saveCart(cart);
  }

  static async updateCustomer(customer: BillingCustomer): Promise<void> {
    const cart = await this.getCart();
    cart.customer_id = customer.id;
    cart.metadata.updated_at = new Date().toISOString();
    
    await this.saveCart(cart);
  }

  private static findExistingItem(items: CartItem[], newItem: CartItem): CartItem | undefined {
    return items.find(item => 
      item.product_id === newItem.product_id &&
      item.custom_product_id === newItem.custom_product_id &&
      JSON.stringify(item.configuration) === JSON.stringify(newItem.configuration)
    );
  }

  private static calculateLineTotal(item: CartItem): number {
    const baseTotal = item.quantity * item.unit_price;
    const discountAmount = (baseTotal * item.discount_percentage / 100) + item.discount_amount;
    return Math.max(0, baseTotal - discountAmount);
  }

  private static calculateCartTotals(items: CartItem[]): CartTotals {
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const discount_amount = items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price * item.discount_percentage / 100) + item.discount_amount, 0);
    const tax_amount = subtotal * 0.18; // 18% GST
    const freight_estimate = subtotal > 50000 ? 0 : 2000; // Free freight above 50k
    const total = subtotal + tax_amount + freight_estimate;
    
    return {
      subtotal,
      discount_amount,
      tax_amount,
      freight_estimate,
      total,
      items_count: items.length
    };
  }

  private static async validateCartItem(item: CartItem): Promise<void> {
    // Validate stock availability
    if (item.product_id) {
      const response = await fetch(`/api/products/${item.product_id}`);
      const product = await response.json();
      
      if (!product || product.quantity < item.quantity) {
        throw new Error('Insufficient stock available');
      }
    }
    
    // Validate pricing
    if (item.unit_price <= 0) {
      throw new Error('Invalid unit price');
    }
  }

  private static async validateQuantity(item: CartItem, quantity: number): Promise<void> {
    if (item.product_id) {
      const response = await fetch(`/api/products/${item.product_id}`);
      const product = await response.json();
      
      if (!product || product.quantity < quantity) {
        throw new Error('Insufficient stock available');
      }
    }
  }

  private static async saveCart(cart: Cart): Promise<void> {
    localStorage.setItem(this.CART_KEY, JSON.stringify(cart));
  }

  private static generateCartId(): string {
    return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateItemId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static getDeviceId(): string {
    let deviceId = localStorage.getItem('alrams_device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('alrams_device_id', deviceId);
    }
    return deviceId;
  }
}
