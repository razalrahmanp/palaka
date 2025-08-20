-- Create the sales_order_payment_summary view
-- This view provides a comprehensive summary of sales orders with payment information

CREATE OR REPLACE VIEW public.sales_order_payment_summary AS
SELECT 
    so.id as sales_order_id,
    c.name as customer_name,
    so.final_price as order_total,
    COALESCE(so.total_paid, 0) as total_paid,
    (so.final_price - COALESCE(so.total_paid, 0)) as balance_due,
    so.payment_status,
    COUNT(p.id) as payment_count,
    MAX(p.payment_date) as last_payment_date,
    -- Invoice information
    COALESCE(inv.invoice_number, 'N/A') as invoice_number,
    COALESCE(inv.status, 'not_invoiced') as invoice_status
FROM 
    public.sales_orders so
    LEFT JOIN public.customers c ON so.customer_id = c.id
    LEFT JOIN public.payments p ON so.id = p.sales_order_id
    LEFT JOIN public.invoices inv ON so.id = inv.sales_order_id
GROUP BY 
    so.id, 
    c.name, 
    so.final_price, 
    so.total_paid, 
    so.payment_status,
    inv.invoice_number,
    inv.status
ORDER BY 
    balance_due DESC;

-- Add comment to the view
COMMENT ON VIEW public.sales_order_payment_summary IS 'Comprehensive view of sales orders with payment and invoice summary information';
