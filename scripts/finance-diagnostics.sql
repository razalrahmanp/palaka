-- FINANCE SYSTEM DIAGNOSTICS
-- Run these queries in Supabase SQL Editor to assess current state
-- Based on actual database schema structure

-- 1. Invoice Payment Discrepancies
SELECT 
    'Invoice Payment Mismatches' as check_type,
    COUNT(*) as issues_found,
    'Invoices where paid_amount differs from actual payments' as description
FROM (
    SELECT 
        i.id,
        i.id::text as invoice_ref,
        i.total,
        COALESCE(i.paid_amount, 0) as recorded_paid_amount,
        COALESCE(SUM(p.amount), 0) as actual_payments,
        ABS(COALESCE(i.paid_amount, 0) - COALESCE(SUM(p.amount), 0)) as difference
    FROM invoices i 
    LEFT JOIN payments p ON i.id = p.invoice_id
    GROUP BY i.id, i.total, i.paid_amount
    HAVING ABS(COALESCE(i.paid_amount, 0) - COALESCE(SUM(p.amount), 0)) > 0.01
) discrepancies;

-- 2. Orphaned Payments
SELECT 
    'Orphaned Payments' as check_type,
    COUNT(*) as issues_found,
    'Payments not linked to any invoice' as description
FROM payments p 
WHERE p.invoice_id IS NULL;

-- 3. Journal Entry Balance Check
SELECT 
    'Unbalanced Journal Entries' as check_type,
    COUNT(*) as issues_found,
    'Journal entries where debits != credits' as description
FROM (
    SELECT 
        je.id,
        je.journal_number,
        COALESCE(je.total_debit, 0) as total_debit,
        COALESCE(je.total_credit, 0) as total_credit,
        ABS(COALESCE(je.total_debit, 0) - COALESCE(je.total_credit, 0)) as difference
    FROM journal_entries je
    WHERE ABS(COALESCE(je.total_debit, 0) - COALESCE(je.total_credit, 0)) > 0.01
) unbalanced;

-- 4. Missing Chart of Accounts
SELECT 
    'Missing Essential Accounts' as check_type,
    CASE 
        WHEN COUNT(*) = 4 THEN 0
        ELSE 4 - COUNT(*)
    END as issues_found,
    'Essential accounts missing from chart of accounts' as description
FROM chart_of_accounts 
WHERE account_code IN ('1001', '1200', '2001', '3900'); -- Cash, A/R, A/P, Retained Earnings

-- 5. Purchase Order Payment Status
SELECT 
    'PO Payment Mismatches' as check_type,
    COUNT(*) as issues_found,
    'Purchase orders with incorrect payment status' as description
FROM (
    SELECT 
        po.id,
        po.id::text as po_ref,
        po.total,
        COALESCE(po.paid_amount, 0) as recorded_paid,
        COALESCE(SUM(vph.amount), 0) as actual_payments,
        po.payment_status
    FROM purchase_orders po
    LEFT JOIN vendor_payment_history vph ON po.id = vph.purchase_order_id
    GROUP BY po.id, po.total, po.paid_amount, po.payment_status
    HAVING (
        (COALESCE(SUM(vph.amount), 0) = 0 AND po.payment_status != 'unpaid') OR
        (COALESCE(SUM(vph.amount), 0) >= po.total AND po.payment_status != 'paid')
    )
) po_issues;

-- 6. Bank Account Transactions vs Payments
SELECT 
    'Unreconciled Bank Transactions' as check_type,
    COUNT(*) as issues_found,
    'Bank transactions without corresponding payments' as description
FROM bank_transactions bt
LEFT JOIN payments p ON bt.reference = p.reference
LEFT JOIN vendor_payment_history vph ON bt.reference = vph.reference_number
WHERE p.id IS NULL AND vph.id IS NULL;

-- 7. General Ledger Orphaned Entries
SELECT 
    'Orphaned GL Entries' as check_type,
    COUNT(*) as issues_found,
    'General ledger entries without valid journal entries' as description
FROM general_ledger gl
LEFT JOIN journal_entries je ON gl.journal_entry_id = je.id
WHERE je.id IS NULL;

-- 8. Account Balance Verification
WITH calculated_balances AS (
    SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        coa.current_balance as recorded_balance,
        COALESCE((ob.debit_amount - ob.credit_amount), 0) + 
        CASE 
            WHEN coa.normal_balance = 'DEBIT' THEN 
                COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0)
            ELSE 
                COALESCE(SUM(gl.credit_amount - gl.debit_amount), 0)
        END as calculated_balance
    FROM chart_of_accounts coa
    LEFT JOIN opening_balances ob ON coa.id = ob.account_id
    LEFT JOIN general_ledger gl ON coa.id = gl.account_id
    GROUP BY coa.id, coa.account_code, coa.account_name, coa.current_balance, coa.normal_balance, ob.debit_amount, ob.credit_amount
)
SELECT 
    'Account Balance Discrepancies' as check_type,
    COUNT(*) as issues_found,
    'Accounts where recorded balance != calculated balance' as description
FROM calculated_balances
WHERE ABS(COALESCE(recorded_balance, 0) - calculated_balance) > 0.01;

-- 9. Summary Report
SELECT 
    'SUMMARY' as section,
    COUNT(DISTINCT i.id) as total_invoices,
    COUNT(DISTINCT p.id) as total_payments,
    COUNT(DISTINCT po.id) as total_purchase_orders,
    COUNT(DISTINCT vph.id) as total_vendor_payments,
    COUNT(DISTINCT je.id) as total_journal_entries,
    COUNT(DISTINCT coa.id) as total_accounts
FROM invoices i
FULL OUTER JOIN payments p ON TRUE
FULL OUTER JOIN purchase_orders po ON TRUE
FULL OUTER JOIN vendor_payment_history vph ON TRUE
FULL OUTER JOIN journal_entries je ON TRUE
FULL OUTER JOIN chart_of_accounts coa ON TRUE;

-- 10. Recent Activity Check
SELECT 
    'Recent Finance Activity' as check_type,
    COUNT(*) as recent_transactions,
    'Transactions in last 30 days' as description
FROM (
    SELECT COALESCE(payment_date::timestamp, date::timestamp) as activity_date FROM payments WHERE COALESCE(payment_date::timestamp, date::timestamp) >= CURRENT_DATE - INTERVAL '30 days'
    UNION ALL
    SELECT created_at FROM vendor_payment_history WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    UNION ALL
    SELECT created_at FROM journal_entries WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
) recent_activity;

-- 11. Invoice Status Distribution
SELECT 
    'Invoice Status Overview' as check_type,
    status,
    COUNT(*) as count,
    SUM(total) as total_amount,
    SUM(paid_amount) as total_paid
FROM invoices
GROUP BY status
ORDER BY count DESC;

-- 12. Payment Method Analysis
SELECT 
    'Payment Methods' as check_type,
    p.method,
    COUNT(*) as payment_count,
    SUM(p.amount) as total_amount
FROM payments p
WHERE p.method IS NOT NULL
GROUP BY p.method
ORDER BY total_amount DESC;

-- 13. Vendor Payment Status Check
SELECT 
    'Vendor Payment Status' as check_type,
    vph.status,
    COUNT(*) as payment_count,
    SUM(vph.amount) as total_amount
FROM vendor_payment_history vph
GROUP BY vph.status
ORDER BY total_amount DESC;

-- 14. Chart of Accounts Structure
SELECT 
    'Chart of Accounts Overview' as check_type,
    coa.account_type::text as account_type,
    COUNT(*) as account_count,
    SUM(COALESCE(coa.current_balance, 0)) as total_balance
FROM chart_of_accounts coa
WHERE coa.is_active = true
GROUP BY coa.account_type::text
ORDER BY account_count DESC;

-- 15. Opening Balances Summary
SELECT 
    'Opening Balances Status' as check_type,
    ob.entity_type,
    COUNT(*) as balance_count,
    SUM(ob.debit_amount) as total_debit,
    SUM(ob.credit_amount) as total_credit
FROM opening_balances ob
GROUP BY ob.entity_type
ORDER BY balance_count DESC;
