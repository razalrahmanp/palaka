// NEW: Added detailed roles and permissions
export type UserRole =
  | 'System Administrator'
  | 'Executive'
  | 'Sales Manager'
  | 'Sales Representative'
  | 'Procurement Manager'
  | 'Warehouse Manager'
  | 'Warehouse Staff'
  | 'Production Manager'
  | 'Production Staff'
  | 'Logistics Coordinator'
  | 'Delivery Driver'
  | 'Finance Manager'
  | 'HR Manager'
  | 'HR'
  | 'Employee';

export type Permission =
  | 'user:manage'
  | 'customer:create' | 'customer:read' | 'customer:read_own' | 'customer:update' | 'customer:update_own' | 'customer:delete'
  | 'product:create' | 'product:read' | 'product:update' | 'product:delete'
  | 'inventory:read' | 'inventory:update'
  | 'sales_order:create' | 'sales_order:read' | 'sales_order:read_own' | 'sales_order:approve'
  | 'purchase_order:create' | 'purchase_order:read' | 'purchase_order:approve'
  | 'bom:manage'
  | 'work_order:create' | 'work_order:update'
  | 'delivery:create' | 'delivery:assign' | 'delivery:read' | 'delivery:read_own' | 'delivery:update_status'
  | 'invoice:create' | 'payment:manage'
  | 'employee:manage' | 'employee:read_own' | 'employee:update_own'
  | 'salary:manage' | 'salary:read_own'
  | 'performance_review:create' | 'performance_review:update' | 'performance_review:read'
  | 'analytics:read' | 'dashboard:read' | 'report:read';

export interface User {
  name: string;
  id: string;
  email: string;
  password: string;
  role: UserRole;
  created_at: string;
  permissions: Permission[];
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: 'Lead' | 'Active' | 'Churned';
  source: 'Website' | 'Referral' | 'Trade Show';
  tags: string[];
  created_by?: string;
  created_at: string;
}

export interface Interaction {
  id: string;
  customer_id: string;
  type: 'Call' | 'Email' | 'Meeting';
  notes: string;
  interaction_date: string;
  created_by?: string;
  created_at: string;
}

// Added config_schema to Product type
export interface Product {
  id: string;
  name: string;
  price: number;
  supplier_name?: string;
  material: string;
  color: string;
  stock: number;
  config_schema?: { [key: string]: unknown };
  sku?: string;
  description?: string;
  category?: string;
    image_url?: string;
}

export interface OrderItem {
  product_id: string;
  name: string;
  quantity: number; 
  price: number;
  unit_price?: number; // Optional, used for quotes
  configuration?: Record<string, unknown>;
  supplier_name?: string;
  
}

// In types.ts
export interface OrderUpdatePayload {
  id: string;
  customer_id: string;
  status: string;
  delivery_date?: string;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
  }[];
  delivery_address: string;
}


export interface Quote {
  id: string;
  customer_id: string;
  customer: string;
  items: OrderItem[];
  total_price: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Converted';
  created_by: string;
  created_at: string;
}

export type OrderStatus = 'draft' | 'confirmed' | 'shipped' | 'delivered';


export interface Order {
  id: string;
  customer: string;
  supplier_name?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  date: string;
  quote_id?: string;
  reserved_stock?: { product: string, qty: number }[];
  deliveryAddress?: string;
  deliveryDate?: string;
}


export interface InventoryItem {
  name: string;
  stock: string | number;
  id: string
  product_id?: string
  product?: { name: string }
  category?: string
  subcategory?: string
  material?: string
  location?: string
  quantity: number
  reorder_point: number
  updated_at: string
}

export interface Supplier {
  id: string
  name: string
  contact?: string
  email?: string
  address?: string
  created_at?: string
  updated_at?: string
}

export interface ProductionRun {
    id: string;
    bom_id: string;
    product_id: string;
    product: string; // Name of the product being produced
    quantity: number;
    status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold' | 'Scheduled' | 'Quality Check' | 'Delayed';
    progress: number;
    stage: string;
    notes?: string;
    start_date: string;
    order_id?: string;
    assigned_to?: string;
    due_date?: string;
}

// 1. More detailed (for procurement process)

export interface PurchaseOrder {
  id:           string;
  supplier_id:  string;
  product_id:   string;
  quantity:     number;
  status:       'pending' | 'approved' | 'received';
  is_custom?:   boolean;
  custom_type?: string | null;
  materials?:   string[] | null;
  description?: string | null;
  created_by?:  string;
  created_at?:  string;
  supplier?:    { id: string; name: string };
  product?:     { id: string; name: string };
  images?:      string[]; // URLs of uploaded images
  total?:       number | null; // Total cost, calculated if product_id exists
}

export type InvoiceStatus = 'Paid' | 'Unpaid' | 'Overdue';

export interface Invoice {
  id: string;
  customer_name: string;
  status: InvoiceStatus;
  total: number;
  paid_amount: number;
  date?: string;
}

// src/types/index.ts
export interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
  description: string;
  invoice_id?: string;
  customer_id?: string;

}

// 2. Simpler one (for Finance UI)

export interface FinPurchaseOrder {
  products_id: { id: string; name: string; quantity: number; price: number; }[];
  paid_amount: number;
  due_date: string;
  payment_status: 'paid' | 'unpaid' | 'partially_paid';
  id: string;
  supplier?: {
    id: string;
    name: string;
  } | undefined;

  date: string;
  status: 'pending' | 'approved' | 'received';
  total: number;
  bank_account_id?: string | null;
}


export interface VendorBill {
    id: string;
    vendor_name: string;
    amount: number;
    invoice_no: string;
    status: 'Unpaid' | 'Paid';
    date: string;
}

export type DeliveryStatus = 'pending' | 'in_transit' | 'delivered';

export interface Delivery {
  id: string;
  sales_order_id: string;
  driver_id?: string;
  status: 'pending' | 'in_transit' | 'delivered';
  tracking_number?: string;
  updated_at: string;
  time_slot: string;

  driver?: {
    id: string;
    email: string;
  };

  sales_order?: {
    id: string;
    status: 'draft' | 'confirmed' | 'shipped' | 'delivered';
    address?: string;
    time_slot?: string;
    customer?: {
      id: string;
      name: string;
    };
  };
}

export interface DeliveryProof {
  id:          string;
  delivery_id: string;
  type:        'photo' | 'signature';
  url:         string;
  timestamp:   string;
}

export interface Alert {
  id: string;
  type: 'inventory' | 'production' | 'sales' | 'system' | 'hr' | 'finance' | 'procurement';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'unread' | 'read' | 'acknowledged' | 'resolved' | 'archived';
  source: string;
  assigned_to?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Represents a single row from inventory_product_view:
export interface ProductWithInventory {
  inventory_id: string;
  product_id: string;
  category: string | null;
  subcategory: string | null;
  material: string | null;
  location: string | null;
  quantity: number;
  reorder_point: number;
  updated_at: string;
  product_created_at?: string; // Add product creation date from products table
  supplier_name?: string | null;
  supplier_id?: string | null;
  price?: number | null;
  product_name: string;
  product_description?: string | null;
  product_category?: string | null;
  product_image_url?: string | null;
  sku?: string | null;
  applied_margin: number;
  cost: number;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;

    // New fields
  isCustom?: boolean; // true if custom
  configuration?: Record<string, unknown>; // optional config for custom products
  product_id: string | null;
  custom_supplier_id?:string | null;
  custom_supplier_name?: string | null;
   stockAvailable?: number;
}


export const subcategoryMap = {
  // Administration
  "Office Supplies": { category: "Administration", type: "Indirect" },

  // Insurance
  "Insurance": { category: "Insurance", type: "Fixed" },

  // Logistics
  "Packaging": { category: "Logistics", type: "Variable" },
  "Transportation": { category: "Logistics", type: "Variable" },
  "Shipping": { category: "Logistics", type: "Variable" },
  "Freight": { category: "Logistics", type: "Variable" },

  // Maintenance
  "Maintenance": { category: "Maintenance", type: "Fixed" },
  "Tools": { category: "Maintenance", type: "Fixed" },

  // Manufacturing
  "Furniture": { category: "Manufacturing", type: "Direct" },
  "Wood": { category: "Manufacturing", type: "Direct" },

  // Marketing
  "Marketing Campaign": { category: "Marketing", type: "Variable" },

  // Other
  "Other": { category: "Other", type: "Indirect" },

  // Production
  "Fabric": { category: "Production", type: "Direct" },
  "Machinery": { category: "Production", type: "Fixed" },

  // Rent
  "Rent": { category: "Rent", type: "Fixed" },

  // Salaries
  "Salaries": { category: "Salaries", type: "Fixed" },

  // Utilities
  "Electricity": { category: "Utilities", type: "Fixed" },
  "Internet": { category: "Utilities", type: "Fixed" },
  "Utilities": { category: "Utilities", type: "Fixed" },
};



// Define types for better type safety
export type ProductCost = {
  id: string;
  cost: string;
};

export type SalesOrderItem = {
  product_id: string;
  unit_price: string;
  quantity: number;
};

export type Expense = {
  amount: string;
};

export type MonthlyBreakdownItem = {
  month: string;
  total_revenue: string | number;
  total_expenses: string | number;
};

export type TopPerformer = {
  product_name: string;
  total_sales: number;
};

export type TopVendor = {
  vendor_name: string;
  total_spent: number;
};

export type TopSalesperson = {
  salesperson_name: string;
  total_sales: number;
};

export type DailySale = {
  day: string;
  total_sales: number;
};

export type WeeklySale = {
  week: string;
  total_sales: number;
};

export type MonthlySale = {
  month: string;
  total_sales: number;
};

// HR Management Types
export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  hire_date: string;
  salary?: number;
  status: 'Active' | 'Inactive' | 'On Leave';
  employment_status: 'active' | 'inactive' | 'terminated';
  employment_type: 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
  address?: string;
  date_of_birth?: string;
  emergency_contact?: string;
  emergency_contact_name?: string;
  emergency_phone?: string;
  emergency_contact_phone?: string;
  manager_id?: string;
  manager?: {
    name: string;
    employee_id: string;
  };
  user?: {
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

// System Settings Types
export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  category: string;
  description?: string;
  data_type: 'string' | 'number' | 'boolean' | 'json';
  created_at: string;
  updated_at: string;
}

