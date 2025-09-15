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
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  floor?: string;
  notes?: string;
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
  cost?: number; // Cost price for profit calculation
  final_price?: number; // Final price after discounts
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
  original_price?: number;
  final_price?: number;
  discount_amount?: number;
  emi_enabled?: boolean;
  emi_monthly?: number;
  freight_charges?: number;
  notes?: string;
  // Partial Payment Fields
  payment_status?: 'pending' | 'partial' | 'paid' | 'overdue';
  total_paid?: number;
  remaining_balance?: number;
  payment_history?: {
    id: string;
    amount: number;
    date: string;
    method: 'cash' | 'card' | 'bank_transfer' | 'check';
    reference?: string;
    notes?: string;
  }[];
  status: 'Draft' | 'Pending' | 'Submitted' | 'Approved' | 'Rejected' | 'Converted';
  created_by: string;
  created_at: string;
}

export type OrderStatus = 'draft' | 'confirmed' | 'shipped' | 'delivered';

export interface SalesOrder {
  id: string;
  customer_id: string;
  customer: { name: string; phone?: string } | null;
  items: OrderItem[];
  total_price: number;
  total?: number; // From API response
  original_price?: number;
  final_price?: number;
  discount_amount?: number;
  order_number?: string; // From database
  emi_enabled?: boolean;
  emi_monthly?: number;
  freight_charges?: number;
  notes?: string;
  // Partial Payment Fields
  payment_status?: 'pending' | 'partial' | 'paid' | 'overdue';
  total_paid?: number;
  remaining_balance?: number;
  payment_history?: {
    id: string;
    amount: number;
    date: string;
    method: 'cash' | 'card' | 'bank_transfer' | 'check';
    reference?: string;
    notes?: string;
  }[];
  // Invoice tracking
  invoices?: {
    id: string;
    total: number;
    status: InvoiceStatus;
  }[];
  status: 'draft' | 'confirmed' | 'shipped' | 'delivered';
  created_by: string;
  created_at: string;
  date?: string; // From API response (formatted date)
  quote_id?: string;
  deliveryAddress?: string;
  deliveryDate?: string;
}

export interface Order {
  id: string;
  customer_id?: string;
  customer: { name: string } | null;
  supplier_name?: string;
  items: OrderItem[];
  total: number;
  final_price?: number;
  original_price?: number;
  discount_amount?: number;
  status: OrderStatus;
  date: string;
  quote_id?: string;
  reserved_stock?: { product: string, qty: number }[];
  deliveryAddress?: string;
  deliveryDate?: string;
  // Payment information
  total_paid?: number;
  balance_due?: number;
  payment_status?: 'paid' | 'partial' | 'pending' | 'overdue';
  payment_count?: number;
  // Sales representative information
  created_by?: string;
  sales_representative?: {
    id: string;
    name: string;
    email: string;
  };
  // Additional delivery fields
  expected_delivery_date?: string;
  delivery_floor?: string;
  first_floor_awareness?: boolean;
  notes?: string;
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
  id:             string;
  supplier_id:    string;
  product_id:     string;
  quantity:       number;
  status:         'pending' | 'approved' | 'received';
  is_custom?:     boolean;
  custom_type?:   string | null;
  product_name?:  string | null;
  materials?:     string[] | null;
  description?:   string | null;
  created_by?:    string;
  created_at?:    string;
  sales_order_id?: string;
  supplier?:      { id: string; name: string };
  product?:       { id: string; name: string };
  creator?:       { id: string; name: string };
  sales_order?:   { 
    id: string; 
    created_by: string; 
    customer_id: string;
    customer_name: string;
    expected_delivery_date?: string | null;
    sales_rep: { id: string; name: string }[];
    customer: { id: string; name: string; address?: string; city?: string; state?: string; pincode?: string }[];
  };
  images?:        string[]; // URLs of uploaded images
  total?:         number | null; // Total cost, calculated if product_id exists
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'partially_paid';

export interface Invoice {
  id: string;
  invoice_number: string;
  sales_order_id: string;
  customer_id: string;
  customer_name: string;
  status: InvoiceStatus;
  total: number;
  paid_amount: number;
  amount: number;
  waived_amount?: number;
  balance_due?: number;
  date?: string;
  created_at: string;
  due_date: string;
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
  customer_name: string;
  notes?: string;
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
  // ============= OWNER'S DRAWINGS (Equity) =============
  "Home Expenses": { category: "Owner's Drawings", type: "Equity", accountCode: "3200" },
  "Personal Withdrawals": { category: "Owner's Drawings", type: "Equity", accountCode: "3200" },
  "Gold Load": { category: "Owner's Drawings", type: "Equity", accountCode: "3200" },
  "Servant Salary": { category: "Owner's Drawings", type: "Equity", accountCode: "3200" },
  "Asharaf Withdrawal": { category: "Owner's Drawings", type: "Equity", accountCode: "3200" },
  "Shahid Withdrawal": { category: "Owner's Drawings", type: "Equity", accountCode: "3200" },
  "Main Loan": { category: "Owner's Drawings", type: "Equity", accountCode: "3200" },
  "Small Loan": { category: "Owner's Drawings", type: "Equity", accountCode: "3200" },

  // ============= DIRECT EXPENSES (Cost of Goods Sold) =============
  // Raw Materials
  "Raw Materials - Wood": { category: "Raw Materials", type: "Direct", accountCode: "5100" },
  "Raw Materials - Metal": { category: "Raw Materials", type: "Direct", accountCode: "5101" },
  "Raw Materials - Fabric": { category: "Raw Materials", type: "Direct", accountCode: "5102" },
  "Raw Materials - Hardware": { category: "Raw Materials", type: "Direct", accountCode: "5103" },
  "Raw Materials - Foam": { category: "Raw Materials", type: "Direct", accountCode: "5104" },
  "Raw Materials - Glass": { category: "Raw Materials", type: "Direct", accountCode: "5105" },
  
  // Direct Labor
  "Direct Labor - Manufacturing": { category: "Direct Labor", type: "Direct", accountCode: "5200" },
  "Direct Labor - Assembly": { category: "Direct Labor", type: "Direct", accountCode: "5201" },
  "Direct Labor - Finishing": { category: "Direct Labor", type: "Direct", accountCode: "5202" },
  "Direct Labor - Quality Control": { category: "Direct Labor", type: "Direct", accountCode: "5203" },
  
  // Manufacturing Overhead
  "Factory Utilities": { category: "Manufacturing Overhead", type: "Variable", accountCode: "5300" },
  "Factory Rent": { category: "Manufacturing Overhead", type: "Fixed", accountCode: "5301" },
  "Factory Maintenance": { category: "Manufacturing Overhead", type: "Variable", accountCode: "5302" },
  "Factory Supplies": { category: "Manufacturing Overhead", type: "Variable", accountCode: "5303" },
  "Equipment Depreciation": { category: "Manufacturing Overhead", type: "Fixed", accountCode: "5304" },
  
  // ============= INDIRECT EXPENSES (Operating Expenses) =============
  // Administrative Expenses
  "Office Rent": { category: "Administrative", type: "Fixed", accountCode: "6100" },
  "Office Utilities": { category: "Administrative", type: "Fixed", accountCode: "6101" },
  "Office Supplies": { category: "Administrative", type: "Variable", accountCode: "6102" },
  "Office Equipment": { category: "Administrative", type: "Variable", accountCode: "6103" },
  "Telephone & Internet": { category: "Administrative", type: "Fixed", accountCode: "6104" },
  "Professional Services": { category: "Administrative", type: "Variable", accountCode: "6105" },
  "Legal & Audit Fees": { category: "Administrative", type: "Variable", accountCode: "6106" },
  "Bank Charges": { category: "Administrative", type: "Variable", accountCode: "6107" },
  
  // Salaries & Benefits
  "Administrative Salaries": { category: "Salaries & Benefits", type: "Fixed", accountCode: "6200" },
  "Sales Salaries": { category: "Salaries & Benefits", type: "Fixed", accountCode: "6201" },
  "Management Salaries": { category: "Salaries & Benefits", type: "Fixed", accountCode: "6202" },
  "Employee Benefits": { category: "Salaries & Benefits", type: "Fixed", accountCode: "6203" },
  "Provident Fund": { category: "Salaries & Benefits", type: "Fixed", accountCode: "6204" },
  "Employee Insurance": { category: "Salaries & Benefits", type: "Fixed", accountCode: "6205" },
  "Training & Development": { category: "Salaries & Benefits", type: "Variable", accountCode: "6206" },
  
  // Marketing & Sales
  "Advertising": { category: "Marketing & Sales", type: "Variable", accountCode: "6300" },
  "Digital Marketing": { category: "Marketing & Sales", type: "Variable", accountCode: "6010" }, // Advertising & Marketing
  "Sales Promotion": { category: "Marketing & Sales", type: "Variable", accountCode: "6010" }, // Advertising & Marketing
  "Trade Shows": { category: "Marketing & Sales", type: "Variable", accountCode: "6010" }, // Advertising & Marketing
  "Sales Commission": { category: "Marketing & Sales", type: "Variable", accountCode: "6304" },
  "Customer Entertainment": { category: "Marketing & Sales", type: "Variable", accountCode: "6305" },
  
  // Logistics & Distribution
  "Transportation": { category: "Logistics & Distribution", type: "Variable", accountCode: "6400" },
  "Freight & Shipping": { category: "Logistics & Distribution", type: "Variable", accountCode: "6401" },
  "Packaging Materials": { category: "Logistics & Distribution", type: "Variable", accountCode: "6040" }, // Showroom Expenses
  "Warehouse Rent": { category: "Logistics & Distribution", type: "Fixed", accountCode: "6403" },
  "Storage & Handling": { category: "Logistics & Distribution", type: "Variable", accountCode: "6404" },
  "Delivery Vehicle Expenses": { category: "Logistics & Distribution", type: "Variable", accountCode: "6405" },
  
  // Technology & Software
  "Software Licenses": { category: "Technology", type: "Fixed", accountCode: "6500" },
  "IT Support": { category: "Technology", type: "Variable", accountCode: "6501" },
  "Website Maintenance": { category: "Technology", type: "Fixed", accountCode: "6502" },
  "Cloud Services": { category: "Technology", type: "Variable", accountCode: "6503" },
  "Hardware & Equipment": { category: "Technology", type: "Variable", accountCode: "6504" },
  
  // Insurance & Protection
  "General Insurance": { category: "Insurance", type: "Fixed", accountCode: "6520" }, // Insurance
  "Product Liability": { category: "Insurance", type: "Fixed", accountCode: "6601" },
  "Property Insurance": { category: "Insurance", type: "Fixed", accountCode: "6602" },
  "Vehicle Insurance": { category: "Insurance", type: "Fixed", accountCode: "6603" },
  "Workers Compensation": { category: "Insurance", type: "Fixed", accountCode: "6604" },
  
  // Maintenance & Repairs
  "Equipment Maintenance": { category: "Maintenance & Repairs", type: "Variable", accountCode: "6700" },
  "Building Maintenance": { category: "Maintenance & Repairs", type: "Variable", accountCode: "6701" },
  "Vehicle Maintenance": { category: "Maintenance & Repairs", type: "Variable", accountCode: "6702" },
  "Tools & Equipment": { category: "Maintenance & Repairs", type: "Variable", accountCode: "6703" },
  
  // Travel & Entertainment
  "Business Travel": { category: "Travel & Entertainment", type: "Variable", accountCode: "6800" },
  "Accommodation": { category: "Travel & Entertainment", type: "Variable", accountCode: "6801" },
  "Meals & Entertainment": { category: "Travel & Entertainment", type: "Variable", accountCode: "6802" },
  "Vehicle Expenses": { category: "Travel & Entertainment", type: "Variable", accountCode: "6803" },
  
  // Vehicle Fleet Management (using existing chart of accounts)
  "Vehicle Fuel - Fleet": { category: "Vehicle Fleet", type: "Variable", accountCode: "6030" }, // Delivery Expenses
  "Vehicle Maintenance - Fleet": { category: "Vehicle Fleet", type: "Variable", accountCode: "6430" }, // Maintenance & Repairs
  "Vehicle Fuel - Delivery Van": { category: "Vehicle Fleet", type: "Variable", accountCode: "6030" }, // Delivery Expenses
  "Vehicle Maintenance - Delivery Van": { category: "Vehicle Fleet", type: "Variable", accountCode: "6430" }, // Maintenance & Repairs
  "Vehicle Insurance - Fleet": { category: "Vehicle Fleet", type: "Fixed", accountCode: "6520" }, // Insurance
  "Vehicle Registration & Tax": { category: "Vehicle Fleet", type: "Fixed", accountCode: "6250" }, // Payroll Taxes (govt fees)
  "Driver Salaries": { category: "Vehicle Fleet", type: "Fixed", accountCode: "6200" }, // Salaries & Wages
  "Vehicle Parking & Tolls": { category: "Vehicle Fleet", type: "Variable", accountCode: "6550" }, // Travel & Entertainment
  
  // Daily Wages & Contract Labor (using existing salary accounts)
  "Daily Wages - Construction": { category: "Salaries & Benefits", type: "Variable", accountCode: "6220" }, // Production Wages
  "Daily Wages - Loading": { category: "Salaries & Benefits", type: "Variable", accountCode: "6220" }, // Production Wages
  "Daily Wages - Cleaning": { category: "Salaries & Benefits", type: "Variable", accountCode: "6440" }, // Cleaning & Janitorial
  "Contract Labor": { category: "Salaries & Benefits", type: "Variable", accountCode: "6510" }, // Professional Services
  "Overtime Payment": { category: "Salaries & Benefits", type: "Variable", accountCode: "6240" }, // Overtime Pay
  "Temporary Staff": { category: "Salaries & Benefits", type: "Variable", accountCode: "6200" }, // Salaries & Wages
  
  // Vendor/Supplier Payments (using existing accounts)
  "Vendor Payment - Raw Materials": { category: "Accounts Payable", type: "Variable", accountCode: "2010" }, // Accounts Payable
  "Vendor Payment - Services": { category: "Accounts Payable", type: "Variable", accountCode: "2010" }, // Accounts Payable
  "Supplier Advance": { category: "Prepaid Expenses", type: "Variable", accountCode: "1400" }, // Prepaid Expenses
  
  // Miscellaneous (using existing accounts)
  "Research & Development": { category: "Research & Development", type: "Variable", accountCode: "7000" }, // OTHER EXPENSES
  "Donations & CSR": { category: "Miscellaneous", type: "Variable", accountCode: "7000" }, // OTHER EXPENSES
  "Miscellaneous Expenses": { category: "Miscellaneous", type: "Variable", accountCode: "7000" }, // OTHER EXPENSES
  "Bad Debts": { category: "Miscellaneous", type: "Variable", accountCode: "7040" }, // Bad Debt Expense
  
  // Legacy categories for backward compatibility
  "Insurance": { category: "Insurance", type: "Fixed", accountCode: "6520" }, // Insurance
  "Packaging": { category: "Logistics & Distribution", type: "Variable", accountCode: "6040" }, // Showroom Expenses
  "Shipping": { category: "Logistics & Distribution", type: "Variable", accountCode: "6401" },
  "Freight": { category: "Logistics & Distribution", type: "Variable", accountCode: "6401" },
  "Maintenance": { category: "Maintenance & Repairs", type: "Variable", accountCode: "6700" },
  "Tools": { category: "Maintenance & Repairs", type: "Variable", accountCode: "6703" },
  "Furniture": { category: "Raw Materials", type: "Direct", accountCode: "5100" },
  "Wood": { category: "Raw Materials", type: "Direct", accountCode: "5100" },
  "Marketing Campaign": { category: "Marketing & Sales", type: "Variable", accountCode: "6300" },
  "Other": { category: "Miscellaneous", type: "Variable", accountCode: "7000" }, // OTHER EXPENSES
  "Fabric": { category: "Raw Materials", type: "Direct", accountCode: "5102" },
  "Machinery": { category: "Technology", type: "Variable", accountCode: "6504" },
  "Rent": { category: "Administrative", type: "Fixed", accountCode: "6100" },
  "Salaries": { category: "Salaries & Benefits", type: "Fixed", accountCode: "6200" },
  "Electricity": { category: "Administrative", type: "Fixed", accountCode: "6101" },
  "Internet": { category: "Administrative", type: "Fixed", accountCode: "6104" },
  "Utilities": { category: "Administrative", type: "Fixed", accountCode: "6101" },
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

// Billing System Interfaces
export interface BillingCustomer {
  customer_id: string;
  id?: string; // Additional compatibility field
  name: string; // Required field as per DB schema
  full_name?: string; // Alias for compatibility
  phone?: string;
  email?: string;
  address?: string; // Required field
  floor?: string; // Required field as per DB schema
  city?: string;
  state?: string;
  pincode?: string;
  gst_number?: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  status?: string;
  source?: string; // Added for database compatibility
  customer_type?: string;
  notes?: string;
  tags?: string[]; // Purpose of visit and other tags
  latitude?: number;
  longitude?: number;
  geocoded_at?: string;
  formatted_address?: string;
}

export interface CustomProduct {
  id?: string;
  name: string;
  description: string;
  price: number;
  cost?: number;
  cost_price?: number | null; // Database field name
  category?: string;
  material?: string;
  lead_time_days?: number;
  subcategory?: string;
  supplier_name?: string;
  supplier_id?: string;
  config_schema?: Record<string, unknown>;
  sku?: string;
}

export interface BillingItem {
  id: string;
  product?: ProductWithInventory;
  customProduct?: CustomProduct;
  quantity: number;
  originalPrice: number;
  finalPrice: number;
  totalPrice: number;
  discountAmount: number;
  discountPercentage: number;
  tax: number;
  isCustom: boolean;
  globalDiscountApplied?: number; // Track global discount applied to this item
}

export interface PaymentMethod {
  id: string;
  type: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'cheque' | 'emi';
  amount: number;
  reference?: string;
}

export interface BillingData {
  customer: BillingCustomer | null;
  items: BillingItem[];
  paymentMethods: PaymentMethod[];
  finalTotal: number;
  notes: string;
  deliveryDate?: string;
  deliveryFloor?: string; // New field for floor selection
  isFirstFloorAwareness?: boolean; // New field for 1st floor awareness
  selectedSalesman?: { id: string; name: string; email?: string; user_id?: string } | null;
  bajajFinanceData?: {
    orderAmount: number;
    financeAmount: number;
    downPayment: number;
    plan: {
      code: '6/0' | '10/2';
      name: string;
      description: string;
      months: number;
      interestRate: number;
      downPaymentMonths: number;
      processingFee: number;
      minAmount: number;
      maxAmount: number;
    };
    monthlyEMI: number;
    totalAmount: number;
    totalInterest: number;
    processingFee: number;
    additionalCharges: number;
    hasBajajCard: boolean;
    grandTotal: number;
    approvedAmount: number;
    finalBillAmount: number;
    bajajServiceCharge: number;
    isSplitBill?: boolean;
    splitBillBajajAmount?: number;
    splitBillOtherAmount?: number;
    splitBillOtherPaymentMethods?: string[];
  } | null; // Add Bajaj Finance data to track card status and charges
  totals: {
    original_price: number;
    total_price: number;
    final_price: number;
    discount_amount: number;
    subtotal: number;
    tax: number;
    tax_percentage: number;
    freight_charges: number;
    grandTotal: number;
  };
}

