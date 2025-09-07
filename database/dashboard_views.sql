-- Dashboard Views for ERP System
-- Run these in Supabase SQL editor to create optimized views for dashboard KPIs

-- 1. MTD Revenue View
CREATE OR REPLACE VIEW public.view_mtd_revenue AS
SELECT
  date_trunc('month', created_at)::date AS month_start,
  COALESCE(SUM(final_price), 0) AS mtd_revenue
FROM public.sales_orders
WHERE created_at >= date_trunc('month', current_date)
GROUP BY 1;

-- 2. Quotes Pipeline View
CREATE OR REPLACE VIEW public.view_quotes_pipeline AS
SELECT
  status,
  COUNT(*)::int AS quote_count,
  COALESCE(SUM(total_price),0)::numeric AS total_value
FROM public.quotes
GROUP BY status
ORDER BY quote_count DESC;

-- 3. Custom Orders Pending View
CREATE OR REPLACE VIEW public.view_custom_orders_pending AS
SELECT
  qci.id AS custom_item_id,
  qci.quote_id,
  q.customer_id,
  q.customer,
  qci.name,
  qci.quantity,
  qci.unit_price,
  qci.configuration,
  qci.supplier_id,
  qci.supplier_name,
  qci.status
FROM public.quote_custom_items qci
JOIN public.quotes q ON q.id = qci.quote_id
WHERE qci.status IN ('pending','in_production')
ORDER BY qci.created_at DESC;

-- 4. Low Stock Count View
CREATE OR REPLACE VIEW public.view_low_stock_count AS
SELECT
  COUNT(*)::int AS low_sku_count
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
  AND actual_delivery_time IS NOT NULL
  AND estimated_delivery_time IS NOT NULL;

-- 7. Revenue Trend (12 months)
CREATE OR REPLACE VIEW public.view_revenue_trend_12_months AS
SELECT
  date_trunc('month', created_at)::date AS month,
  COALESCE(SUM(final_price),0)::numeric AS revenue
FROM public.sales_orders
WHERE created_at >= now() - interval '12 months'
GROUP BY 1
ORDER BY 1;

-- 8. Top Products by Revenue
CREATE OR REPLACE VIEW public.view_top_products_by_revenue AS
SELECT
  COALESCE(p.id, soi.product_id)::uuid AS product_id,
  COALESCE(p.name, soi.name) AS product_name,
  SUM(soi.quantity)::int AS total_quantity,
  SUM(soi.unit_price * soi.quantity)::numeric AS revenue
FROM public.sales_order_items soi
LEFT JOIN public.products p ON p.id = soi.product_id
GROUP BY 1,2
ORDER BY revenue DESC
LIMIT 20;

-- 9. Inventory by Category
CREATE OR REPLACE VIEW public.view_inventory_by_category AS
SELECT
  COALESCE(category, 'Uncategorized') AS category,
  SUM(quantity)::int AS total_quantity,
  SUM(COALESCE((SELECT price FROM public.products pr WHERE pr.id = inventory_items.product_id),0) * quantity)::numeric AS est_value
FROM public.inventory_items
GROUP BY 1
ORDER BY total_quantity DESC;

-- 10. Work Orders Status
CREATE OR REPLACE VIEW public.view_work_orders_status AS
SELECT status, COUNT(*)::int AS count
FROM public.work_orders
GROUP BY status;

-- Additional Enhanced Views for Better Analytics

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
WHERE s.is_active = true
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
  WHERE created_at >= now() - interval '24 months'
  GROUP BY 1
)
SELECT
  month,
  order_count,
  revenue,
  avg_order_value,
  LAG(revenue, 1) OVER (ORDER BY month) AS prev_month_revenue,
  LAG(revenue, 12) OVER (ORDER BY month) AS prev_year_revenue,
  CASE WHEN LAG(revenue, 1) OVER (ORDER BY month) > 0 
       THEN ROUND(100.0 * (revenue - LAG(revenue, 1) OVER (ORDER BY month)) / LAG(revenue, 1) OVER (ORDER BY month), 2)
       ELSE NULL END AS mom_growth_pct,
  CASE WHEN LAG(revenue, 12) OVER (ORDER BY month) > 0 
       THEN ROUND(100.0 * (revenue - LAG(revenue, 12) OVER (ORDER BY month)) / LAG(revenue, 12) OVER (ORDER BY month), 2)
       ELSE NULL END AS yoy_growth_pct
FROM monthly_data
WHERE month >= now() - interval '12 months'
ORDER BY month;

-- 13. Customer Analytics View
CREATE OR REPLACE VIEW public.view_customer_analytics AS
SELECT
  c.id AS customer_id,
  c.name AS customer_name,
  c.email,
  c.phone,
  COUNT(so.id)::int AS total_orders,
  COALESCE(SUM(so.final_price),0)::numeric AS total_spent,
  COALESCE(AVG(so.final_price),0)::numeric AS avg_order_value,
  MAX(so.created_at) AS last_order_date,
  MIN(so.created_at) AS first_order_date,
  CASE WHEN MAX(so.created_at) >= now() - interval '30 days' THEN 'Active'
       WHEN MAX(so.created_at) >= now() - interval '90 days' THEN 'Recent'
       ELSE 'Inactive' END AS customer_status
FROM public.customers c
LEFT JOIN public.sales_orders so ON so.customer_id = c.id
GROUP BY c.id, c.name, c.email, c.phone
ORDER BY total_spent DESC;

-- 14. Inventory Alerts View
CREATE OR REPLACE VIEW public.view_inventory_alerts AS
SELECT
  ii.id,
  ii.product_id,
  p.name AS product_name,
  p.category,
  ii.quantity AS current_stock,
  ii.reorder_point,
  ii.max_stock_level,
  CASE 
    WHEN ii.quantity <= 0 THEN 'OUT_OF_STOCK'
    WHEN ii.quantity <= ii.reorder_point THEN 'LOW_STOCK'
    WHEN ii.quantity >= ii.max_stock_level THEN 'OVERSTOCK'
    ELSE 'NORMAL'
  END AS alert_type,
  CASE 
    WHEN ii.quantity <= 0 THEN 'Critical'
    WHEN ii.quantity <= ii.reorder_point THEN 'High'
    WHEN ii.quantity >= ii.max_stock_level THEN 'Medium'
    ELSE 'Low'
  END AS priority
FROM public.inventory_items ii
LEFT JOIN public.products p ON p.id = ii.product_id
WHERE ii.quantity <= ii.reorder_point OR ii.quantity >= ii.max_stock_level OR ii.quantity <= 0
ORDER BY 
  CASE 
    WHEN ii.quantity <= 0 THEN 1
    WHEN ii.quantity <= ii.reorder_point THEN 2
    WHEN ii.quantity >= ii.max_stock_level THEN 3
    ELSE 4
  END,
  ii.quantity ASC;

-- 15. Production Efficiency View
CREATE OR REPLACE VIEW public.view_production_efficiency AS
SELECT
  DATE_TRUNC('week', wo.start_date)::date AS week_start,
  COUNT(*)::int AS total_work_orders,
  COUNT(CASE WHEN wo.status = 'completed' THEN 1 END)::int AS completed_orders,
  COUNT(CASE WHEN wo.status = 'in_progress' THEN 1 END)::int AS in_progress_orders,
  COUNT(CASE WHEN wo.status = 'delayed' THEN 1 END)::int AS delayed_orders,
  ROUND(100.0 * COUNT(CASE WHEN wo.status = 'completed' THEN 1 END) / NULLIF(COUNT(*), 0), 2) AS completion_rate,
  ROUND(AVG(CASE WHEN wo.status = 'completed' AND wo.start_date IS NOT NULL AND wo.due_date IS NOT NULL 
                 THEN EXTRACT(days FROM wo.due_date - wo.start_date) END), 2) AS avg_cycle_time_days
FROM public.work_orders wo
WHERE wo.start_date >= now() - interval '12 weeks'
GROUP BY DATE_TRUNC('week', wo.start_date)
ORDER BY week_start DESC;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_created_at ON public.sales_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quote_custom_items_status ON public.quote_custom_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_quantity_reorder ON public.inventory_items(quantity, reorder_point);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON public.deliveries(created_at);
CREATE INDEX IF NOT EXISTS idx_work_orders_status_start_date ON public.work_orders(status, start_date);
