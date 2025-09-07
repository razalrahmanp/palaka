-- Dashboard Views Creation Script
-- Execute this script in your Supabase SQL Editor

-- First, ensure all required tables exist
-- This script creates 15 optimized views for the dashboard

-- 1. MTD Revenue View
CREATE OR REPLACE VIEW public.view_mtd_revenue AS
SELECT 
  COALESCE(SUM(final_price),0)::numeric AS mtd_revenue
FROM public.sales_orders
WHERE date_trunc('month', created_at) = date_trunc('month', now());

-- 2. Quotes Pipeline View  
CREATE OR REPLACE VIEW public.view_quotes_pipeline AS
SELECT
  COUNT(*)::int AS total_quotes,
  COALESCE(SUM(total_price),0)::numeric AS total_value
FROM public.quotes
WHERE status IN ('Pending_Approval', 'Sent');

-- 3. Custom Orders Pending View
CREATE OR REPLACE VIEW public.view_custom_orders_pending AS
SELECT 
  COUNT(DISTINCT so.id)::int AS custom_orders_pending
FROM public.sales_orders so
JOIN public.sales_order_items soi ON soi.order_id = so.id
WHERE soi.custom_product_id IS NOT NULL AND so.status = 'confirmed';

-- 4. Low Stock Items View
CREATE OR REPLACE VIEW public.view_low_stock_items AS
SELECT
  COUNT(*)::int AS low_stock_count
FROM public.inventory_items
WHERE quantity <= reorder_point;

-- 5. Open Purchase Orders View
CREATE OR REPLACE VIEW public.view_open_purchase_orders AS
SELECT
  COUNT(*)::int AS open_pos,
  COALESCE(SUM(total),0)::numeric AS open_po_value
FROM public.purchase_orders
WHERE status = 'pending';

-- 6. On-time Delivery Percentage (7 days)
CREATE OR REPLACE VIEW public.view_on_time_delivery_pct_7d AS
SELECT
  CASE WHEN COUNT(*) = 0 THEN 100.0
       ELSE ROUND(100.0 * SUM(CASE WHEN actual_delivery_time IS NOT NULL AND estimated_delivery_time IS NOT NULL AND actual_delivery_time <= estimated_delivery_time THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric, 2)
  END AS on_time_pct,
  COUNT(*)::int AS total_deliveries
FROM public.deliveries
WHERE created_at >= now() - interval '7 days'
  AND status = 'delivered';

-- 7. Revenue Trend (12 months)
CREATE OR REPLACE VIEW public.view_revenue_trend_12_months AS
WITH months AS (
  SELECT generate_series(
    date_trunc('month', now()) - interval '11 months',
    date_trunc('month', now()),
    interval '1 month'
  )::date as month
)
SELECT 
  m.month,
  TO_CHAR(m.month, 'Mon YYYY') as month_name,
  COALESCE(SUM(so.final_price), 0)::numeric as revenue
FROM months m
LEFT JOIN public.sales_orders so ON date_trunc('month', so.created_at) = m.month
GROUP BY m.month
ORDER BY m.month;

-- 8. Top Products by Revenue (Last 3 months)
CREATE OR REPLACE VIEW public.view_top_products_by_revenue AS
SELECT
  p.name,
  p.sku,
  COALESCE(SUM(soi.quantity * soi.unit_price), 0)::numeric as revenue,
  SUM(soi.quantity)::int as units_sold
FROM public.products p
JOIN public.sales_order_items soi ON soi.product_id = p.id
JOIN public.sales_orders so ON so.id = soi.order_id
WHERE so.created_at >= now() - interval '3 months'
GROUP BY p.id, p.name, p.sku
ORDER BY revenue DESC
LIMIT 10;

-- 9. Inventory by Category
CREATE OR REPLACE VIEW public.view_inventory_by_category AS
SELECT
  COALESCE(p.category, 'Uncategorized') as category,
  COUNT(ii.id)::int as item_count,
  COALESCE(SUM(ii.quantity), 0)::int as total_stock,
  COALESCE(SUM(ii.quantity * p.cost), 0)::numeric as total_value
FROM public.inventory_items ii
LEFT JOIN public.products p ON p.id = ii.product_id
GROUP BY p.category
ORDER BY total_value DESC;

-- 10. Inventory Alerts
CREATE OR REPLACE VIEW public.view_inventory_alerts AS
SELECT
  ii.id,
  COALESCE(p.name, 'Unknown Product') as item_name,
  ii.quantity,
  ii.reorder_point,
  CASE 
    WHEN ii.quantity = 0 THEN 'Out of Stock'
    WHEN ii.quantity <= ii.reorder_point THEN 'Low Stock'
    ELSE 'Normal'
  END as alert_type,
  ii.updated_at
FROM public.inventory_items ii
LEFT JOIN public.products p ON p.id = ii.product_id
WHERE ii.quantity <= ii.reorder_point
ORDER BY ii.quantity ASC;

-- 11. Supplier Performance View
CREATE OR REPLACE VIEW public.view_supplier_performance AS
SELECT
  s.id AS supplier_id,
  s.name AS supplier_name,
  COUNT(po.id)::int AS total_orders,
  COALESCE(SUM(po.total),0)::numeric AS total_value,
  ROUND(AVG(CASE WHEN po.due_date IS NOT NULL AND po.created_at IS NOT NULL 
                 THEN EXTRACT(days FROM po.due_date - po.created_at) 
                 ELSE NULL END), 2) AS avg_lead_time_days,
  COUNT(CASE WHEN po.status = 'received' THEN 1 END)::int AS completed_orders,
  COUNT(CASE WHEN po.status = 'pending' THEN 1 END)::int AS pending_orders
FROM public.suppliers s
LEFT JOIN public.purchase_orders po ON po.supplier_id = s.id
WHERE s.is_deleted = false
GROUP BY s.id, s.name
ORDER BY total_value DESC;

-- 12. Monthly Sales Trend (Last 12 months with comparisons)
CREATE OR REPLACE VIEW public.view_monthly_sales_trend AS
WITH monthly_data AS (
  SELECT
    date_trunc('month', created_at)::date AS month,
    COUNT(*)::int AS order_count,
    COALESCE(SUM(final_price),0)::numeric AS revenue,
    COALESCE(AVG(final_price),0)::numeric AS avg_order_value
  FROM public.sales_orders
  WHERE created_at >= date_trunc('month', now()) - interval '12 months'
  GROUP BY date_trunc('month', created_at)
)
SELECT 
  month,
  TO_CHAR(month, 'Mon YYYY') as month_name,
  revenue,
  order_count,
  avg_order_value,
  LAG(revenue) OVER (ORDER BY month) as prev_month_revenue,
  CASE WHEN LAG(revenue) OVER (ORDER BY month) > 0 
       THEN ROUND(((revenue - LAG(revenue) OVER (ORDER BY month)) / LAG(revenue) OVER (ORDER BY month) * 100), 2)
       ELSE NULL 
  END as growth_pct
FROM monthly_data
ORDER BY month DESC;

-- 13. Work Orders Status
CREATE OR REPLACE VIEW public.view_work_orders_status AS
SELECT
  COUNT(*)::int AS total_work_orders,
  COUNT(CASE WHEN status = 'planned' THEN 1 END)::int AS planned,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::int AS in_progress,
  COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS completed,
  COUNT(CASE WHEN status = 'delayed' THEN 1 END)::int AS delayed
FROM public.work_orders
WHERE created_at >= now() - interval '30 days';

-- 14. Production Efficiency
CREATE OR REPLACE VIEW public.view_production_efficiency AS
WITH work_order_metrics AS (
  SELECT
    date_trunc('week', created_at)::date AS week,
    COUNT(*)::int AS total_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS completed_orders,
    AVG(CASE WHEN status = 'completed' AND created_at IS NOT NULL 
             THEN EXTRACT(days FROM now() - created_at) 
             ELSE NULL END)::numeric AS avg_completion_days
  FROM public.work_orders
  WHERE created_at >= now() - interval '12 weeks'
  GROUP BY date_trunc('week', created_at)
)
SELECT 
  week,
  TO_CHAR(week, 'Mon DD') as week_name,
  total_orders,
  completed_orders,
  CASE WHEN total_orders > 0 
       THEN ROUND((completed_orders::numeric / total_orders::numeric * 100), 2)
       ELSE 0 
  END AS completion_rate,
  COALESCE(avg_completion_days, 0) as avg_cycle_time
FROM work_order_metrics
ORDER BY week DESC;

-- 15. Customer Analytics
CREATE OR REPLACE VIEW public.view_customer_analytics AS
SELECT
  COUNT(DISTINCT c.id)::int AS total_customers,
  COUNT(DISTINCT CASE WHEN c.created_at >= now() - interval '30 days' THEN c.id END)::int AS new_customers_30d,
  COUNT(DISTINCT CASE WHEN so.created_at >= now() - interval '30 days' THEN c.id END)::int AS active_customers_30d,
  COALESCE(AVG(customer_metrics.total_spent), 0)::numeric AS avg_customer_value,
  COALESCE(AVG(customer_metrics.order_count), 0)::numeric AS avg_orders_per_customer
FROM public.customers c
LEFT JOIN (
  SELECT 
    so.customer_id,
    SUM(so.final_price) as total_spent,
    COUNT(so.id) as order_count
  FROM public.sales_orders so
  GROUP BY so.customer_id
) customer_metrics ON customer_metrics.customer_id = c.id
LEFT JOIN public.sales_orders so ON so.customer_id = c.id;

-- Grant permissions for views
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Create indexes for better performance (if not already exists)
CREATE INDEX IF NOT EXISTS idx_sales_orders_created_at ON public.sales_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON public.sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock ON public.inventory_items(quantity, reorder_point);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON public.deliveries(created_at);

-- Completion message
SELECT 'Dashboard views created successfully! Ready for use.' as status;
