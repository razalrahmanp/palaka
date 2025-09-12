-- database/vehicle_expense_tables.sql
-- Create vehicle expense tracking tables

-- Table for logging all vehicle-related expenses
CREATE TABLE IF NOT EXISTS vehicle_expense_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL,
  expense_id uuid NOT NULL,
  expense_type text NOT NULL CHECK (expense_type = ANY (ARRAY['fuel'::text, 'maintenance'::text, 'insurance'::text, 'registration'::text, 'repair'::text, 'other'::text])),
  amount numeric NOT NULL,
  expense_date date NOT NULL,
  description text,
  odometer_reading numeric,
  quantity numeric, -- For fuel: liters, for parts: quantity
  unit_price numeric, -- Price per liter, per part, etc.
  location text, -- Gas station, service center, etc.
  vendor_name text,
  receipt_number text,
  created_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT vehicle_expense_logs_pkey PRIMARY KEY (id),
  CONSTRAINT vehicle_expense_logs_truck_id_fkey FOREIGN KEY (truck_id) REFERENCES public.trucks(id),
  CONSTRAINT vehicle_expense_logs_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id),
  CONSTRAINT vehicle_expense_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Table for detailed maintenance tracking
CREATE TABLE IF NOT EXISTS vehicle_maintenance_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL,
  expense_id uuid, -- Links to the expense record if maintenance was paid through expenses
  maintenance_type text NOT NULL, -- Oil Change, Tire Replacement, Engine Repair, etc.
  description text NOT NULL,
  cost numeric NOT NULL,
  maintenance_date date NOT NULL,
  odometer_reading numeric,
  next_maintenance_due_date date,
  next_maintenance_odometer numeric,
  vendor_name text,
  receipt_number text,
  status text DEFAULT 'completed'::text CHECK (status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  created_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT vehicle_maintenance_logs_pkey PRIMARY KEY (id),
  CONSTRAINT vehicle_maintenance_logs_truck_id_fkey FOREIGN KEY (truck_id) REFERENCES public.trucks(id),
  CONSTRAINT vehicle_maintenance_logs_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id),
  CONSTRAINT vehicle_maintenance_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicle_expense_logs_truck_id ON vehicle_expense_logs(truck_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_expense_logs_expense_date ON vehicle_expense_logs(expense_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_expense_logs_expense_type ON vehicle_expense_logs(expense_type);

CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_logs_truck_id ON vehicle_maintenance_logs(truck_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_logs_maintenance_date ON vehicle_maintenance_logs(maintenance_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_logs_status ON vehicle_maintenance_logs(status);

-- Add new columns to trucks table if they don't exist
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS current_odometer numeric DEFAULT 0;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS fuel_efficiency numeric DEFAULT 0; -- km per liter
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS maintenance_schedule_km numeric DEFAULT 10000; -- maintenance every X km

-- Create view for vehicle expense summary
CREATE OR REPLACE VIEW vehicle_expense_summary AS
SELECT 
  t.id as truck_id,
  t.plate_number,
  t.model,
  t.fuel_type,
  t.current_odometer,
  COUNT(vel.id) as total_expenses,
  SUM(vel.amount) as total_expense_amount,
  SUM(CASE WHEN vel.expense_type = 'fuel' THEN vel.amount ELSE 0 END) as fuel_expenses,
  SUM(CASE WHEN vel.expense_type = 'maintenance' THEN vel.amount ELSE 0 END) as maintenance_expenses,
  SUM(CASE WHEN vel.expense_type = 'repair' THEN vel.amount ELSE 0 END) as repair_expenses,
  SUM(CASE WHEN vel.expense_type = 'insurance' THEN vel.amount ELSE 0 END) as insurance_expenses,
  MAX(vel.expense_date) as last_expense_date,
  COUNT(vml.id) as maintenance_records,
  MAX(vml.maintenance_date) as last_maintenance_date
FROM trucks t
LEFT JOIN vehicle_expense_logs vel ON t.id = vel.truck_id
LEFT JOIN vehicle_maintenance_logs vml ON t.id = vml.truck_id
GROUP BY t.id, t.plate_number, t.model, t.fuel_type, t.current_odometer;

-- Grant permissions (adjust as needed for your user roles)
-- GRANT ALL ON vehicle_expense_logs TO authenticated;
-- GRANT ALL ON vehicle_maintenance_logs TO authenticated;
-- GRANT SELECT ON vehicle_expense_summary TO authenticated;
