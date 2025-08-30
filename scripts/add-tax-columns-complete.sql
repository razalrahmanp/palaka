-- Add tax columns to all relevant tables for billing system
-- This script adds comprehensive tax support to quotes, sales_orders, and sales_order_items

-- 1. Add tax columns to quotes table
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 18.00,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS taxable_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS grand_total DECIMAL(15,2) DEFAULT 0;

-- 2. Add tax columns to sales_orders table  
ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 18.00,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS taxable_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS grand_total DECIMAL(15,2) DEFAULT 0;

-- 3. Add tax columns to sales_order_items table
ALTER TABLE public.sales_order_items
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 18.00,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS taxable_amount DECIMAL(15,2) DEFAULT 0;

-- 4. Update the sync_sales_order_totals function to include tax calculations and preserve freight charges
CREATE OR REPLACE FUNCTION sync_sales_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    order_original_price DECIMAL(15,2);
    order_final_price DECIMAL(15,2);
    order_discount_amount DECIMAL(15,2);
    order_tax_amount DECIMAL(15,2);
    order_taxable_amount DECIMAL(15,2);
    order_grand_total DECIMAL(15,2);
    current_emi_monthly DECIMAL(10,2);
    current_emi_enabled BOOLEAN;
    current_bajaj_finance_amount DECIMAL(10,2);
    current_freight_charges DECIMAL(15,2);
    current_tax_percentage DECIMAL(5,2);
BEGIN
    -- Get current values to preserve them
    SELECT 
        emi_monthly, emi_enabled, bajaj_finance_amount, 
        COALESCE(freight_charges, 0), COALESCE(tax_percentage, 18.00)
    INTO 
        current_emi_monthly, current_emi_enabled, current_bajaj_finance_amount,
        current_freight_charges, current_tax_percentage
    FROM sales_orders 
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    -- Calculate totals from items
    SELECT 
        COALESCE(SUM(quantity * unit_price), 0),
        COALESCE(SUM(quantity * final_price), 0),
        COALESCE(SUM(tax_amount), 0)
    INTO order_original_price, order_final_price, order_tax_amount
    FROM sales_order_items 
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    -- Calculate derived values
    order_discount_amount := order_original_price - order_final_price;
    order_taxable_amount := order_final_price + current_freight_charges;
    order_tax_amount := ROUND(order_taxable_amount * current_tax_percentage / 100, 2);
    order_grand_total := order_taxable_amount + order_tax_amount;
    
    -- Update the parent sales order preserving important fields
    UPDATE sales_orders SET
        original_price = order_original_price,
        final_price = order_final_price,
        discount_amount = order_discount_amount,
        taxable_amount = order_taxable_amount,
        tax_amount = order_tax_amount,
        grand_total = order_grand_total,
        -- Preserve freight charges (don't let trigger override them)
        freight_charges = current_freight_charges,
        -- Preserve EMI fields if they're already set
        emi_monthly = CASE 
            WHEN current_emi_enabled = true AND current_emi_monthly IS NOT NULL AND current_emi_monthly > 0 
            THEN current_emi_monthly
            ELSE emi_monthly
        END,
        -- Preserve Bajaj Finance amount if set
        bajaj_finance_amount = CASE
            WHEN current_emi_enabled = true AND current_bajaj_finance_amount IS NOT NULL AND current_bajaj_finance_amount > 0
            THEN current_bajaj_finance_amount
            ELSE bajaj_finance_amount
        END,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to update sales_order_items tax calculations
CREATE OR REPLACE FUNCTION calculate_sales_order_item_tax()
RETURNS TRIGGER AS $$
DECLARE
    item_tax_percentage DECIMAL(5,2);
BEGIN
    -- Get tax percentage from parent sales order or use item's own tax percentage
    SELECT COALESCE(so.tax_percentage, NEW.tax_percentage, 18.00)
    INTO item_tax_percentage
    FROM sales_orders so
    WHERE so.id = NEW.order_id;
    
    -- Calculate tax for this item
    NEW.tax_percentage := item_tax_percentage;
    NEW.taxable_amount := NEW.quantity * NEW.final_price;
    NEW.tax_amount := ROUND(NEW.taxable_amount * item_tax_percentage / 100, 2);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for sales_order_items tax calculation
DROP TRIGGER IF EXISTS calculate_sales_order_item_tax_trigger ON sales_order_items;
CREATE TRIGGER calculate_sales_order_item_tax_trigger
    BEFORE INSERT OR UPDATE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_order_item_tax();

-- 7. Update existing records to have proper tax calculations
-- Update quotes with tax calculations
UPDATE quotes SET
    tax_percentage = COALESCE(tax_percentage, 18.00),
    taxable_amount = COALESCE(final_price, 0) + COALESCE(freight_charges, 0),
    tax_amount = ROUND((COALESCE(final_price, 0) + COALESCE(freight_charges, 0)) * COALESCE(tax_percentage, 18.00) / 100, 2),
    grand_total = COALESCE(final_price, 0) + COALESCE(freight_charges, 0) + ROUND((COALESCE(final_price, 0) + COALESCE(freight_charges, 0)) * COALESCE(tax_percentage, 18.00) / 100, 2)
WHERE tax_amount IS NULL OR grand_total IS NULL;

-- Update sales_orders with tax calculations
UPDATE sales_orders SET
    tax_percentage = COALESCE(tax_percentage, 18.00),
    taxable_amount = COALESCE(final_price, 0) + COALESCE(freight_charges, 0),
    tax_amount = ROUND((COALESCE(final_price, 0) + COALESCE(freight_charges, 0)) * COALESCE(tax_percentage, 18.00) / 100, 2),
    grand_total = COALESCE(final_price, 0) + COALESCE(freight_charges, 0) + ROUND((COALESCE(final_price, 0) + COALESCE(freight_charges, 0)) * COALESCE(tax_percentage, 18.00) / 100, 2)
WHERE tax_amount IS NULL OR grand_total IS NULL;

-- Update sales_order_items with tax calculations
UPDATE sales_order_items SET
    tax_percentage = COALESCE(tax_percentage, 18.00),
    taxable_amount = quantity * COALESCE(final_price, unit_price),
    tax_amount = ROUND(quantity * COALESCE(final_price, unit_price) * COALESCE(tax_percentage, 18.00) / 100, 2)
WHERE tax_amount IS NULL;

-- 8. Add comments for documentation
COMMENT ON COLUMN quotes.tax_percentage IS 'Tax percentage applied to the quote (e.g., 18.00 for 18% GST)';
COMMENT ON COLUMN quotes.tax_amount IS 'Calculated tax amount based on taxable_amount and tax_percentage';
COMMENT ON COLUMN quotes.taxable_amount IS 'Amount on which tax is calculated (final_price + freight_charges)';
COMMENT ON COLUMN quotes.grand_total IS 'Final total including tax (taxable_amount + tax_amount)';

COMMENT ON COLUMN sales_orders.tax_percentage IS 'Tax percentage applied to the sales order (e.g., 18.00 for 18% GST)';
COMMENT ON COLUMN sales_orders.tax_amount IS 'Calculated tax amount based on taxable_amount and tax_percentage';
COMMENT ON COLUMN sales_orders.taxable_amount IS 'Amount on which tax is calculated (final_price + freight_charges)';
COMMENT ON COLUMN sales_orders.grand_total IS 'Final total including tax (taxable_amount + tax_amount)';

COMMENT ON COLUMN sales_order_items.tax_percentage IS 'Tax percentage applied to this item';
COMMENT ON COLUMN sales_order_items.tax_amount IS 'Calculated tax amount for this item';
COMMENT ON COLUMN sales_order_items.taxable_amount IS 'Taxable amount for this item (quantity * final_price)';
