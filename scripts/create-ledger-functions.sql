-- Create SQL functions for ledger transaction summaries

-- Function to get customer transaction summary
CREATE OR REPLACE FUNCTION get_customer_transaction_summary(customer_id_param UUID)
RETURNS TABLE (
    total_transactions BIGINT,
    total_amount NUMERIC,
    balance_due NUMERIC,
    last_transaction_date DATE
) AS $$
BEGIN
    RETURN QUERY
    WITH customer_sales AS (
        SELECT 
            so.id,
            so.created_at,
            so.final_price,
            COALESCE(so.total_paid, 0) as total_paid
        FROM sales_orders so
        WHERE so.customer_id = customer_id_param
    ),
    customer_payments AS (
        SELECT 
            p.payment_date,
            p.amount
        FROM payments p
        INNER JOIN sales_orders so ON p.sales_order_id = so.id
        WHERE so.customer_id = customer_id_param
    ),
    summary AS (
        SELECT 
            (SELECT COUNT(*) FROM customer_sales) + 
            (SELECT COUNT(*) FROM customer_payments) as total_txns,
            COALESCE((SELECT SUM(final_price) FROM customer_sales), 0) as total_sales,
            COALESCE((SELECT SUM(total_paid) FROM customer_sales), 0) as total_paid_calc,
            GREATEST(
                COALESCE((SELECT MAX(created_at::date) FROM customer_sales), '1900-01-01'::date),
                COALESCE((SELECT MAX(payment_date) FROM customer_payments), '1900-01-01'::date)
            ) as last_txn_date
    )
    SELECT 
        summary.total_txns::BIGINT,
        summary.total_sales::NUMERIC,
        (summary.total_sales - summary.total_paid_calc)::NUMERIC as balance,
        CASE 
            WHEN summary.last_txn_date = '1900-01-01'::date THEN NULL 
            ELSE summary.last_txn_date 
        END
    FROM summary;
END;
$$ LANGUAGE plpgsql;

-- Function to get supplier transaction summary
CREATE OR REPLACE FUNCTION get_supplier_transaction_summary(supplier_id_param UUID)
RETURNS TABLE (
    total_transactions BIGINT,
    total_amount NUMERIC,
    balance_due NUMERIC,
    last_transaction_date DATE
) AS $$
BEGIN
    RETURN QUERY
    WITH supplier_purchases AS (
        SELECT 
            po.id,
            po.created_at,
            po.total
        FROM purchase_orders po
        WHERE po.supplier_id = supplier_id_param
    ),
    supplier_payments AS (
        SELECT 
            vph.payment_date,
            vph.amount_paid
        FROM vendor_payment_history vph
        WHERE vph.supplier_id = supplier_id_param
    ),
    summary AS (
        SELECT 
            (SELECT COUNT(*) FROM supplier_purchases) + 
            (SELECT COUNT(*) FROM supplier_payments) as total_txns,
            COALESCE((SELECT SUM(total) FROM supplier_purchases), 0) as total_purchases,
            COALESCE((SELECT SUM(amount_paid) FROM supplier_payments), 0) as total_paid,
            GREATEST(
                COALESCE((SELECT MAX(created_at::date) FROM supplier_purchases), '1900-01-01'::date),
                COALESCE((SELECT MAX(payment_date) FROM supplier_payments), '1900-01-01'::date)
            ) as last_txn_date
    )
    SELECT 
        summary.total_txns::BIGINT,
        summary.total_purchases::NUMERIC,
        (summary.total_purchases - summary.total_paid)::NUMERIC as balance,
        CASE 
            WHEN summary.last_txn_date = '1900-01-01'::date THEN NULL 
            ELSE summary.last_txn_date 
        END
    FROM summary;
END;
$$ LANGUAGE plpgsql;

-- Function to get employee transaction summary
CREATE OR REPLACE FUNCTION get_employee_transaction_summary(employee_id_param UUID)
RETURNS TABLE (
    total_transactions BIGINT,
    total_amount NUMERIC,
    balance_due NUMERIC,
    last_transaction_date DATE
) AS $$
BEGIN
    RETURN QUERY
    WITH employee_journal_entries AS (
        SELECT 
            jel.id,
            je.entry_date,
            jel.debit_amount,
            jel.credit_amount
        FROM journal_entry_lines jel
        INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
        INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE (coa.account_name ILIKE '%salary%' OR 
               coa.account_name ILIKE '%wage%' OR 
               coa.account_name ILIKE '%payroll%' OR
               coa.account_name ILIKE '%employee%')
        AND (jel.description ILIKE '%' || employee_id_param::text || '%' OR
             je.description ILIKE '%' || employee_id_param::text || '%')
        AND je.status = 'POSTED'
    ),
    summary AS (
        SELECT 
            COUNT(*) as total_txns,
            COALESCE(SUM(debit_amount + credit_amount), 0) as total_amount,
            COALESCE(SUM(debit_amount - credit_amount), 0) as net_amount,
            MAX(entry_date) as last_txn_date
        FROM employee_journal_entries
    )
    SELECT 
        summary.total_txns::BIGINT,
        summary.total_amount::NUMERIC,
        summary.net_amount::NUMERIC as balance,
        summary.last_txn_date
    FROM summary;
END;
$$ LANGUAGE plpgsql;
