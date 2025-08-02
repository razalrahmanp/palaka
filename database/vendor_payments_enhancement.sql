-- Enhanced Vendor Payment System for Existing Business

-- 1. Add fields to purchase_order_payments
ALTER TABLE public.purchase_order_payments 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS reference_number text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id);

-- 2. Vendor payment terms
CREATE TABLE IF NOT EXISTS public.vendor_payment_terms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
    payment_terms_days integer DEFAULT 30,
    early_payment_discount_percentage numeric DEFAULT 0,
    early_payment_days integer DEFAULT 0,
    late_payment_penalty_percentage numeric DEFAULT 0,
    credit_limit numeric DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    created_by uuid REFERENCES public.users(id)
);

-- 3. Vendor bills
CREATE TABLE IF NOT EXISTS public.vendor_bills (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
    bill_number text NOT NULL,
    bill_date date NOT NULL,
    due_date date NOT NULL,
    total_amount numeric NOT NULL,
    paid_amount numeric DEFAULT 0,
    remaining_amount numeric GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
    description text,
    tax_amount numeric DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    purchase_order_id uuid REFERENCES public.purchase_orders(id),
    attachment_url text,
    created_by uuid REFERENCES public.users(id),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT vendor_bills_bill_number_supplier_unique UNIQUE (bill_number, supplier_id)
);

-- 4. Vendor payment history
CREATE TABLE IF NOT EXISTS public.vendor_payment_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
    vendor_bill_id uuid REFERENCES public.vendor_bills(id),
    purchase_order_id uuid REFERENCES public.purchase_orders(id),
    amount numeric NOT NULL,
    payment_date date NOT NULL,
    payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'upi', 'card', 'other')),
    reference_number text,
    bank_account_id uuid REFERENCES public.bank_accounts(id),
    notes text,
    status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_by uuid REFERENCES public.users(id),
    created_at timestamp without time zone DEFAULT now()
);

-- 5. Triggers to update bill status
CREATE OR REPLACE FUNCTION update_vendor_bill_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE vendor_bills 
    SET status = CASE 
        WHEN paid_amount = 0 THEN 'pending'
        WHEN paid_amount >= total_amount THEN 'paid'
        WHEN paid_amount > 0 AND paid_amount < total_amount THEN 'partial'
        ELSE status
    END,
    updated_at = now()
    WHERE id = COALESCE(NEW.vendor_bill_id, OLD.vendor_bill_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_vendor_bill_status
AFTER INSERT OR UPDATE OR DELETE ON vendor_payment_history
FOR EACH ROW EXECUTE FUNCTION update_vendor_bill_status();

-- 6. Trigger to update PO payment status
CREATE OR REPLACE FUNCTION update_purchase_order_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE purchase_orders 
    SET payment_status = CASE 
        WHEN paid_amount = 0 THEN 'unpaid'
        WHEN paid_amount >= total THEN 'paid'
        WHEN paid_amount > 0 AND paid_amount < total THEN 'partially_paid'
        ELSE payment_status
    END
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_po_payment_status
AFTER INSERT OR UPDATE OR DELETE ON vendor_payment_history
FOR EACH ROW EXECUTE FUNCTION update_purchase_order_payment_status();

-- 7. Default terms for existing suppliers
INSERT INTO vendor_payment_terms (supplier_id, payment_terms_days, created_by)
SELECT id, 30, (SELECT id FROM users WHERE email LIKE '%admin%' LIMIT 1)
FROM suppliers 
WHERE is_deleted = false
ON CONFLICT DO NOTHING;

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_vendor_bills_supplier_id ON vendor_bills(supplier_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_status ON vendor_bills(status);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_due_date ON vendor_bills(due_date);
CREATE INDEX IF NOT EXISTS idx_vendor_payment_history_supplier_id ON vendor_payment_history(supplier_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payment_history_payment_date ON vendor_payment_history(payment_date);
CREATE INDEX IF NOT EXISTS idx_purchase_order_payments_po_id ON purchase_order_payments(purchase_order_id);

-- 9. Payment summary view
CREATE OR REPLACE VIEW vendor_payment_summary AS
SELECT 
    s.id as supplier_id,
    s.name as supplier_name,
    COUNT(DISTINCT po.id) as total_purchase_orders,
    COALESCE(SUM(po.total), 0) as total_purchase_amount,
    COALESCE(SUM(po.paid_amount), 0) as total_paid_amount,
    COALESCE(SUM(po.total - po.paid_amount), 0) as total_outstanding,
    COUNT(DISTINCT vb.id) as total_bills,
    COALESCE(SUM(vb.total_amount), 0) as total_bill_amount,
    COALESCE(SUM(vb.paid_amount), 0) as total_bill_paid,
    COALESCE(SUM(vb.remaining_amount), 0) as total_bill_outstanding,
    COUNT(DISTINCT CASE WHEN vb.status = 'overdue' THEN vb.id END) as overdue_bills,
    MAX(vph.payment_date) as last_payment_date
FROM suppliers s
LEFT JOIN purchase_orders po ON s.id = po.supplier_id AND po.status IS DISTINCT FROM 'cancelled'::purchase_order_status
LEFT JOIN vendor_bills vb ON s.id = vb.supplier_id AND vb.status != 'cancelled'
LEFT JOIN vendor_payment_history vph ON s.id = vph.supplier_id
WHERE s.is_deleted = false
GROUP BY s.id, s.name;

-- 10. Overdue vendor payments view
CREATE OR REPLACE VIEW overdue_vendor_payments AS
SELECT 
    vb.id as bill_id,
    vb.bill_number,
    s.name as supplier_name,
    vb.total_amount,
    vb.paid_amount,
    vb.remaining_amount,
    vb.due_date,
    CURRENT_DATE - vb.due_date as days_overdue,
    vpt.late_payment_penalty_percentage
FROM vendor_bills vb
JOIN suppliers s ON vb.supplier_id = s.id
LEFT JOIN vendor_payment_terms vpt ON s.id = vpt.supplier_id AND vpt.is_active = true
WHERE vb.status IN ('pending', 'partial') 
  AND vb.due_date < CURRENT_DATE
ORDER BY days_overdue DESC;

-- 11. Vendor financial summary function
CREATE OR REPLACE FUNCTION get_vendor_financial_summary(vendor_id uuid)
RETURNS TABLE (
    total_orders bigint,
    total_purchase_value numeric,
    total_paid numeric,
    total_outstanding numeric,
    current_stock_value numeric,
    last_payment_date date,
    average_payment_days numeric,
    credit_score text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT po.id)::bigint as total_orders,
        COALESCE(SUM(po.total), 0),
        COALESCE(SUM(po.paid_amount), 0),
        COALESCE(SUM(po.total - po.paid_amount), 0),
        COALESCE(SUM(ii.quantity * p.cost), 0),
        MAX(vph.payment_date),
        COALESCE(AVG(vph.payment_date - vb.due_date), 0),
        CASE 
            WHEN COALESCE(AVG(vph.payment_date - vb.due_date), 0) <= 0 THEN 'Excellent'
            WHEN COALESCE(AVG(vph.payment_date - vb.due_date), 0) <= 7 THEN 'Good'
            WHEN COALESCE(AVG(vph.payment_date - vb.due_date), 0) <= 30 THEN 'Fair'
            ELSE 'Poor'
        END
    FROM suppliers s
    LEFT JOIN purchase_orders po ON s.id = po.supplier_id
    LEFT JOIN vendor_payment_history vph ON s.id = vph.supplier_id
    LEFT JOIN vendor_bills vb ON vph.vendor_bill_id = vb.id
    LEFT JOIN inventory_items ii ON s.id = ii.supplier_id
    LEFT JOIN products p ON ii.product_id = p.id
    WHERE s.id = vendor_id
    GROUP BY s.id;
END;
$$ LANGUAGE plpgsql;

-- 12. Documentation comments
COMMENT ON TABLE vendor_payment_terms IS 'Payment terms and credit limits for each vendor';
COMMENT ON TABLE vendor_bills IS 'Vendor invoices/bills received from suppliers';
COMMENT ON TABLE vendor_payment_history IS 'Complete history of all payments made to vendors';
COMMENT ON VIEW vendor_payment_summary IS 'Summary of payment status for all vendors';
COMMENT ON VIEW overdue_vendor_payments IS 'List of all overdue vendor payments';
