-- ==================================================================
-- ANALYTICS DATABASE FIXES FOR FURNITURE ERP
-- ==================================================================

-- 1. ADD MISSING ANALYTICS TABLES
-- ==================================================================

-- Production and quality tracking tables
CREATE TABLE IF NOT EXISTS public.production_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id),
    log_date DATE NOT NULL,
    output_quantity INTEGER NOT NULL DEFAULT 0,
    defects INTEGER NOT NULL DEFAULT 0,
    downtime_hours NUMERIC DEFAULT 0,
    efficiency_percentage NUMERIC DEFAULT 0,
    quality_score NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Risk management table
CREATE TABLE IF NOT EXISTS public.risk_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    reported_date DATE DEFAULT CURRENT_DATE,
    resolved_date DATE,
    impact_cost NUMERIC DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tasks table for employee analytics
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES employees(id),
    status TEXT CHECK (status IN ('To Do', 'In Progress', 'Done', 'Cancelled')),
    priority TEXT CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    due_date DATE,
    completed_date DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics snapshots for performance
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    dimensions JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. FIX EXISTING FUNCTIONS WITH CRITICAL ERRORS
-- ==================================================================

-- Fix: get_inventory_turnover_rate - Correct COGS calculation
CREATE OR REPLACE FUNCTION get_inventory_turnover_rate()
RETURNS TABLE(month text, rate numeric)
LANGUAGE plpgsql
AS $$
DECLARE
    avg_inventory_value NUMERIC;
BEGIN
    -- Calculate average inventory value over the period
    SELECT AVG(monthly_inventory.inventory_value)
    INTO avg_inventory_value
    FROM (
        SELECT 
            date_trunc('month', created_at) as month,
            SUM(i.quantity * COALESCE(p.cost, p.price * 0.7)) as inventory_value
        FROM inventory_items i
        JOIN products p ON i.product_id = p.id
        GROUP BY date_trunc('month', created_at)
    ) monthly_inventory;

    -- Handle zero inventory
    IF COALESCE(avg_inventory_value, 0) = 0 THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        to_char(date_trunc('month', so.created_at), 'YYYY-MM') AS month,
        -- Use Cost of Goods Sold (COGS) instead of sales price
        (SUM(soi.quantity * COALESCE(p.cost, soi.unit_price * 0.7)) / avg_inventory_value)::NUMERIC(10, 2) AS rate
    FROM sales_order_items soi
    JOIN sales_orders so ON soi.order_id = so.id
    JOIN products p ON soi.product_id = p.id
    WHERE so.created_at >= NOW() - INTERVAL '12 months'
        AND so.status IN ('confirmed', 'shipped', 'delivered')
    GROUP BY date_trunc('month', so.created_at)
    ORDER BY month;
END;
$$;

-- Fix: get_production_summary - Add proper target calculation
CREATE OR REPLACE FUNCTION get_production_summary()
RETURNS TABLE(product_name text, total_output bigint, total_target bigint, efficiency_percentage numeric)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.name as product_name,
        SUM(pl.output_quantity)::BIGINT as total_output,
        SUM(wo.quantity)::BIGINT as total_target,
        CASE 
            WHEN SUM(wo.quantity) > 0 THEN 
                (SUM(pl.output_quantity)::NUMERIC / SUM(wo.quantity) * 100)::NUMERIC(5,2)
            ELSE 0::NUMERIC
        END as efficiency_percentage
    FROM work_orders wo
    JOIN products p ON wo.product_id = p.id
    LEFT JOIN production_logs pl ON wo.id = pl.work_order_id
    WHERE wo.status IN ('completed', 'in_progress')
    GROUP BY p.name
    ORDER BY efficiency_percentage DESC;
END;
$$;

-- 3. ADD MISSING INDUSTRY-SPECIFIC ANALYTICS FUNCTIONS
-- ==================================================================

-- Advanced KPI Functions for Furniture Industry
CREATE OR REPLACE FUNCTION get_furniture_industry_kpis()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB := '{}';
    total_orders INTEGER;
    fulfilled_orders INTEGER;
    avg_production_time NUMERIC;
    material_cost_percentage NUMERIC;
    customer_satisfaction NUMERIC;
BEGIN
    -- Order Fulfillment Rate
    SELECT COUNT(*) INTO total_orders FROM sales_orders WHERE status != 'draft';
    SELECT COUNT(*) INTO fulfilled_orders FROM sales_orders WHERE status IN ('shipped', 'delivered');
    
    -- Average Production Time
    SELECT AVG(EXTRACT(DAYS FROM (pl.log_date - wo.created_at::date)))
    INTO avg_production_time
    FROM work_orders wo
    JOIN production_logs pl ON wo.id = pl.work_order_id
    WHERE wo.status = 'completed';
    
    -- Material Cost as % of Total Revenue
    WITH material_costs AS (
        SELECT SUM(po.total) as total_material_cost
        FROM purchase_orders po
        WHERE po.status = 'received'
            AND po.created_at >= NOW() - INTERVAL '12 months'
    ),
    total_revenue AS (
        SELECT SUM(soi.quantity * soi.unit_price) as revenue
        FROM sales_order_items soi
        JOIN sales_orders so ON soi.order_id = so.id
        WHERE so.status IN ('confirmed', 'shipped', 'delivered')
            AND so.created_at >= NOW() - INTERVAL '12 months'
    )
    SELECT 
        CASE WHEN tr.revenue > 0 THEN 
            (mc.total_material_cost / tr.revenue * 100)::NUMERIC(5,2)
        ELSE 0 
        END
    INTO material_cost_percentage
    FROM material_costs mc, total_revenue tr;
    
    -- Build result JSON
    result := jsonb_build_object(
        'order_fulfillment_rate', CASE WHEN total_orders > 0 THEN (fulfilled_orders::NUMERIC / total_orders * 100)::NUMERIC(5,2) ELSE 0 END,
        'average_production_days', COALESCE(avg_production_time, 0),
        'material_cost_percentage', COALESCE(material_cost_percentage, 0),
        'total_active_orders', total_orders,
        'fulfilled_orders', fulfilled_orders
    );
    
    RETURN result;
END;
$$;

-- Customer Segmentation (RFM Analysis)
CREATE OR REPLACE FUNCTION get_customer_rfm_analysis(limit_count INTEGER DEFAULT 100)
RETURNS TABLE(
    customer_id UUID,
    customer_name TEXT,
    recency_days INTEGER,
    frequency INTEGER,
    monetary NUMERIC,
    rfm_score TEXT,
    segment TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH customer_metrics AS (
        SELECT 
            c.id as customer_id,
            c.name as customer_name,
            EXTRACT(DAYS FROM (NOW() - MAX(so.created_at)))::INTEGER as recency_days,
            COUNT(so.id)::INTEGER as frequency,
            SUM(soi.quantity * soi.unit_price)::NUMERIC as monetary
        FROM customers c
        JOIN sales_orders so ON c.id = so.customer_id
        JOIN sales_order_items soi ON so.id = soi.order_id
        WHERE so.status IN ('confirmed', 'shipped', 'delivered')
        GROUP BY c.id, c.name
    ),
    rfm_scores AS (
        SELECT *,
            CASE 
                WHEN recency_days <= 30 THEN 5
                WHEN recency_days <= 60 THEN 4
                WHEN recency_days <= 90 THEN 3
                WHEN recency_days <= 180 THEN 2
                ELSE 1
            END as r_score,
            CASE 
                WHEN frequency >= 10 THEN 5
                WHEN frequency >= 7 THEN 4
                WHEN frequency >= 4 THEN 3
                WHEN frequency >= 2 THEN 2
                ELSE 1
            END as f_score,
            CASE 
                WHEN monetary >= 100000 THEN 5
                WHEN monetary >= 50000 THEN 4
                WHEN monetary >= 20000 THEN 3
                WHEN monetary >= 10000 THEN 2
                ELSE 1
            END as m_score
        FROM customer_metrics
    )
    SELECT 
        rs.customer_id,
        rs.customer_name,
        rs.recency_days,
        rs.frequency,
        rs.monetary,
        (rs.r_score || rs.f_score || rs.m_score) as rfm_score,
        CASE 
            WHEN rs.r_score >= 4 AND rs.f_score >= 4 AND rs.m_score >= 4 THEN 'Champions'
            WHEN rs.r_score >= 3 AND rs.f_score >= 3 AND rs.m_score >= 3 THEN 'Loyal Customers'
            WHEN rs.r_score >= 3 AND rs.f_score <= 2 THEN 'Potential Loyalists'
            WHEN rs.r_score <= 2 AND rs.f_score >= 3 THEN 'At Risk'
            WHEN rs.r_score <= 2 AND rs.f_score <= 2 THEN 'Hibernating'
            ELSE 'New Customers'
        END as segment
    FROM rfm_scores
    ORDER BY monetary DESC
    LIMIT limit_count;
END;
$$;

-- Production Efficiency Analytics
CREATE OR REPLACE FUNCTION get_production_efficiency_analysis()
RETURNS TABLE(
    product_name TEXT,
    avg_production_time NUMERIC,
    defect_rate NUMERIC,
    efficiency_score NUMERIC,
    cost_per_unit NUMERIC,
    total_output INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name as product_name,
        AVG(EXTRACT(DAYS FROM (pl.log_date - wo.created_at::date)))::NUMERIC(5,2) as avg_production_time,
        (SUM(pl.defects)::NUMERIC / NULLIF(SUM(pl.output_quantity), 0) * 100)::NUMERIC(5,2) as defect_rate,
        AVG(pl.efficiency_percentage)::NUMERIC(5,2) as efficiency_score,
        (SUM(COALESCE(p.cost, 0)) / NULLIF(SUM(pl.output_quantity), 0))::NUMERIC(10,2) as cost_per_unit,
        SUM(pl.output_quantity)::INTEGER as total_output
    FROM products p
    JOIN work_orders wo ON p.id = wo.product_id
    JOIN production_logs pl ON wo.id = pl.work_order_id
    WHERE wo.status = 'completed'
        AND pl.log_date >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY p.name
    HAVING SUM(pl.output_quantity) > 0
    ORDER BY efficiency_score DESC;
END;
$$;

-- Inventory ABC Analysis
CREATE OR REPLACE FUNCTION get_inventory_abc_analysis()
RETURNS TABLE(
    product_id UUID,
    product_name TEXT,
    annual_usage_value NUMERIC,
    current_stock INTEGER,
    abc_category CHAR(1),
    reorder_recommendation TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH product_usage AS (
        SELECT 
            p.id as product_id,
            p.name as product_name,
            SUM(soi.quantity * soi.unit_price) as annual_usage_value,
            COALESCE(ii.quantity, 0) as current_stock
        FROM products p
        LEFT JOIN sales_order_items soi ON p.id = soi.product_id
        LEFT JOIN sales_orders so ON soi.order_id = so.id
        LEFT JOIN inventory_items ii ON p.id = ii.product_id
        WHERE so.created_at >= NOW() - INTERVAL '12 months'
            OR so.created_at IS NULL
        GROUP BY p.id, p.name, ii.quantity
    ),
    usage_percentiles AS (
        SELECT *,
            PERCENT_RANK() OVER (ORDER BY annual_usage_value DESC) as usage_percentile
        FROM product_usage
    )
    SELECT 
        up.product_id,
        up.product_name,
        COALESCE(up.annual_usage_value, 0) as annual_usage_value,
        up.current_stock,
        CASE 
            WHEN up.usage_percentile <= 0.2 THEN 'A'
            WHEN up.usage_percentile <= 0.5 THEN 'B'
            ELSE 'C'
        END as abc_category,
        CASE 
            WHEN up.usage_percentile <= 0.2 AND up.current_stock <= 10 THEN 'HIGH PRIORITY REORDER'
            WHEN up.usage_percentile <= 0.5 AND up.current_stock <= 20 THEN 'MEDIUM PRIORITY REORDER'
            WHEN up.current_stock <= 5 THEN 'LOW STOCK ALERT'
            ELSE 'ADEQUATE STOCK'
        END as reorder_recommendation
    FROM usage_percentiles up
    ORDER BY up.usage_percentile ASC;
END;
$$;

-- Financial Performance Analytics
CREATE OR REPLACE FUNCTION get_financial_performance_metrics()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB := '{}';
    gross_profit NUMERIC;
    gross_margin NUMERIC;
    operating_expenses NUMERIC;
    net_profit NUMERIC;
    working_capital NUMERIC;
    inventory_value NUMERIC;
    accounts_receivable NUMERIC;
BEGIN
    -- Calculate Gross Profit and Margin
    WITH revenue_costs AS (
        SELECT 
            SUM(soi.quantity * soi.unit_price) as total_revenue,
            SUM(soi.quantity * COALESCE(p.cost, soi.unit_price * 0.7)) as total_cogs
        FROM sales_order_items soi
        JOIN sales_orders so ON soi.order_id = so.id
        JOIN products p ON soi.product_id = p.id
        WHERE so.status IN ('confirmed', 'shipped', 'delivered')
            AND so.created_at >= NOW() - INTERVAL '12 months'
    )
    SELECT 
        (total_revenue - total_cogs),
        CASE WHEN total_revenue > 0 THEN ((total_revenue - total_cogs) / total_revenue * 100) ELSE 0 END
    INTO gross_profit, gross_margin
    FROM revenue_costs;
    
    -- Operating Expenses
    SELECT SUM(amount) INTO operating_expenses
    FROM expenses
    WHERE date >= CURRENT_DATE - INTERVAL '12 months';
    
    -- Net Profit
    net_profit := COALESCE(gross_profit, 0) - COALESCE(operating_expenses, 0);
    
    -- Working Capital Components
    SELECT SUM(i.quantity * COALESCE(p.cost, p.price * 0.7))
    INTO inventory_value
    FROM inventory_items i
    JOIN products p ON i.product_id = p.id;
    
    -- Accounts Receivable (unpaid invoices)
    SELECT SUM(total - paid_amount)
    INTO accounts_receivable
    FROM invoices
    WHERE status IN ('unpaid', 'partially_paid');
    
    -- Build result
    result := jsonb_build_object(
        'gross_profit', COALESCE(gross_profit, 0),
        'gross_margin_percentage', COALESCE(gross_margin, 0),
        'operating_expenses', COALESCE(operating_expenses, 0),
        'net_profit', COALESCE(net_profit, 0),
        'inventory_value', COALESCE(inventory_value, 0),
        'accounts_receivable', COALESCE(accounts_receivable, 0),
        'working_capital', COALESCE(inventory_value, 0) + COALESCE(accounts_receivable, 0)
    );
    
    RETURN result;
END;
$$;

-- 4. ADD PERFORMANCE INDEXES
-- ==================================================================

-- Indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_created_at ON sales_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_product_id ON sales_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON purchase_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_logs_log_date ON production_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_items_product_id ON inventory_items(product_id);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_sales_performance ON sales_orders(status, created_at, customer_id);
CREATE INDEX IF NOT EXISTS idx_product_performance ON sales_order_items(product_id, order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_performance ON purchase_orders(supplier_id, status, created_at);

-- 5. ADD MATERIALIZED VIEWS FOR FAST ANALYTICS
-- ==================================================================

-- Daily sales summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_sales_summary AS
SELECT 
    DATE(so.created_at) as sales_date,
    COUNT(DISTINCT so.id) as order_count,
    COUNT(DISTINCT so.customer_id) as unique_customers,
    SUM(soi.quantity * soi.unit_price) as total_revenue,
    AVG(soi.quantity * soi.unit_price) as avg_order_value
FROM sales_orders so
JOIN sales_order_items soi ON so.id = soi.order_id
WHERE so.status IN ('confirmed', 'shipped', 'delivered')
GROUP BY DATE(so.created_at);

-- Product performance summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_product_performance AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.category,
    COUNT(soi.id) as times_sold,
    SUM(soi.quantity) as total_quantity_sold,
    SUM(soi.quantity * soi.unit_price) as total_revenue,
    AVG(soi.unit_price) as avg_selling_price,
    MAX(so.created_at) as last_sold_date
FROM products p
LEFT JOIN sales_order_items soi ON p.id = soi.product_id
LEFT JOIN sales_orders so ON soi.order_id = so.id
WHERE so.status IN ('confirmed', 'shipped', 'delivered') OR so.status IS NULL
GROUP BY p.id, p.name, p.category;

-- Refresh function for materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_daily_sales_summary;
    REFRESH MATERIALIZED VIEW mv_product_performance;
    
    -- Insert analytics snapshot
    INSERT INTO analytics_snapshots (snapshot_date, metric_type, metrics)
    VALUES (
        CURRENT_DATE,
        'daily_refresh',
        jsonb_build_object(
            'refreshed_at', NOW(),
            'views_refreshed', ARRAY['mv_daily_sales_summary', 'mv_product_performance']
        )
    );
END;
$$;

-- 6. ADD MISSING ENUMS AND CONSTRAINTS
-- ==================================================================

-- Add missing ENUM types if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
        CREATE TYPE delivery_status AS ENUM ('pending', 'in_transit', 'delivered', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE invoice_status AS ENUM ('unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_order_status') THEN
        CREATE TYPE purchase_order_status AS ENUM ('pending', 'ordered', 'received', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('unpaid', 'partially_paid', 'paid');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sales_order_status') THEN
        CREATE TYPE sales_order_status AS ENUM ('draft', 'confirmed', 'shipped', 'delivered', 'cancelled');
    END IF;
END $$;

-- 7. ADD TRIGGERS FOR AUTOMATIC UPDATES
-- ==================================================================

-- Trigger to update analytics snapshots
CREATE OR REPLACE FUNCTION trigger_analytics_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Schedule a refresh of analytics views (in a real implementation, this would be queued)
    PERFORM pg_notify('analytics_refresh', 'scheduled');
    RETURN NEW;
END;
$$;

-- Apply triggers to key tables
DROP TRIGGER IF EXISTS sales_order_analytics_trigger ON sales_orders;
CREATE TRIGGER sales_order_analytics_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sales_orders
    FOR EACH ROW EXECUTE FUNCTION trigger_analytics_update();

COMMENT ON SCHEMA public IS 'Enhanced with furniture industry analytics functions and performance optimizations';
