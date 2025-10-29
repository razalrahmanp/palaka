-- Table to store role-based route access configuration
CREATE TABLE IF NOT EXISTS role_access_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL UNIQUE,
    accessible_routes TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_role_access_config_role ON role_access_config(role);

-- Insert default configurations for all roles
INSERT INTO role_access_config (role, accessible_routes) VALUES
('Auditor', ARRAY[
    '/dashboard',
    '/sales', '/sales/customers', '/sales/orders', '/sales/quotes',
    '/inventory', '/inventory/products', '/inventory/stock', '/inventory/adjustments',
    '/manufacturing', '/manufacturing/bom', '/manufacturing/work-orders',
    '/logistics', '/logistics/deliveries', '/logistics/vehicles',
    '/procurement', '/procurement/purchase-orders', '/procurement/vendors',
    '/finance', '/finance/invoices', '/finance/payments',
    '/hr', '/hr/employees', '/hr/attendance', '/hr/payroll', '/hr/performance'
]),
('Executive', ARRAY[
    '/dashboard',
    '/sales', '/sales/customers', '/sales/orders', '/sales/quotes',
    '/inventory', '/inventory/products', '/inventory/stock',
    '/manufacturing', '/manufacturing/bom', '/manufacturing/work-orders',
    '/logistics', '/logistics/deliveries',
    '/procurement', '/procurement/purchase-orders', '/procurement/vendors',
    '/finance', '/finance/invoices', '/finance/payments',
    '/hr', '/hr/employees', '/hr/attendance', '/hr/payroll', '/hr/performance'
]),
('Sales Manager', ARRAY[
    '/dashboard',
    '/sales', '/sales/customers', '/sales/orders', '/sales/quotes'
]),
('Sales Representative', ARRAY[
    '/dashboard',
    '/sales', '/sales/customers', '/sales/orders', '/sales/quotes'
]),
('Procurement Manager', ARRAY[
    '/dashboard',
    '/procurement', '/procurement/purchase-orders', '/procurement/vendors',
    '/inventory', '/inventory/products'
]),
('Warehouse Manager', ARRAY[
    '/dashboard',
    '/inventory', '/inventory/products', '/inventory/stock', '/inventory/adjustments'
]),
('Warehouse Staff', ARRAY[
    '/dashboard',
    '/inventory', '/inventory/stock'
]),
('Production Manager', ARRAY[
    '/dashboard',
    '/manufacturing', '/manufacturing/bom', '/manufacturing/work-orders',
    '/inventory', '/inventory/products', '/inventory/stock'
]),
('Production Staff', ARRAY[
    '/dashboard',
    '/manufacturing', '/manufacturing/work-orders'
]),
('Logistics Coordinator', ARRAY[
    '/dashboard',
    '/logistics', '/logistics/deliveries', '/logistics/vehicles'
]),
('Delivery Driver', ARRAY[
    '/dashboard',
    '/logistics', '/logistics/deliveries'
]),
('Finance Manager', ARRAY[
    '/dashboard',
    '/finance', '/finance/invoices', '/finance/payments',
    '/sales', '/sales/orders',
    '/procurement', '/procurement/purchase-orders'
]),
('HR Manager', ARRAY[
    '/dashboard',
    '/hr', '/hr/employees', '/hr/attendance', '/hr/payroll', '/hr/performance'
]),
('HR', ARRAY[
    '/dashboard',
    '/hr', '/hr/employees', '/hr/attendance', '/hr/payroll'
]),
('Employee', ARRAY[
    '/dashboard'
])
ON CONFLICT (role) DO NOTHING;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_role_access_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_role_access_config_updated_at
BEFORE UPDATE ON role_access_config
FOR EACH ROW
EXECUTE FUNCTION update_role_access_config_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON role_access_config TO authenticated;
GRANT SELECT ON role_access_config TO anon;
