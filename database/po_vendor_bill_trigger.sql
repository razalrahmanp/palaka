-- Function to automatically create/update vendor bills when PO is created or updated
CREATE OR REPLACE FUNCTION handle_purchase_order_vendor_bill()
RETURNS TRIGGER AS $$
DECLARE
    existing_bill_id uuid;
    new_bill_amount numeric;
    current_outstanding numeric;
    system_user_id uuid;
    new_bill_number text;
BEGIN
    -- Only process if the PO has a supplier and total amount
    IF NEW.supplier_id IS NULL OR NEW.total IS NULL OR NEW.total <= 0 THEN
        RETURN NEW;
    END IF;

    -- Get a system user for created_by field
    SELECT id INTO system_user_id
    FROM users 
    LIMIT 1;

    -- If no system user found, skip vendor bill creation
    IF system_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Check if there's already a vendor bill for this supplier with pending status
    SELECT id, remaining_amount INTO existing_bill_id, current_outstanding
    FROM vendor_bills 
    WHERE supplier_id = NEW.supplier_id 
    AND status IN ('pending', 'partial')
    ORDER BY created_at DESC 
    LIMIT 1;

    -- Calculate the bill amount (use PO total)
    new_bill_amount := NEW.total;

    IF existing_bill_id IS NOT NULL THEN
        -- Update existing vendor bill by adding the new PO amount
        UPDATE vendor_bills 
        SET 
            total_amount = total_amount + new_bill_amount,
            remaining_amount = remaining_amount + new_bill_amount,
            description = COALESCE(description, '') || 
                CASE 
                    WHEN description IS NOT NULL AND description != '' THEN '; ' 
                    ELSE '' 
                END || 
                'PO #' || NEW.id::text || 
                CASE 
                    WHEN NEW.description IS NOT NULL THEN ' (' || NEW.description || ')' 
                    ELSE '' 
                END,
            updated_at = NOW(),
            updated_by = system_user_id
        WHERE id = existing_bill_id;

        -- Log the update
        INSERT INTO vendor_bill_po_links (vendor_bill_id, purchase_order_id, amount, created_at)
        VALUES (existing_bill_id, NEW.id, new_bill_amount, NOW())
        ON CONFLICT DO NOTHING;
    ELSE
        -- Generate unique bill number
        new_bill_number := 'PO-' || to_char(NOW(), 'YYYYMMDD') || '-' || substring(NEW.id::text, 1, 8);

        -- Create new vendor bill with all required fields
        INSERT INTO vendor_bills (
            supplier_id,
            bill_number,
            bill_date,
            due_date,
            total_amount,
            remaining_amount,
            paid_amount,
            description,
            reference_number,
            status,
            created_by,
            created_at,
            purchase_order_id
        ) VALUES (
            NEW.supplier_id,
            new_bill_number,
            CURRENT_DATE,
            COALESCE(NEW.due_date, CURRENT_DATE + INTERVAL '30 days'),
            new_bill_amount,
            new_bill_amount,
            0,
            'Auto-created from PO #' || NEW.id::text || 
            CASE 
                WHEN NEW.description IS NOT NULL THEN ' (' || NEW.description || ')' 
                ELSE '' 
            END,
            'PO-REF-' || NEW.id::text,
            'pending',
            system_user_id,
            NOW(),
            NEW.id
        ) RETURNING id INTO existing_bill_id;

        -- Link the PO to the vendor bill
        INSERT INTO vendor_bill_po_links (vendor_bill_id, purchase_order_id, amount, created_at)
        VALUES (existing_bill_id, NEW.id, new_bill_amount, NOW());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT operations
DROP TRIGGER IF EXISTS trigger_purchase_order_create_vendor_bill ON purchase_orders;
CREATE TRIGGER trigger_purchase_order_create_vendor_bill
    AFTER INSERT ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_purchase_order_vendor_bill();

-- Create trigger for UPDATE operations (when PO total changes)
DROP TRIGGER IF EXISTS trigger_purchase_order_update_vendor_bill ON purchase_orders;
CREATE TRIGGER trigger_purchase_order_update_vendor_bill
    AFTER UPDATE OF total ON purchase_orders
    FOR EACH ROW
    WHEN (OLD.total IS DISTINCT FROM NEW.total)
    EXECUTE FUNCTION handle_purchase_order_vendor_bill();

-- Create linking table to track which POs are linked to which vendor bills
CREATE TABLE IF NOT EXISTS vendor_bill_po_links (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_bill_id uuid REFERENCES vendor_bills(id) ON DELETE CASCADE,
    purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    created_at timestamp without time zone DEFAULT NOW(),
    UNIQUE(vendor_bill_id, purchase_order_id)
);

-- Add comment
COMMENT ON FUNCTION handle_purchase_order_vendor_bill() IS 'Automatically creates or updates vendor bills when purchase orders are created or modified';
COMMENT ON TABLE vendor_bill_po_links IS 'Links purchase orders to vendor bills for tracking what we owe suppliers';
