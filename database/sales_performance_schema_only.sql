-- Minimal Sales Performance Schema Setup (No Sample Data)
-- This script only creates the essential tables and relationships needed for sales performance tracking

BEGIN;

-- Sales Targets/Quotas Table
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
  CONSTRAINT sales_targets_pkey PRIMARY KEY (id),
  CONSTRAINT sales_targets_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES public.users(id),
  CONSTRAINT sales_targets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Customer Sales Rep Assignment Table
CREATE TABLE IF NOT EXISTS public.customer_assignments (
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
  CONSTRAINT customer_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id)
);

-- Customer Complaints Table
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
  CONSTRAINT customer_complaints_pkey PRIMARY KEY (id),
  CONSTRAINT customer_complaints_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT customer_complaints_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES public.users(id),
  CONSTRAINT customer_complaints_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sales_orders(id),
  CONSTRAINT customer_complaints_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id),
  CONSTRAINT customer_complaints_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Add assigned_sales_rep_id column to customers table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'customers' 
                   AND column_name = 'assigned_sales_rep_id') THEN
        ALTER TABLE public.customers ADD COLUMN assigned_sales_rep_id uuid;
        ALTER TABLE public.customers ADD CONSTRAINT customers_assigned_sales_rep_id_fkey 
            FOREIGN KEY (assigned_sales_rep_id) REFERENCES public.users(id);
    END IF;
END$$;

-- Create essential indexes
CREATE INDEX IF NOT EXISTS idx_sales_targets_sales_rep_period ON public.sales_targets(sales_rep_id, target_period_start, target_period_end);
CREATE INDEX IF NOT EXISTS idx_customer_assignments_sales_rep_active ON public.customer_assignments(sales_rep_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customer_complaints_sales_rep_status ON public.customer_complaints(sales_rep_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_sales_rep ON public.customers(assigned_sales_rep_id);

COMMIT;
