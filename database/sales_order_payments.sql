-- Create sales_order_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.sales_order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(15, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'CHEQUE', 'BANK_TRANSFER', 'CARD', 'UPI', 'OTHER')),
    payment_type TEXT NOT NULL DEFAULT 'advance' CHECK (payment_type IN ('advance', 'final', 'installment')),
    reference_number TEXT,
    bank_name TEXT,
    cheque_number TEXT,
    upi_transaction_id TEXT,
    card_last_four TEXT,
    payment_gateway_reference TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on sales_order_id for faster queries
CREATE INDEX IF NOT EXISTS idx_sales_order_payments_order_id ON public.sales_order_payments(sales_order_id);

-- Create view for payment summaries
CREATE OR REPLACE VIEW public.sales_order_payment_summary AS
SELECT
    sales_order_id,
    SUM(amount) AS total_paid,
    COUNT(*) AS number_of_payments,
    MIN(payment_date) AS first_payment_date,
    MAX(payment_date) AS last_payment_date,
    ARRAY_AGG(payment_method ORDER BY payment_date) AS payment_methods,
    (
        SELECT so.total_amount
        FROM sales_orders so
        WHERE so.id = sales_order_payments.sales_order_id
    ) AS order_total,
    (
        SELECT so.total_amount - SUM(sales_order_payments.amount)
        FROM sales_orders so
        WHERE so.id = sales_order_payments.sales_order_id
    ) AS remaining_balance,
    (
        SELECT
            CASE
                WHEN so.total_amount <= SUM(sales_order_payments.amount) THEN 'PAID'
                WHEN SUM(sales_order_payments.amount) > 0 THEN 'PARTIAL'
                ELSE 'UNPAID'
            END
        FROM sales_orders so
        WHERE so.id = sales_order_payments.sales_order_id
    ) AS payment_status
FROM
    public.sales_order_payments
GROUP BY
    sales_order_id;

-- Create a function to update the payment status in sales_orders table
CREATE OR REPLACE FUNCTION update_sales_order_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the payment_status in sales_orders based on the payment summary
    UPDATE sales_orders
    SET payment_status = (
        SELECT
            CASE
                WHEN total_amount <= COALESCE((
                    SELECT SUM(amount)
                    FROM sales_order_payments
                    WHERE sales_order_id = NEW.sales_order_id
                ), 0) THEN 'PAID'
                WHEN (
                    SELECT SUM(amount)
                    FROM sales_order_payments
                    WHERE sales_order_id = NEW.sales_order_id
                ) > 0 THEN 'PARTIAL'
                ELSE 'UNPAID'
            END
    )
    WHERE id = NEW.sales_order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update sales order payment status when payments change
DROP TRIGGER IF EXISTS update_sales_order_payment_status_trigger ON public.sales_order_payments;
CREATE TRIGGER update_sales_order_payment_status_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.sales_order_payments
FOR EACH ROW EXECUTE FUNCTION update_sales_order_payment_status();
