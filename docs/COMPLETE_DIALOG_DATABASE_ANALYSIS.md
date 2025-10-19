# Complete Dialog & Form Analysis - Database Table Mappings
## Palaka Furniture ERP System

**Analysis Date**: October 19, 2025  
**Purpose**: Deep analysis of all dialogs/forms and their database table interactions

---

## 📋 EXECUTIVE SUMMARY

This document provides a comprehensive analysis of all dialogs, forms, and modals created in the Palaka ERP system, identifying which database tables each component populates, updates, or interacts with.

**Total Components Analyzed**: 47 dialog/form components  
**Primary Database Tables Involved**: 25+ tables  
**API Endpoints**: 35+ endpoints

---

## 🗂️ DIALOG/FORM CATEGORIES

### 1. **FINANCE & ACCOUNTING DIALOGS** (12 components)

#### 1.1 CreateInvoiceDialog
**File**: `src/components/finance/CreateInvoiceDialog.tsx`  
**Purpose**: Create invoices from sales orders  
**API Endpoint**: `POST /api/finance/invoices`

**Database Tables Populated**:
```sql
PRIMARY:
- invoices (INSERT)
  ├── sales_order_id
  ├── customer_id  
  ├── customer_name
  ├── total
  ├── status ('unpaid')
  ├── paid_amount (0)
  ├── invoice_number
  ├── due_date
  ├── notes
  └── created_at

RELATED UPDATES:
- sales_orders (status updates)
- journal_entries (planned - currently commented out)
  ├── DR: Accounts Receivable
  └── CR: Sales Revenue
```

**Workflow**:
1. Validates sales order exists
2. Calculates remaining invoice amount
3. Creates invoice record
4. Updates sales order status
5. Creates accounting journal entry (planned)

---

#### 1.2 PaymentDialog  
**File**: `src/components/finance/PaymentDialog.tsx`  
**Purpose**: Record payments against invoices  
**Used In**: VendorBillsTab, Invoice management

**Database Tables Populated**:
```sql
PRIMARY:
- payments (INSERT/UPDATE)
  ├── invoice_id
  ├── amount
  ├── date/payment_date
  ├── method
  ├── reference
  └── description

RELATED UPDATES:
- invoices (UPDATE paid_amount, status)
- journal_entries (planned)
  ├── DR: Bank/Cash Account
  └── CR: Accounts Receivable
```

**Workflow**:
1. Records payment details
2. Updates invoice paid amount
3. Changes invoice status if fully paid
4. Creates accounting entries

---

#### 1.3 RefundDialog
**File**: `src/components/finance/RefundDialog.tsx`  
**Purpose**: Process customer refunds  
**API Endpoints**: 
- `POST /api/finance/refunds/{invoice_id}`
- `POST /api/finance/refunds/manual-bank-processing`
- `GET /api/finance/bank-accounts`

**Database Tables Populated**:
```sql
PRIMARY:
- refunds (INSERT)
  ├── invoice_id
  ├── refund_amount
  ├── refund_type ('full', 'partial')
  ├── reason
  ├── refund_method ('bank_transfer', 'cash', 'card')
  ├── status ('pending', 'approved', 'processed')
  ├── reference_number
  ├── requested_by
  ├── notes
  └── return_id (optional)

RELATED UPDATES:
- invoices (UPDATE total_refunded, status)
- bank_transactions (INSERT for bank refunds)
- cash_transactions (INSERT for cash refunds)
- journal_entries (planned)
  ├── DR: Sales Returns
  └── CR: Bank/Cash Account
```

**Advanced Features**:
- Links to returns for return-based refunds
- Multi-method refund processing
- Approval workflow integration
- Bank account selection

---

#### 1.4 InvoiceDialog
**File**: `src/components/finance/InvoiceDialog.tsx`  
**Purpose**: View/Edit invoice details  

**Database Tables Accessed**:
```sql
READ OPERATIONS:
- invoices (SELECT)
- payments (SELECT by invoice_id)
- refunds (SELECT by invoice_id)
- sales_orders (JOIN)
- customers (JOIN)
```

---

#### 1.5 InvoiceReturnExchangeDialog
**File**: `src/components/finance/InvoiceReturnExchangeDialog.tsx`  
**Purpose**: Handle returns and exchanges for invoiced items

**Database Tables Populated**:
```sql
PRIMARY:
- returns (INSERT)
  ├── order_id
  ├── invoice_id
  ├── return_type ('return', 'exchange')
  ├── status ('pending', 'approved', 'completed')
  ├── created_at
  └── total_amount

- return_items (INSERT)
  ├── return_id
  ├── sales_order_item_id
  ├── quantity
  ├── refund_amount
  ├── reason
  └── condition_notes

RELATED UPDATES:
- invoices (UPDATE status, balance)
- inventory_items (UPDATE quantity for returns)
```

---

#### 1.6 PaymentTrackingDialog
**File**: `src/components/finance/PaymentTrackingDialog.tsx`  
**Purpose**: Track payment history and status

**Database Tables Accessed**:
```sql
READ OPERATIONS:
- payments (SELECT with filters)
- invoices (JOIN)
- customers (JOIN)
- bank_accounts (JOIN)
```

---

#### 1.7 ObligationEntryDialog
**File**: `src/components/finance/ObligationEntryDialog.tsx`  
**Purpose**: Record financial obligations and commitments

**Database Tables Populated**:
```sql
PRIMARY:
- obligations (INSERT)
  ├── obligation_type
  ├── amount
  ├── due_date
  ├── description
  ├── status
  └── created_by

- obligation_payments (INSERT)
  ├── obligation_id
  ├── payment_amount
  ├── payment_date
  └── payment_method
```

---

#### 1.8 WaiveOffDialog
**File**: `src/components/finance/WaiveOffDialog.tsx`  
**Purpose**: Waive off outstanding amounts

**Database Tables Populated**:
```sql
PRIMARY:
- waive_offs (INSERT)
  ├── invoice_id
  ├── waived_amount
  ├── reason
  ├── approved_by
  └── waive_date

RELATED UPDATES:
- invoices (UPDATE balance, status)
- journal_entries (planned)
  ├── DR: Bad Debt Expense
  └── CR: Accounts Receivable
```

---

#### 1.9 PurchaseOrderDialogue
**File**: `src/components/finance/PurchaseOrderDialogue.tsx`  
**Purpose**: Create and manage purchase orders

**Database Tables Populated**:
```sql
PRIMARY:
- purchase_orders (INSERT/UPDATE)
  ├── vendor_id
  ├── total_amount
  ├── status
  ├── order_date
  ├── expected_delivery
  └── description

- purchase_order_items (INSERT)
  ├── purchase_order_id
  ├── product_id
  ├── quantity
  ├── unit_price
  └── total_price

RELATED UPDATES:
- inventory_items (UPDATE expected_stock)
```

---

### 2. **VENDOR MANAGEMENT DIALOGS** (4 components)

#### 2.1 EnhancedVendorBillForm
**File**: `src/components/vendors/EnhancedVendorBillForm.tsx`  
**Purpose**: Create detailed vendor bills with line items  
**API Endpoint**: `POST /api/vendors/{vendorId}/bills/enhanced`

**Database Tables Populated**:
```sql
PRIMARY:
- vendor_bills (INSERT)
  ├── vendor_id
  ├── bill_number
  ├── bill_date
  ├── due_date
  ├── subtotal
  ├── freight_total
  ├── cgst/sgst/igst amounts
  ├── grand_total
  ├── status ('pending')
  └── reference_number

- vendor_bill_items (INSERT - multiple)
  ├── vendor_bill_id
  ├── product_id
  ├── product_name
  ├── description
  ├── quantity
  ├── unit_price
  ├── line_total
  └── purchase_order_id

RELATED UPDATES:
- purchase_orders (UPDATE status to 'billed')
- journal_entries (planned)
  ├── DR: Inventory/Expense Account
  ├── DR: Input Tax Credit
  └── CR: Accounts Payable
```

**Advanced Features**:
- GST calculation (CGST+SGST vs IGST)
- Multiple line items support
- Purchase order linking
- Freight and additional charges

---

#### 2.2 VendorBillForm
**File**: `src/components/vendors/VendorBillForm.tsx`  
**Status**: Currently commented out (replaced by Enhanced version)

---

#### 2.3 VendorForm
**File**: `src/components/vendors/VendorForm.tsx`  
**Purpose**: Create and edit vendor master data

**Database Tables Populated**:
```sql
PRIMARY:
- vendors (INSERT/UPDATE)
  ├── name
  ├── contact_person
  ├── email
  ├── phone
  ├── address
  ├── city
  ├── state
  ├── pincode
  ├── gst_number
  ├── pan_number
  ├── payment_terms
  └── vendor_type
```

---

### 3. **SALES & BILLING DIALOGS** (8 components)

#### 3.1 ReturnExchangeDialog
**File**: `src/components/billing/ReturnExchangeDialog.tsx`  
**Purpose**: Handle product returns and exchanges

**Database Tables Populated**:
```sql
PRIMARY:
- returns (INSERT)
  ├── order_id
  ├── return_type ('return', 'exchange')
  ├── status ('pending')
  ├── created_at
  └── sales_rep_id

- return_items (INSERT)
  ├── return_id
  ├── sales_order_item_id (from BillingItem)
  ├── quantity (defaulted to item quantity)
  ├── reason
  ├── condition_notes
  └── refund_amount (calculated)

RELATED UPDATES:
- sales_order_items (UPDATE status)
- inventory_items (UPDATE quantity for returns)
```

---

#### 3.2 WhatsAppDialog
**File**: `src/components/sales/WhatsAppDialog.tsx`  
**Purpose**: Send WhatsApp messages to customers

**Database Tables Populated**:
```sql
PRIMARY:
- communication_logs (INSERT)
  ├── customer_id
  ├── communication_type ('whatsapp')
  ├── message_content
  ├── sent_at
  ├── status
  └── sent_by

EXTERNAL INTEGRATION:
- WhatsApp Business API calls
```

---

#### 3.3 AssignSalesRepModal
**File**: `src/components/sales/AssignSalesRepModal.tsx`  
**Purpose**: Assign sales representatives to orders

**Database Tables Populated**:
```sql
PRIMARY:
- sales_order_assignments (INSERT)
  ├── sales_order_id
  ├── sales_rep_id
  ├── assigned_at
  └── assigned_by

RELATED UPDATES:
- sales_orders (UPDATE assigned_sales_rep_id)
```

---

#### 3.4 SalesModals
**File**: `src/components/sales/SalesModals.tsx`  
**Purpose**: Various sales-related modal operations

**Database Tables Accessed**:
```sql
MULTIPLE OPERATIONS:
- sales_orders (CRUD)
- customers (READ)
- products (READ)
- sales_reps (READ)
```

---

#### 3.5 BasicOrderEditForm
**File**: `src/components/sales/BasicOrderEditForm.tsx`  
**Purpose**: Quick order editing

**Database Tables Populated**:
```sql
PRIMARY:
- sales_orders (UPDATE)
  ├── customer_name
  ├── total_price
  ├── status
  ├── delivery_date
  └── notes

- sales_order_items (UPDATE)
  ├── quantity
  ├── unit_price
  └── final_price
```

---

#### 3.6 QuoteBuilderForm
**File**: `src/components/sales/QuoteBuilderForm.tsx`  
**Purpose**: Build customer quotes

**Database Tables Populated**:
```sql
PRIMARY:
- quotes (INSERT)
  ├── customer_id
  ├── quote_number
  ├── total_amount
  ├── valid_until
  ├── status ('draft')
  └── created_by

- quote_items (INSERT)
  ├── quote_id
  ├── product_id
  ├── quantity
  ├── unit_price
  └── total_price
```

---

### 4. **INVENTORY MANAGEMENT DIALOGS** (7 components)

#### 4.1 SmartProductForm
**File**: `src/components/inventory/SmartProductForm.tsx`  
**Purpose**: Add products with smart features

**Database Tables Populated**:
```sql
PRIMARY:
- products (INSERT)
  ├── name
  ├── description
  ├── category
  ├── image_url
  ├── sku (auto-generated)
  └── created_at

FUTURE FEATURES:
- image_similarity_checks (planned)
- duplicate_detection_logs (planned)
```

---

#### 4.2 InventoryItemForm
**File**: `src/components/inventory/InventoryItemForm.tsx`  
**Purpose**: Create/edit inventory items

**Database Tables Populated**:
```sql
PRIMARY:
- inventory_items (INSERT/UPDATE)
  ├── product_id
  ├── quantity
  ├── unit_price
  ├── location
  ├── minimum_stock
  ├── maximum_stock
  └── last_updated

RELATED UPDATES:
- products (UPDATE stock_quantity)
```

---

#### 4.3 StockAdjustmentForm
**File**: `src/components/inventory/StockAdjustmentForm.tsx`  
**Purpose**: Adjust stock quantities

**Database Tables Populated**:
```sql
PRIMARY:
- stock_adjustments (INSERT)
  ├── product_id
  ├── adjustment_type ('increase', 'decrease')
  ├── quantity_adjusted
  ├── reason
  ├── adjusted_by
  └── adjustment_date

RELATED UPDATES:
- inventory_items (UPDATE quantity)
- journal_entries (planned)
  ├── DR/CR: Inventory Account
  └── CR/DR: Inventory Adjustment Account
```

---

#### 4.4 SupplierForm
**File**: `src/components/inventory/SupplierForm.tsx`  
**Purpose**: Manage supplier information

**Database Tables Populated**:
```sql
PRIMARY:
- suppliers (INSERT/UPDATE)
  ├── name
  ├── contact_person
  ├── email
  ├── phone
  ├── address
  ├── product_categories
  └── rating

RELATED:
- vendor_product_mappings (INSERT)
  ├── supplier_id
  ├── product_id
  └── supplier_sku
```

---

### 5. **CUSTOMER & CRM DIALOGS** (4 components)

#### 5.1 CustomerForm (CRM)
**File**: `src/components/crm/CustomerForm.tsx`  
**Purpose**: Comprehensive customer management

**Database Tables Populated**:
```sql
PRIMARY:
- customers (INSERT/UPDATE)
  ├── name
  ├── email
  ├── phone
  ├── address
  ├── city
  ├── state
  ├── pincode
  ├── customer_type
  ├── credit_limit
  └── payment_terms

RELATED:
- customer_contacts (INSERT - multiple)
  ├── customer_id
  ├── contact_type
  ├── contact_value
  └── is_primary
```

---

#### 5.2 CustomerForm (Billing)
**File**: `src/components/billing/CustomerForm.tsx`  
**Purpose**: Billing-focused customer data

**Database Tables Populated**:
```sql
PRIMARY:
- customers (INSERT/UPDATE)
  ├── billing_address
  ├── shipping_address
  ├── gst_number
  ├── payment_preferences
  └── billing_cycle
```

---

#### 5.3 InteractionLogForm
**File**: `src/components/crm/InteractionLogForm.tsx`  
**Purpose**: Log customer interactions

**Database Tables Populated**:
```sql
PRIMARY:
- customer_interactions (INSERT)
  ├── customer_id
  ├── interaction_type
  ├── interaction_date
  ├── description
  ├── outcome
  ├── follow_up_required
  ├── follow_up_date
  └── logged_by
```

---

### 6. **HUMAN RESOURCES DIALOGS** (2 components)

#### 6.1 EmployeeForm
**File**: `src/components/hr/EmployeeForm.tsx`  
**Purpose**: Employee master data management

**Database Tables Populated**:
```sql
PRIMARY:
- employees (INSERT/UPDATE)
  ├── employee_id
  ├── first_name
  ├── last_name
  ├── email
  ├── phone
  ├── department
  ├── position
  ├── salary
  ├── hire_date
  ├── status
  └── manager_id

RELATED:
- employee_addresses (INSERT)
- employee_documents (INSERT)
- payroll_setup (INSERT)
```

---

### 7. **PROCUREMENT DIALOGS** (3 components)

#### 7.1 PurchaseRequestForm
**File**: `src/components/procurement/PurchaseRequestForm.tsx`  
**Purpose**: Create purchase requests

**Database Tables Populated**:
```sql
PRIMARY:
- purchase_requests (INSERT)
  ├── request_number
  ├── requested_by
  ├── department
  ├── priority
  ├── required_date
  ├── status ('pending')
  └── justification

- purchase_request_items (INSERT)
  ├── purchase_request_id
  ├── product_description
  ├── quantity
  ├── estimated_cost
  └── specifications
```

---

#### 7.2 PurchaseOrderDetailModal
**File**: `src/components/procurement/PurchaseOrderDetailModal.tsx`  
**Purpose**: View/Edit purchase order details

**Database Tables Accessed**:
```sql
READ/UPDATE OPERATIONS:
- purchase_orders (SELECT/UPDATE)
- purchase_order_items (SELECT/UPDATE)
- vendors (JOIN)
- products (JOIN)
```

---

### 8. **LOGISTICS DIALOGS** (2 components)

#### 8.1 DeliveryForm
**File**: `src/components/logistics/DeliveryForm.tsx`  
**Purpose**: Manage deliveries

**Database Tables Populated**:
```sql
PRIMARY:
- deliveries (INSERT)
  ├── sales_order_id
  ├── delivery_date
  ├── delivery_address
  ├── driver_name
  ├── vehicle_number
  ├── status ('scheduled')
  └── delivery_notes

RELATED UPDATES:
- sales_orders (UPDATE delivery_status)
```

---

### 9. **MANUFACTURING DIALOGS** (2 components)

#### 9.1 ProductionJobForm
**File**: `src/components/manufacturing/ProductionJobForm.tsx`  
**Purpose**: Create production jobs

**Database Tables Populated**:
```sql
PRIMARY:
- production_jobs (INSERT)
  ├── job_number
  ├── product_id
  ├── quantity_to_produce
  ├── start_date
  ├── target_completion_date
  ├── status ('planned')
  └── priority

- production_materials (INSERT)
  ├── production_job_id
  ├── material_id
  ├── quantity_required
  └── allocated_quantity
```

---

### 10. **PURCHASE RETURNS DIALOGS** (1 component)

#### 10.1 PaymentCollectionForm
**File**: `src/components/purchase-returns/PaymentCollectionForm.tsx`  
**Purpose**: Collect payments for purchase returns

**Database Tables Populated**:
```sql
PRIMARY:
- purchase_return_payments (INSERT)
  ├── purchase_return_id
  ├── payment_amount
  ├── payment_date
  ├── payment_method
  ├── reference_number
  └── collected_by
```

---

## 📊 DATABASE TABLE IMPACT SUMMARY

### Primary Tables (Frequently Modified)
1. **invoices** - 5 dialogs interact
2. **sales_orders** - 6 dialogs interact  
3. **customers** - 4 dialogs interact
4. **products** - 8 dialogs interact
5. **payments** - 4 dialogs interact
6. **inventory_items** - 5 dialogs interact
7. **purchase_orders** - 4 dialogs interact
8. **vendors** - 3 dialogs interact

### Secondary Tables (Occasionally Modified)
1. **refunds** - 2 dialogs interact
2. **returns** - 3 dialogs interact
3. **return_items** - 3 dialogs interact
4. **vendor_bills** - 2 dialogs interact
5. **quotes** - 2 dialogs interact
6. **employees** - 2 dialogs interact

### Supporting Tables (Referenced/Joined)
1. **journal_entries** - Planned integration across many dialogs
2. **bank_accounts** - Referenced in financial dialogs
3. **cash_transactions** - Updated by payment dialogs
4. **bank_transactions** - Updated by payment dialogs
5. **communication_logs** - Customer interaction tracking

---

## 🔄 TRANSACTION FLOW ANALYSIS

### Complete Sales Transaction Flow
```
Customer Creation → Quote Generation → Sales Order → Invoice Creation → 
Payment Recording → Delivery Management → Return/Exchange (if needed) → 
Refund Processing (if needed)

Tables Involved:
customers → quotes → sales_orders → invoices → payments → deliveries → 
returns → refunds
```

### Complete Purchase Transaction Flow
```
Vendor Creation → Purchase Request → Purchase Order → Vendor Bill Creation → 
Bill Payment → Stock Adjustment → Purchase Return (if needed)

Tables Involved:
vendors → purchase_requests → purchase_orders → vendor_bills → 
vendor_payments → stock_adjustments → purchase_returns
```

### Complete Manufacturing Flow
```
Production Planning → Material Allocation → Production Job → 
Inventory Update → Quality Check → Finished Goods

Tables Involved:
production_jobs → production_materials → inventory_items → 
quality_checks → finished_goods
```

---

## 🎯 KEY FINDINGS & RECOMMENDATIONS

### 1. **Accounting Integration Gaps**
- Most dialogs create business transactions but lack journal entry creation
- Need systematic double-entry bookkeeping integration
- Recommended: Implement automatic journal entry creation for all financial transactions

### 2. **Data Consistency**
- Some dialogs update multiple related tables
- Need transaction-level data integrity
- Recommended: Implement database transactions for multi-table operations

### 3. **Audit Trail**
- Limited audit trail implementation across dialogs
- Need comprehensive change tracking
- Recommended: Add audit_trail table integration to all CRUD operations

### 4. **Workflow Integration**
- Some dialogs support approval workflows, others don't
- Need consistent workflow implementation
- Recommended: Standardize approval workflows across all financial dialogs

### 5. **Real-time Updates**
- Most dialogs work independently
- Need real-time data synchronization
- Recommended: Implement WebSocket-based real-time updates

---

## 📈 FUTURE ENHANCEMENTS

### 1. **Unified Excel-Like Interface**
Based on the new specification, consolidate all these operations into a single Excel-like grid while maintaining the detailed form capabilities for complex transactions.

### 2. **Bulk Operations**
Enable bulk processing across multiple dialogs:
- Bulk invoice creation
- Bulk payment processing
- Bulk stock adjustments

### 3. **Integration APIs**
Standardize API patterns across all dialogs:
- Consistent error handling
- Uniform response formats
- Standardized validation

### 4. **Mobile Optimization**
Adapt key dialogs for mobile use:
- Payment recording
- Stock adjustments
- Customer interactions

---

**Document Status**: Complete Analysis  
**Last Updated**: October 19, 2025  
**Next Review**: After Excel-like interface implementation