-- Quick Database Views Setup for Dashboard
-- Execute this SQL in your Supabase SQL Editor

-- 1. Month-to-Date Revenue View
CREATE OR REPLACE VIEW view_mtd_revenue AS
SELECT 
    COALESCE(SUM(total_amount), 0) as mtd_revenue
FROM sales_orders 
WHERE EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND status = 'confirmed';

-- 2. Quotes Pipeline View
CREATE OR REPLACE VIEW view_quotes_pipeline AS
SELECT 
    COUNT(*) as total_quotes,
    COALESCE(SUM(total_amount), 0) as total_value
FROM quotes 
WHERE status = 'pending';

-- 3. Custom Orders Pending View
CREATE OR REPLACE VIEW view_custom_orders_pending AS
SELECT 
    COUNT(*) as pending_orders
FROM work_orders 
WHERE status IN ('pending', 'in_progress');

-- 4. Low Stock Items View
CREATE OR REPLACE VIEW view_low_stock_items AS
SELECT 
    COUNT(*) as low_stock_count
FROM inventory_items 
WHERE current_stock <= reorder_level;

-- 5. Open Purchase Orders View
CREATE OR REPLACE VIEW view_open_purchase_orders AS
SELECT 
    COUNT(*) as count,
    COALESCE(SUM(total_amount), 0) as value
FROM purchase_orders 
WHERE status IN ('pending', 'approved');

-- 6. On-Time Deliveries View
CREATE OR REPLACE VIEW view_on_time_deliveries AS
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 100.0
        ELSE (COUNT(CASE WHEN delivery_date <= expected_delivery_date THEN 1 END) * 100.0 / COUNT(*))
    END as on_time_percentage
FROM deliveries 
WHERE delivery_date >= CURRENT_DATE - INTERVAL '7 days';

-- 7. Revenue Trend (12 Months) View
CREATE OR REPLACE VIEW view_revenue_trend_12_months AS
SELECT 
    TO_CHAR(order_date, 'Mon YYYY') as month,
    EXTRACT(MONTH FROM order_date) as month_num,
    EXTRACT(YEAR FROM order_date) as year_num,
    COALESCE(SUM(total_amount), 0) as revenue
FROM sales_orders
WHERE order_date >= CURRENT_DATE - INTERVAL '12 months'
  AND status = 'confirmed'
GROUP BY 
    EXTRACT(YEAR FROM order_date),
    EXTRACT(MONTH FROM order_date),
    TO_CHAR(order_date, 'Mon YYYY')
ORDER BY year_num, month_num;

-- 8. Top Products by Revenue View
CREATE OR REPLACE VIEW view_top_products_by_revenue AS
SELECT 
    COALESCE(oi.product_name, 'Unknown Product') as name,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue
FROM order_items oi
JOIN sales_orders so ON oi.order_id = so.id
WHERE so.order_date >= CURRENT_DATE - INTERVAL '12 months'
  AND so.status = 'confirmed'
GROUP BY oi.product_name
ORDER BY revenue DESC
LIMIT 10;

-- 9. Inventory by Category View
CREATE OR REPLACE VIEW view_inventory_by_category AS
SELECT 
    COALESCE(category, 'Uncategorized') as category,
    COUNT(*) as count,
    COALESCE(SUM(current_stock * unit_price), 0) as value
FROM inventory_items
GROUP BY category
ORDER BY value DESC;

-- 10. Inventory Alerts View
CREATE OR REPLACE VIEW view_inventory_alerts AS
SELECT 
    item_name,
    current_stock,
    reorder_level,
    'Low Stock' as alert_type
FROM inventory_items
WHERE current_stock <= reorder_level
ORDER BY (current_stock::float / NULLIF(reorder_level, 0)) ASC
LIMIT 20;

-- 11. Work Orders Status View
CREATE OR REPLACE VIEW view_work_orders_status AS
SELECT 
    status,
    COUNT(*) as count
FROM work_orders
GROUP BY status;

-- 12. Production Efficiency View
CREATE OR REPLACE VIEW view_production_efficiency AS
SELECT 
    'Overall' as period,
    CASE 
        WHEN COUNT(*) = 0 THEN 0
        ELSE (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*))
    END as efficiency
FROM work_orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
UNION ALL
SELECT 
    TO_CHAR(created_at, 'Mon') as period,
    CASE 
        WHEN COUNT(*) = 0 THEN 0
        ELSE (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*))
    END as efficiency
FROM work_orders
WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY TO_CHAR(created_at, 'Mon'), EXTRACT(MONTH FROM created_at)
ORDER BY EXTRACT(MONTH FROM created_at);

-- 13. Customer Analytics View
CREATE OR REPLACE VIEW view_customer_analytics AS
SELECT 
    COUNT(DISTINCT customer_id) as total_customers,
    COUNT(DISTINCT CASE WHEN order_date >= CURRENT_DATE - INTERVAL '30 days' THEN customer_id END) as active_customers,
    COUNT(DISTINCT CASE WHEN order_date >= CURRENT_DATE - INTERVAL '30 days' AND customer_id NOT IN (
        SELECT DISTINCT customer_id FROM sales_orders WHERE order_date < CURRENT_DATE - INTERVAL '30 days'
    ) THEN customer_id END) as new_customers
FROM sales_orders
WHERE order_date >= CURRENT_DATE - INTERVAL '12 months';

-- 14. Monthly Sales Trend View
CREATE OR REPLACE VIEW view_monthly_sales_trend AS
SELECT 
    TO_CHAR(order_date, 'Mon YYYY') as month,
    COUNT(*) as order_count,
    COALESCE(SUM(total_amount), 0) as revenue,
    COUNT(DISTINCT customer_id) as unique_customers
FROM sales_orders
WHERE order_date >= CURRENT_DATE - INTERVAL '12 months'
  AND status = 'confirmed'
GROUP BY 
    EXTRACT(YEAR FROM order_date),
    EXTRACT(MONTH FROM order_date),
    TO_CHAR(order_date, 'Mon YYYY')
ORDER BY EXTRACT(YEAR FROM order_date), EXTRACT(MONTH FROM order_date);

-- 15. Supplier Performance View
CREATE OR REPLACE VIEW view_supplier_performance AS
SELECT 
    COALESCE(supplier_name, 'Unknown Supplier') as supplier,
    COUNT(*) as total_orders,
    COALESCE(AVG(
        CASE 
            WHEN delivery_date IS NOT NULL AND expected_delivery_date IS NOT NULL 
            THEN EXTRACT(DAYS FROM delivery_date - expected_delivery_date)
            ELSE 0 
        END
    ), 0) as avg_delay_days,
    CASE 
        WHEN COUNT(*) = 0 THEN 100.0
        ELSE (COUNT(CASE WHEN delivery_date <= expected_delivery_date THEN 1 END) * 100.0 / COUNT(*))
    END as on_time_percentage
FROM purchase_orders po
LEFT JOIN deliveries d ON po.id = d.purchase_order_id
WHERE po.created_at >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY supplier_name
ORDER BY on_time_percentage DESC, total_orders DESC
LIMIT 10;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

COMMIT;
