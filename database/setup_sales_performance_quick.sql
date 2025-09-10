-- Quick setup script for sales performance tables
-- This script can be run safely multiple times

-- 1. Sales Targets Table
CREATE TABLE IF NOT EXISTS public.sales_targets (
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
  CONSTRAINT sales_targets_pkey PRIMARY KEY (id)
);

-- 2. Customer Assignments Table
CREATE TABLE IF NOT EXISTS public.customer_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  sales_rep_id uuid NOT NULL,
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  assigned_by uuid NOT NULL,
  notes text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT customer_assignments_pkey PRIMARY KEY (id)
);

-- 3. Customer Complaints Table
CREATE TABLE IF NOT EXISTS public.customer_complaints (
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
  CONSTRAINT customer_complaints_pkey PRIMARY KEY (id)
);

-- 4. Sales Performance Cache Table
CREATE TABLE IF NOT EXISTS public.sales_performance_cache (
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
  CONSTRAINT sales_performance_cache_pkey PRIMARY KEY (id)
);

-- Add the assigned_sales_rep_id column to customers if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'assigned_sales_rep_id') THEN
        ALTER TABLE public.customers ADD COLUMN assigned_sales_rep_id uuid;
    END IF;
END $$;

-- Now add foreign key constraints (only if they don't exist)
DO $$ 
BEGIN
    -- Sales targets foreign keys
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'sales_targets_sales_rep_id_fkey' 
                   AND table_name = 'sales_targets') THEN
        ALTER TABLE public.sales_targets ADD CONSTRAINT sales_targets_sales_rep_id_fkey 
            FOREIGN KEY (sales_rep_id) REFERENCES public.users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'sales_targets_created_by_fkey' 
                   AND table_name = 'sales_targets') THEN
        ALTER TABLE public.sales_targets ADD CONSTRAINT sales_targets_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES public.users(id);
    END IF;

    -- Customer assignments foreign keys
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'customer_assignments_customer_id_fkey' 
                   AND table_name = 'customer_assignments') THEN
        ALTER TABLE public.customer_assignments ADD CONSTRAINT customer_assignments_customer_id_fkey 
            FOREIGN KEY (customer_id) REFERENCES public.customers(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'customer_assignments_sales_rep_id_fkey' 
                   AND table_name = 'customer_assignments') THEN
        ALTER TABLE public.customer_assignments ADD CONSTRAINT customer_assignments_sales_rep_id_fkey 
            FOREIGN KEY (sales_rep_id) REFERENCES public.users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'customer_assignments_assigned_by_fkey' 
                   AND table_name = 'customer_assignments') THEN
        ALTER TABLE public.customer_assignments ADD CONSTRAINT customer_assignments_assigned_by_fkey 
            FOREIGN KEY (assigned_by) REFERENCES public.users(id);
    END IF;

    -- Customer complaints foreign keys
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'customer_complaints_customer_id_fkey' 
                   AND table_name = 'customer_complaints') THEN
        ALTER TABLE public.customer_complaints ADD CONSTRAINT customer_complaints_customer_id_fkey 
            FOREIGN KEY (customer_id) REFERENCES public.customers(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'customer_complaints_sales_rep_id_fkey' 
                   AND table_name = 'customer_complaints') THEN
        ALTER TABLE public.customer_complaints ADD CONSTRAINT customer_complaints_sales_rep_id_fkey 
            FOREIGN KEY (sales_rep_id) REFERENCES public.users(id);
    END IF;

    -- Sales performance cache foreign key
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'sales_performance_cache_sales_rep_id_fkey' 
                   AND table_name = 'sales_performance_cache') THEN
        ALTER TABLE public.sales_performance_cache ADD CONSTRAINT sales_performance_cache_sales_rep_id_fkey 
            FOREIGN KEY (sales_rep_id) REFERENCES public.users(id);
    END IF;

    -- Customers assigned sales rep foreign key
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'customers_assigned_sales_rep_id_fkey' 
                   AND table_name = 'customers') THEN
        ALTER TABLE public.customers ADD CONSTRAINT customers_assigned_sales_rep_id_fkey 
            FOREIGN KEY (assigned_sales_rep_id) REFERENCES public.users(id);
    END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sales_targets_sales_rep_period') THEN
        CREATE INDEX idx_sales_targets_sales_rep_period ON public.sales_targets(sales_rep_id, target_period_start, target_period_end);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_assignments_sales_rep_active') THEN
        CREATE INDEX idx_customer_assignments_sales_rep_active ON public.customer_assignments(sales_rep_id, is_active);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_complaints_sales_rep_status') THEN
        CREATE INDEX idx_customer_complaints_sales_rep_status ON public.customer_complaints(sales_rep_id, status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sales_performance_cache_lookup') THEN
        CREATE INDEX idx_sales_performance_cache_lookup ON public.sales_performance_cache(sales_rep_id, period_type, metric_period_start);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customers_assigned_sales_rep') THEN
        CREATE INDEX idx_customers_assigned_sales_rep ON public.customers(assigned_sales_rep_id);
    END IF;
END $$;
