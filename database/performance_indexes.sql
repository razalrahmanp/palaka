-- Performance Optimization Indexes for Palaka ERP
-- Run these in your Supabase SQL Editor for better performance

-- Vendors/Suppliers indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON suppliers(created_at);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_deleted ON suppliers(is_deleted);

-- Vendor Bills indexes
CREATE INDEX IF NOT EXISTS idx_vendor_bills_supplier ON vendor_bills(supplier_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_status ON vendor_bills(status);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_date ON vendor_bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_due_date ON vendor_bills(due_date);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_amount ON vendor_bills(total_amount);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_purchase_order ON vendor_bills(purchase_order_id);

-- Sales Orders indexes
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_orders_quote ON sales_orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_sales_rep ON sales_orders(sales_representative_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_expected_delivery ON sales_orders(expected_delivery_date);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_is_deleted ON products(is_deleted);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_is_deleted ON customers(is_deleted);
CREATE INDEX IF NOT EXISTS idx_customers_sales_rep ON customers(assigned_sales_rep_id);

-- Payments indexes (invoice payments)
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_amount ON payments(amount);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);
CREATE INDEX IF NOT EXISTS idx_payments_bank_account ON payments(bank_account_id);

-- Cash Transactions indexes
CREATE INDEX IF NOT EXISTS idx_cash_transactions_type ON cash_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON cash_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_amount ON cash_transactions(amount);

-- Employee indexes
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);
CREATE INDEX IF NOT EXISTS idx_employees_employment_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);

-- Purchase Orders indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(created_at);

-- Attendance Records indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);

-- Quotes indexes
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_vendor_bills_supplier_status ON vendor_bills(supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_supplier_date ON vendor_bills(supplier_id, bill_date);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status_date ON sales_orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_status ON sales_orders(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_products_supplier_deleted ON products(supplier_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_customers_status_deleted ON customers(status, is_deleted);
CREATE INDEX IF NOT EXISTS idx_employees_status_department ON employees(employment_status, department);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records(employee_id, date);

-- Text search indexes (PostgreSQL full-text search)
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, ''))) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers USING gin(to_tsvector('english', name || ' ' || COALESCE(phone, '') || ' ' || COALESCE(email, ''))) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_suppliers_search ON suppliers USING gin(to_tsvector('english', name || ' ' || COALESCE(contact, ''))) WHERE is_deleted = false;

-- Partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_active_suppliers ON suppliers(id, name) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_pending_vendor_bills ON vendor_bills(supplier_id, total_amount, due_date) WHERE status IN ('pending', 'partial', 'overdue');
CREATE INDEX IF NOT EXISTS idx_active_products ON products(id, name, supplier_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_delivered_orders ON sales_orders(id, final_price, created_at) WHERE status = 'delivered';
CREATE INDEX IF NOT EXISTS idx_active_employees ON employees(id, name, department) WHERE employment_status = 'active';
CREATE INDEX IF NOT EXISTS idx_active_customers ON customers(id, name, assigned_sales_rep_id) WHERE is_deleted = false;

-- Statistics update for query planner
ANALYZE suppliers;
ANALYZE vendor_bills;
ANALYZE sales_orders;
ANALYZE products;
ANALYZE customers;
ANALYZE payments;
ANALYZE cash_transactions;
ANALYZE employees;
ANALYZE purchase_orders;
ANALYZE attendance_records;
ANALYZE quotes;