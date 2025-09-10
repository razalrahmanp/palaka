-- Sales Performance Enhancement Tables
-- This script creates the missing tables needed for sales representative performance tracking

-- Sales Targets/Quotas Table
CREATE TABLE public.sales_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sales_rep_id uuid NOT NULL,
  target_period_start date NOT NULL,
  target_period_end date NOT NULL,
  target_type varchar NOT NULL CHECK (target_type IN ('monthly', 'quarterly', 'yearly')),
  revenue_target numeric NOT NULL DEFAULT 0,
  orders_target integer NOT NULL DEFAULT 0,
  customers_target integer NOT NULL DEFAULT 0,
  achievement_revenue numeric NOT NULL DEFAULT 0,
  achievement_orders integer NOT NULL DEFAULT 0,
  achievement_customers integer NOT NULL DEFAULT 0,
  status varchar NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by uuid NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT sales_targets_pkey PRIMARY KEY (id),
  CONSTRAINT sales_targets_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES public.users(id),
  CONSTRAINT sales_targets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Customer Sales Rep Assignment Table (to track which customers belong to which sales rep)
CREATE TABLE public.customer_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  sales_rep_id uuid NOT NULL,
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  assigned_by uuid NOT NULL,
  notes text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT customer_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT customer_assignments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT customer_assignments_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES public.users(id),
  CONSTRAINT customer_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id),
  CONSTRAINT customer_assignments_unique_active UNIQUE (customer_id, sales_rep_id, is_active)
);

-- Customer Complaints Table
CREATE TABLE public.customer_complaints (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  sales_rep_id uuid,
  order_id uuid,
  complaint_type varchar NOT NULL CHECK (complaint_type IN ('product', 'service', 'delivery', 'billing', 'other')),
  subject varchar NOT NULL,
  description text NOT NULL,
  priority varchar NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status varchar NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  resolution text,
  resolved_by uuid,
  resolved_at timestamp without time zone,
  customer_satisfaction_rating integer CHECK (customer_satisfaction_rating >= 1 AND customer_satisfaction_rating <= 5),
  created_by uuid NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT customer_complaints_pkey PRIMARY KEY (id),
  CONSTRAINT customer_complaints_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT customer_complaints_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES public.users(id),
  CONSTRAINT customer_complaints_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sales_orders(id),
  CONSTRAINT customer_complaints_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id),
  CONSTRAINT customer_complaints_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Sales Performance Metrics Cache Table (for faster queries)
CREATE TABLE public.sales_performance_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sales_rep_id uuid NOT NULL,
  metric_period_start date NOT NULL,
  metric_period_end date NOT NULL,
  period_type varchar NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  total_revenue numeric NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  total_customers integer NOT NULL DEFAULT 0,
  new_customers integer NOT NULL DEFAULT 0,
  customer_retention_rate numeric NOT NULL DEFAULT 0,
  average_order_value numeric NOT NULL DEFAULT 0,
  conversion_rate numeric NOT NULL DEFAULT 0,
  target_achievement_percentage numeric NOT NULL DEFAULT 0,
  ranking_position integer,
  ranking_total integer,
  last_calculated timestamp without time zone DEFAULT now(),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT sales_performance_cache_pkey PRIMARY KEY (id),
  CONSTRAINT sales_performance_cache_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES public.users(id),
  CONSTRAINT sales_performance_cache_unique UNIQUE (sales_rep_id, metric_period_start, metric_period_end, period_type)
);

-- Indexes for better performance
CREATE INDEX idx_sales_targets_sales_rep_period ON public.sales_targets(sales_rep_id, target_period_start, target_period_end);
CREATE INDEX idx_customer_assignments_sales_rep_active ON public.customer_assignments(sales_rep_id, is_active);
CREATE INDEX idx_customer_complaints_sales_rep_status ON public.customer_complaints(sales_rep_id, status);
CREATE INDEX idx_sales_performance_cache_lookup ON public.sales_performance_cache(sales_rep_id, period_type, metric_period_start);

-- Add assigned_sales_rep_id to customers table if it doesn't exist
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS assigned_sales_rep_id uuid;
ALTER TABLE public.customers ADD CONSTRAINT IF NOT EXISTS customers_assigned_sales_rep_id_fkey 
  FOREIGN KEY (assigned_sales_rep_id) REFERENCES public.users(id);

-- Create index for customer sales rep lookup
CREATE INDEX IF NOT EXISTS idx_customers_assigned_sales_rep ON public.customers(assigned_sales_rep_id);
