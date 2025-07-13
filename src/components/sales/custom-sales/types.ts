// src/components/sales/custom-orders/types.ts

export interface CustomOrderItem {
  quantity: number;
  unitPrice: number;
  productName: string;
  supplierName: string;
  productPrice: number;
}

export interface CustomOrder {
  orderId: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  totalPrice: number;
  items: CustomOrderItem[];
  poCreated?: boolean; // Indicates if a PO has been created for this order
}


// Types
export interface SalesOrderItem {
  quantity: number;
  unit_price: number;
  custom_product_id: string | null;
  custom_products: {
    id: string;
    name: string;
    supplier_name: string | null;
    price: number | null;
  } | null;
}

export interface SalesOrderRow {
  id: string;
  quote_id: string | null;
  created_at: string;
  customer_id: string;
  customers: {
    id: string;
    name: string;
  } | null;
  sales_order_items: SalesOrderItem[];
  po_created: boolean;
}

export interface QuoteCustomItem {
  quote_id: string;
  supplier_name: string | null;
  name: string;
}