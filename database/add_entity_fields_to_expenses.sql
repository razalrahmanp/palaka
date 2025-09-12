-- database/add_entity_fields_to_expenses.sql
-- Add entity tracking fields to expenses table

-- Add entity fields to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS entity_type text CHECK (entity_type = ANY (ARRAY['truck'::text, 'employee'::text, 'supplier'::text]));
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS entity_id uuid;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS entity_reference_id uuid; -- Links to specific records like vendor_payment_history, payroll_records, etc.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now();
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_entity_type ON expenses(entity_type);
CREATE INDEX IF NOT EXISTS idx_expenses_entity_id ON expenses(entity_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Add foreign key constraints (optional, for referential integrity)
-- Note: These are commented out as they might fail if referenced records don't exist
-- You can uncomment and run them after ensuring data integrity

-- ALTER TABLE expenses ADD CONSTRAINT expenses_entity_truck_fkey 
--   FOREIGN KEY (entity_id) REFERENCES trucks(id) 
--   DEFERRABLE INITIALLY DEFERRED;

-- ALTER TABLE expenses ADD CONSTRAINT expenses_entity_employee_fkey 
--   FOREIGN KEY (entity_id) REFERENCES employees(id) 
--   DEFERRABLE INITIALLY DEFERRED;

-- ALTER TABLE expenses ADD CONSTRAINT expenses_entity_supplier_fkey 
--   FOREIGN KEY (entity_id) REFERENCES suppliers(id) 
--   DEFERRABLE INITIALLY DEFERRED;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_expenses_updated_at ON expenses;
CREATE TRIGGER trigger_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE PROCEDURE update_expenses_updated_at();
