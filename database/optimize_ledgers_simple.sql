-- Simple optimized customer ledger summary function (without trigram search)
-- This function pre-aggregates data to reduce multiple queries

CREATE OR REPLACE FUNCTION get_customer_ledger_summary(
  search_term TEXT DEFAULT '',
  hide_zero BOOLEAN DEFAULT FALSE,
  page_offset INTEGER DEFAULT 0,
  page_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  type TEXT,
  email TEXT,
  phone TEXT,
  total_transactions BIGINT,
  total_amount NUMERIC,
  balance_due NUMERIC,
  last_transaction_date TIMESTAMPTZ,
  status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH customer_orders AS (
    SELECT 
      c.id,
      c.name,
      c.email,
      c.phone,
      COUNT(so.id) as order_count,
      COALESCE(SUM(so.final_price), 0) as total_sales,
      COALESCE(SUM(so.waived_amount), 0) as total_waived,
      MAX(so.created_at) as last_order_date
    FROM customers c
    LEFT JOIN sales_orders so ON c.id = so.customer_id
    WHERE c.is_deleted = FALSE
      AND (search_term = '' OR 
           c.name ILIKE '%' || search_term || '%' OR
           c.email ILIKE '%' || search_term || '%' OR
           c.phone ILIKE '%' || search_term || '%')
    GROUP BY c.id, c.name, c.email, c.phone
  ),
  customer_payments AS (
    SELECT 
      i.customer_id,
      COALESCE(SUM(p.amount), 0) as total_paid
    FROM payments p
    INNER JOIN invoices i ON p.invoice_id = i.id
    GROUP BY i.customer_id
  )
  SELECT 
    co.id,
    co.name,
    'customer'::TEXT as type,
    co.email,
    co.phone,
    co.order_count as total_transactions,
    co.total_sales as total_amount,
    (co.total_sales - COALESCE(cp.total_paid, 0) - co.total_waived) as balance_due,
    co.last_order_date as last_transaction_date,
    CASE 
      WHEN ABS(co.total_sales - COALESCE(cp.total_paid, 0) - co.total_waived) < 0.10 
      THEN 'settled' 
      ELSE 'outstanding' 
    END as status
  FROM customer_orders co
  LEFT JOIN customer_payments cp ON co.id = cp.customer_id
  WHERE (NOT hide_zero OR ABS(co.total_sales - COALESCE(cp.total_paid, 0) - co.total_waived) >= 0.10)
    AND co.order_count > 0  -- Only customers with orders
  ORDER BY co.total_sales DESC, co.name
  OFFSET page_offset
  LIMIT page_limit;
END;
$$;

-- Create basic indexes for better performance (no trigram)
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id_created_at ON sales_orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);

-- Simple text search index (basic btree instead of gin trigram)
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
