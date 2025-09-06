# FINANCE SYSTEM AUDIT - SQL DIAGNOSTICS

Based on your actual schema, here are the critical SQL diagnostics to run immediately:

## 🔴 CRITICAL DATA INTEGRITY CHECKS

### 1. **Invoices where sum(payments) ≠ invoice.paid_amount**
```sql
SELECT 
    i.id,
    i.customer_name,
    i.total,
    i.paid_amount as stored_paid_amount,
    COALESCE(SUM(p.amount), 0) as actual_payments_sum,
    i.paid_amount - COALESCE(SUM(p.amount), 0) as discrepancy,
    i.status
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id
GROUP BY i.id, i.customer_name, i.total, i.paid_amount, i.status
HAVING i.paid_amount <> COALESCE(SUM(p.amount), 0)
ORDER BY ABS(i.paid_amount - COALESCE(SUM(p.amount), 0)) DESC;
```

### 2. **Purchase Orders with payments but payment_status not updated**
```sql
SELECT 
    po.id,
    po.supplier_id,
    po.total,
    po.paid_amount,
    po.payment_status,
    COALESCE(SUM(pop.amount), 0) as actual_payments,
    COALESCE(SUM(vph.amount), 0) as vendor_payment_history
FROM purchase_orders po
LEFT JOIN purchase_order_payments pop ON pop.purchase_order_id = po.id
LEFT JOIN vendor_payment_history vph ON vph.purchase_order_id = po.id
GROUP BY po.id, po.supplier_id, po.total, po.paid_amount, po.payment_status
HAVING (COALESCE(SUM(pop.amount), 0) + COALESCE(SUM(vph.amount), 0)) > 0 
   AND po.payment_status = 'unpaid'
ORDER BY (COALESCE(SUM(pop.amount), 0) + COALESCE(SUM(vph.amount), 0)) DESC;
```

### 3. **Orphaned Payments (no linked invoice/PO)**
```sql
-- Payments without invoice
SELECT 'payments_no_invoice' as issue_type, COUNT(*) as count, SUM(amount) as total_amount
FROM payments 
WHERE invoice_id IS NULL;

-- Purchase order payments without PO
SELECT 'po_payments_orphaned' as issue_type, COUNT(*) as count, SUM(amount) as total_amount
FROM purchase_order_payments pop
LEFT JOIN purchase_orders po ON pop.purchase_order_id = po.id
WHERE po.id IS NULL;

-- Vendor payments without supplier
SELECT 'vendor_payments_orphaned' as issue_type, COUNT(*) as count, SUM(amount) as total_amount
FROM vendor_payment_history vph
LEFT JOIN suppliers s ON vph.supplier_id = s.id
WHERE s.id IS NULL;
```

### 4. **Double-Entry Ledger Balance Check**
```sql
SELECT 
    je.id,
    je.journal_number,
    je.entry_date,
    je.total_debit,
    je.total_credit,
    je.total_debit - je.total_credit as imbalance
FROM journal_entries je
WHERE je.total_debit <> je.total_credit
ORDER BY ABS(je.total_debit - je.total_credit) DESC;
```

### 5. **Invoices Overpaid**
```sql
SELECT 
    i.id,
    i.customer_name,
    i.total,
    COALESCE(SUM(p.amount), 0) as total_paid,
    COALESCE(SUM(p.amount), 0) - i.total as overpaid_amount
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id
GROUP BY i.id, i.customer_name, i.total
HAVING COALESCE(SUM(p.amount), 0) > i.total
ORDER BY (COALESCE(SUM(p.amount), 0) - i.total) DESC;
```

### 6. **Bank Transaction Integrity**
```sql
-- Expenses without bank transactions
SELECT 'expenses_no_bank_txn' as issue, COUNT(*) as count
FROM expenses e
WHERE NOT EXISTS (
    SELECT 1 FROM bank_transactions bt 
    WHERE bt.description LIKE '%Expense%' 
    AND bt.amount = e.amount 
    AND DATE(bt.transaction_date) = e.date
);

-- Bank transactions without linked records
SELECT 'orphaned_bank_txns' as issue, COUNT(*) as count, SUM(amount) as total
FROM bank_transactions bt
WHERE NOT EXISTS (
    SELECT 1 FROM payments p WHERE p.reference = bt.reference
) AND NOT EXISTS (
    SELECT 1 FROM expenses e WHERE e.amount = bt.amount AND DATE(bt.transaction_date) = e.date
) AND NOT EXISTS (
    SELECT 1 FROM purchase_order_payments pop WHERE pop.reference_number = bt.reference
);
```

### 7. **Sales Order → Invoice → Payment Chain**
```sql
SELECT 
    so.id as sales_order_id,
    so.final_price as order_total,
    i.total as invoice_total,
    i.paid_amount as invoice_paid,
    COALESCE(SUM(p.amount), 0) as payments_sum,
    CASE 
        WHEN i.id IS NULL THEN 'NO_INVOICE'
        WHEN so.final_price <> i.total THEN 'INVOICE_MISMATCH'
        WHEN i.paid_amount <> COALESCE(SUM(p.amount), 0) THEN 'PAYMENT_MISMATCH'
        ELSE 'OK'
    END as status
FROM sales_orders so
LEFT JOIN invoices i ON i.sales_order_id = so.id
LEFT JOIN payments p ON p.invoice_id = i.id
GROUP BY so.id, so.final_price, i.total, i.paid_amount, i.id
HAVING CASE 
    WHEN i.id IS NULL THEN 'NO_INVOICE'
    WHEN so.final_price <> i.total THEN 'INVOICE_MISMATCH'
    WHEN i.paid_amount <> COALESCE(SUM(p.amount), 0) THEN 'PAYMENT_MISMATCH'
    ELSE 'OK'
END <> 'OK'
ORDER BY so.final_price DESC;
```

### 8. **Account Balance vs Ledger Entries**
```sql
SELECT 
    coa.account_code,
    coa.account_name,
    coa.current_balance as stored_balance,
    COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0) as calculated_balance,
    coa.current_balance - COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0) as discrepancy
FROM chart_of_accounts coa
LEFT JOIN general_ledger gl ON gl.account_id = coa.id
GROUP BY coa.id, coa.account_code, coa.account_name, coa.current_balance
HAVING ABS(coa.current_balance - COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0)) > 0.01
ORDER BY ABS(coa.current_balance - COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0)) DESC;
```

## 🟡 DATA QUALITY ISSUES

### 9. **Missing Reference Numbers**
```sql
SELECT 'payments_no_reference' as issue, COUNT(*) as count 
FROM payments WHERE reference IS NULL OR reference = '';

SELECT 'vendor_payments_no_reference' as issue, COUNT(*) as count 
FROM vendor_payment_history WHERE reference_number IS NULL OR reference_number = '';

SELECT 'bank_txns_no_reference' as issue, COUNT(*) as count 
FROM bank_transactions WHERE reference IS NULL OR reference = '';
```

### 10. **Date Inconsistencies**
```sql
-- Payments before invoice creation
SELECT COUNT(*) as payments_before_invoice
FROM payments p
JOIN invoices i ON p.invoice_id = i.id
WHERE p.payment_date < i.created_at;

-- Purchase payments before PO creation
SELECT COUNT(*) as payments_before_po
FROM purchase_order_payments pop
JOIN purchase_orders po ON pop.purchase_order_id = po.id
WHERE pop.payment_date < po.created_at;
```

## 🔍 BUSINESS LOGIC VIOLATIONS

### 11. **Negative Balances Where Not Allowed**
```sql
-- Negative inventory
SELECT COUNT(*) as negative_inventory_items
FROM inventory_items WHERE quantity < 0;

-- Negative account balances for asset accounts
SELECT COUNT(*) as negative_asset_balances
FROM chart_of_accounts 
WHERE account_type IN ('ASSET', 'BANK', 'CASH') 
AND current_balance < 0;
```

### 12. **Status Inconsistencies**
```sql
-- Invoices marked paid but balance remaining
SELECT COUNT(*) as paid_invoices_with_balance
FROM invoices 
WHERE status = 'paid' AND (total - paid_amount) > 0.01;

-- POs marked paid but payments don't match
SELECT COUNT(*) as paid_pos_mismatch
FROM purchase_orders po
LEFT JOIN (
    SELECT purchase_order_id, SUM(amount) as total_payments
    FROM purchase_order_payments 
    GROUP BY purchase_order_id
) pop ON po.id = pop.purchase_order_id
WHERE po.payment_status = 'paid' 
AND (po.total - COALESCE(pop.total_payments, 0)) > 0.01;
```

## 🎯 EXECUTIVE SUMMARY QUERY

### Health Dashboard
```sql
WITH health_metrics AS (
    -- Invoice payment discrepancies
    SELECT 'invoice_payment_discrepancies' as metric,
           COUNT(*) as count,
           COALESCE(SUM(ABS(i.paid_amount - COALESCE(payment_sum, 0))), 0) as amount
    FROM invoices i
    LEFT JOIN (
        SELECT invoice_id, SUM(amount) as payment_sum 
        FROM payments 
        GROUP BY invoice_id
    ) p ON i.id = p.invoice_id
    WHERE i.paid_amount <> COALESCE(payment_sum, 0)
    
    UNION ALL
    
    -- Unbalanced journal entries
    SELECT 'unbalanced_journal_entries' as metric,
           COUNT(*) as count,
           COALESCE(SUM(ABS(total_debit - total_credit)), 0) as amount
    FROM journal_entries
    WHERE total_debit <> total_credit
    
    UNION ALL
    
    -- Orphaned payments
    SELECT 'orphaned_payments' as metric,
           COUNT(*) as count,
           COALESCE(SUM(amount), 0) as amount
    FROM payments
    WHERE invoice_id IS NULL
    
    UNION ALL
    
    -- Account balance discrepancies
    SELECT 'account_balance_discrepancies' as metric,
           COUNT(*) as count,
           COALESCE(SUM(ABS(discrepancy)), 0) as amount
    FROM (
        SELECT coa.current_balance - COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0) as discrepancy
        FROM chart_of_accounts coa
        LEFT JOIN general_ledger gl ON gl.account_id = coa.id
        GROUP BY coa.id, coa.current_balance
        HAVING ABS(coa.current_balance - COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0)) > 0.01
    ) balance_issues
)
SELECT * FROM health_metrics
ORDER BY amount DESC;
```

## 🚨 IMMEDIATE ACTION REQUIRED

### Run this first to get a quick health score:
```sql
SELECT 
    (SELECT COUNT(*) FROM invoices i LEFT JOIN (SELECT invoice_id, SUM(amount) as payment_sum FROM payments GROUP BY invoice_id) p ON i.id = p.invoice_id WHERE i.paid_amount <> COALESCE(payment_sum, 0)) as invoice_payment_mismatches,
    (SELECT COUNT(*) FROM journal_entries WHERE total_debit <> total_credit) as unbalanced_journal_entries,
    (SELECT COUNT(*) FROM payments WHERE invoice_id IS NULL) as orphaned_payments,
    (SELECT COUNT(*) FROM invoices WHERE status = 'paid' AND (total - paid_amount) > 0.01) as incorrectly_marked_paid,
    (SELECT COUNT(*) FROM purchase_orders WHERE payment_status = 'paid' AND (total - paid_amount) > 0.01) as po_payment_mismatches;
```

## 🔧 PRIORITY FIXES NEEDED

1. **P0 - Critical**: Fix invoice payment tracking triggers
2. **P0 - Critical**: Implement double-entry validation
3. **P1 - High**: Auto-create journal entries for sales/purchases  
4. **P1 - High**: Fix account balance calculations
5. **P2 - Medium**: Add foreign key constraints
6. **P2 - Medium**: Implement bank reconciliation

Run these queries in your Supabase SQL editor and report the results. The counts will tell us exactly where to focus the fixes!
