# FINANCE SYSTEM - DATABASE TRIGGERS & BACKEND FIXES

## 🎯 CRITICAL DATABASE TRIGGERS TO IMPLEMENT

### 1. **Invoice Payment Tracking Trigger**
```sql
-- Function to update invoice when payment is added/updated/deleted
CREATE OR REPLACE FUNCTION finance.update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    invoice_total NUMERIC;
    total_payments NUMERIC;
    invoice_status TEXT;
BEGIN
    -- Get the invoice_id from the operation
    DECLARE invoice_id_val UUID;
    
    IF TG_OP = 'DELETE' THEN
        invoice_id_val := OLD.invoice_id;
    ELSE
        invoice_id_val := NEW.invoice_id;
    END IF;
    
    -- Skip if no invoice linked
    IF invoice_id_val IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Calculate total payments for this invoice
    SELECT COALESCE(SUM(amount), 0) INTO total_payments
    FROM payments 
    WHERE invoice_id = invoice_id_val;
    
    -- Get invoice total
    SELECT total INTO invoice_total
    FROM invoices 
    WHERE id = invoice_id_val;
    
    -- Determine status
    IF total_payments = 0 THEN
        invoice_status := 'unpaid';
    ELSIF total_payments >= invoice_total THEN
        invoice_status := 'paid';
    ELSE
        invoice_status := 'partial';
    END IF;
    
    -- Update invoice
    UPDATE invoices 
    SET 
        paid_amount = total_payments,
        status = invoice_status::invoice_status,
        updated_at = NOW()
    WHERE id = invoice_id_val;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trg_payment_invoice_update ON payments;
CREATE TRIGGER trg_payment_invoice_update
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION finance.update_invoice_payment_status();
```

### 2. **Purchase Order Payment Tracking Trigger**
```sql
-- Function to update PO when payment is added
CREATE OR REPLACE FUNCTION finance.update_po_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    po_total NUMERIC;
    total_payments NUMERIC;
    po_status TEXT;
    po_id_val UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        po_id_val := OLD.purchase_order_id;
    ELSE
        po_id_val := NEW.purchase_order_id;
    END IF;
    
    IF po_id_val IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Calculate total payments from both tables
    SELECT 
        COALESCE(SUM(pop.amount), 0) + COALESCE(SUM(vph.amount), 0)
    INTO total_payments
    FROM purchase_orders po
    LEFT JOIN purchase_order_payments pop ON po.id = pop.purchase_order_id
    LEFT JOIN vendor_payment_history vph ON po.id = vph.purchase_order_id
    WHERE po.id = po_id_val
    GROUP BY po.id;
    
    SELECT total INTO po_total FROM purchase_orders WHERE id = po_id_val;
    
    -- Determine status
    IF total_payments = 0 THEN
        po_status := 'unpaid';
    ELSIF total_payments >= po_total THEN
        po_status := 'paid';
    ELSE
        po_status := 'partial';
    END IF;
    
    -- Update PO
    UPDATE purchase_orders 
    SET 
        paid_amount = total_payments,
        payment_status = po_status::payment_status
    WHERE id = po_id_val;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for both payment tables
DROP TRIGGER IF EXISTS trg_po_payment_update ON purchase_order_payments;
CREATE TRIGGER trg_po_payment_update
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_payments
    FOR EACH ROW EXECUTE FUNCTION finance.update_po_payment_status();

DROP TRIGGER IF EXISTS trg_vendor_payment_update ON vendor_payment_history;
CREATE TRIGGER trg_vendor_payment_update
    AFTER INSERT OR UPDATE OR DELETE ON vendor_payment_history
    FOR EACH ROW EXECUTE FUNCTION finance.update_po_payment_status();
```

### 3. **Auto Journal Entry Creation for Sales**
```sql
-- Function to create journal entries for sales payments
CREATE OR REPLACE FUNCTION finance.create_sales_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    je_id UUID;
    cash_account_id UUID;
    ar_account_id UUID;
    revenue_account_id UUID;
    invoice_rec RECORD;
BEGIN
    -- Skip if no invoice linked
    IF NEW.invoice_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get invoice details
    SELECT i.*, so.final_price 
    INTO invoice_rec
    FROM invoices i
    LEFT JOIN sales_orders so ON i.sales_order_id = so.id
    WHERE i.id = NEW.invoice_id;
    
    -- Get account IDs (you'll need to adjust these account codes)
    SELECT id INTO cash_account_id FROM chart_of_accounts WHERE account_code = '1001'; -- Cash
    SELECT id INTO ar_account_id FROM chart_of_accounts WHERE account_code = '1200'; -- Accounts Receivable
    SELECT id INTO revenue_account_id FROM chart_of_accounts WHERE account_code = '4001'; -- Sales Revenue
    
    -- Create journal entry for payment received
    INSERT INTO journal_entries (
        journal_number, 
        entry_date, 
        description, 
        entry_type, 
        status,
        total_debit,
        total_credit,
        source_document_type,
        source_document_id,
        created_by
    ) VALUES (
        'PAY-' || EXTRACT(YEAR FROM NEW.payment_date) || '-' || LPAD(nextval('payment_journal_seq')::text, 6, '0'),
        NEW.payment_date::date,
        'Payment received for Invoice #' || invoice_rec.id,
        'STANDARD',
        'POSTED',
        NEW.amount,
        NEW.amount,
        'PAYMENT',
        NEW.id,
        (SELECT id FROM users LIMIT 1) -- You'll need proper user context
    ) RETURNING id INTO je_id;
    
    -- Create journal entry lines
    -- Debit: Cash Account
    INSERT INTO journal_entry_lines (
        journal_entry_id, line_number, account_id, description, debit_amount, credit_amount
    ) VALUES (
        je_id, 1, cash_account_id, 'Cash received', NEW.amount, 0
    );
    
    -- Credit: Accounts Receivable
    INSERT INTO journal_entry_lines (
        journal_entry_id, line_number, account_id, description, debit_amount, credit_amount
    ) VALUES (
        je_id, 2, ar_account_id, 'A/R payment', 0, NEW.amount
    );
    
    -- Create general ledger entries
    INSERT INTO general_ledger (
        account_id, journal_entry_id, journal_line_id, transaction_date, posting_date,
        description, debit_amount, credit_amount, running_balance
    )
    SELECT 
        jel.account_id,
        je_id,
        jel.id,
        NEW.payment_date::date,
        NEW.payment_date::date,
        jel.description,
        jel.debit_amount,
        jel.credit_amount,
        -- Calculate running balance (simplified)
        COALESCE((
            SELECT running_balance 
            FROM general_ledger 
            WHERE account_id = jel.account_id 
            ORDER BY created_at DESC 
            LIMIT 1
        ), 0) + jel.debit_amount - jel.credit_amount
    FROM journal_entry_lines jel
    WHERE jel.journal_entry_id = je_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for journal numbering
CREATE SEQUENCE IF NOT EXISTS payment_journal_seq START 1;

-- Create trigger
DROP TRIGGER IF EXISTS trg_create_sales_journal ON payments;
CREATE TRIGGER trg_create_sales_journal
    AFTER INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION finance.create_sales_journal_entry();
```

### 4. **Auto Journal Entry for Purchase Orders**
```sql
-- Function to create journal entries for purchase payments
CREATE OR REPLACE FUNCTION finance.create_purchase_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    je_id UUID;
    cash_account_id UUID;
    ap_account_id UUID;
    expense_account_id UUID;
    po_rec RECORD;
BEGIN
    -- Skip if no PO linked
    IF NEW.purchase_order_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get PO details
    SELECT * INTO po_rec FROM purchase_orders WHERE id = NEW.purchase_order_id;
    
    -- Get account IDs
    SELECT id INTO cash_account_id FROM chart_of_accounts WHERE account_code = '1001'; -- Cash
    SELECT id INTO ap_account_id FROM chart_of_accounts WHERE account_code = '2001'; -- Accounts Payable
    
    -- Create journal entry
    INSERT INTO journal_entries (
        journal_number, 
        entry_date, 
        description, 
        entry_type, 
        status,
        total_debit,
        total_credit,
        source_document_type,
        source_document_id,
        created_by
    ) VALUES (
        'PPY-' || EXTRACT(YEAR FROM NEW.payment_date) || '-' || LPAD(nextval('purchase_payment_journal_seq')::text, 6, '0'),
        NEW.payment_date::date,
        'Payment for Purchase Order #' || po_rec.id,
        'STANDARD',
        'POSTED',
        NEW.amount,
        NEW.amount,
        'PURCHASE_PAYMENT',
        NEW.id,
        NEW.created_by
    ) RETURNING id INTO je_id;
    
    -- Journal entry lines
    -- Debit: Accounts Payable
    INSERT INTO journal_entry_lines (
        journal_entry_id, line_number, account_id, description, debit_amount, credit_amount
    ) VALUES (
        je_id, 1, ap_account_id, 'A/P payment', NEW.amount, 0
    );
    
    -- Credit: Cash
    INSERT INTO journal_entry_lines (
        journal_entry_id, line_number, account_id, description, debit_amount, credit_amount
    ) VALUES (
        je_id, 2, cash_account_id, 'Cash paid', 0, NEW.amount
    );
    
    -- Create general ledger entries
    INSERT INTO general_ledger (
        account_id, journal_entry_id, journal_line_id, transaction_date, posting_date,
        description, debit_amount, credit_amount, running_balance
    )
    SELECT 
        jel.account_id,
        je_id,
        jel.id,
        NEW.payment_date::date,
        NEW.payment_date::date,
        jel.description,
        jel.debit_amount,
        jel.credit_amount,
        COALESCE((
            SELECT running_balance 
            FROM general_ledger 
            WHERE account_id = jel.account_id 
            ORDER BY created_at DESC 
            LIMIT 1
        ), 0) + jel.debit_amount - jel.credit_amount
    FROM journal_entry_lines jel
    WHERE jel.journal_entry_id = je_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS purchase_payment_journal_seq START 1;

-- Triggers for both payment tables
DROP TRIGGER IF EXISTS trg_create_purchase_journal_pop ON purchase_order_payments;
CREATE TRIGGER trg_create_purchase_journal_pop
    AFTER INSERT ON purchase_order_payments
    FOR EACH ROW EXECUTE FUNCTION finance.create_purchase_journal_entry();

-- For vendor_payment_history, create a wrapper trigger
CREATE OR REPLACE FUNCTION finance.create_vendor_payment_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    je_id UUID;
    cash_account_id UUID;
    ap_account_id UUID;
BEGIN
    -- Get account IDs
    SELECT id INTO cash_account_id FROM chart_of_accounts WHERE account_code = '1001';
    SELECT id INTO ap_account_id FROM chart_of_accounts WHERE account_code = '2001';
    
    -- Create journal entry (similar to above but for vendor_payment_history)
    INSERT INTO journal_entries (
        journal_number, 
        entry_date, 
        description, 
        entry_type, 
        status,
        total_debit,
        total_credit,
        source_document_type,
        source_document_id,
        created_by
    ) VALUES (
        'VPY-' || EXTRACT(YEAR FROM NEW.payment_date) || '-' || LPAD(nextval('vendor_payment_journal_seq')::text, 6, '0'),
        NEW.payment_date::date,
        'Vendor payment to ' || (SELECT name FROM suppliers WHERE id = NEW.supplier_id),
        'STANDARD',
        'POSTED',
        NEW.amount,
        NEW.amount,
        'VENDOR_PAYMENT',
        NEW.id,
        NEW.created_by
    ) RETURNING id INTO je_id;
    
    -- Create the journal lines and GL entries (similar pattern)
    -- ... (implement similar to above)
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS vendor_payment_journal_seq START 1;

DROP TRIGGER IF EXISTS trg_create_vendor_journal ON vendor_payment_history;
CREATE TRIGGER trg_create_vendor_journal
    AFTER INSERT ON vendor_payment_history
    FOR EACH ROW EXECUTE FUNCTION finance.create_vendor_payment_journal_entry();
```

### 5. **Account Balance Update Trigger**
```sql
-- Function to update account balances when general ledger changes
CREATE OR REPLACE FUNCTION finance.update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    account_balance NUMERIC;
    account_normal_balance TEXT;
BEGIN
    -- Get account's normal balance type
    SELECT normal_balance INTO account_normal_balance 
    FROM chart_of_accounts 
    WHERE id = COALESCE(NEW.account_id, OLD.account_id);
    
    -- Calculate new balance for the account
    SELECT 
        CASE 
            WHEN account_normal_balance = 'DEBIT' THEN 
                COALESCE(SUM(debit_amount - credit_amount), 0)
            ELSE 
                COALESCE(SUM(credit_amount - debit_amount), 0)
        END
    INTO account_balance
    FROM general_ledger 
    WHERE account_id = COALESCE(NEW.account_id, OLD.account_id);
    
    -- Update the account balance
    UPDATE chart_of_accounts 
    SET 
        current_balance = account_balance,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.account_id, OLD.account_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_account_balance ON general_ledger;
CREATE TRIGGER trg_update_account_balance
    AFTER INSERT OR UPDATE OR DELETE ON general_ledger
    FOR EACH ROW EXECUTE FUNCTION finance.update_account_balance();
```

### 6. **Journal Entry Balance Validation**
```sql
-- Function to validate journal entry balance
CREATE OR REPLACE FUNCTION finance.validate_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
    total_debit NUMERIC;
    total_credit NUMERIC;
BEGIN
    -- Calculate totals for this journal entry
    SELECT 
        COALESCE(SUM(debit_amount), 0),
        COALESCE(SUM(credit_amount), 0)
    INTO total_debit, total_credit
    FROM journal_entry_lines 
    WHERE journal_entry_id = NEW.journal_entry_id;
    
    -- Update the journal entry totals
    UPDATE journal_entries 
    SET 
        total_debit = total_debit,
        total_credit = total_credit
    WHERE id = NEW.journal_entry_id;
    
    -- Validate balance
    IF ABS(total_debit - total_credit) > 0.01 THEN
        RAISE EXCEPTION 'Journal entry % is not balanced: Debit=%, Credit=%', 
            NEW.journal_entry_id, total_debit, total_credit;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_validate_journal_balance ON journal_entry_lines;
CREATE TRIGGER trg_validate_journal_balance
    AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
    FOR EACH ROW EXECUTE FUNCTION finance.validate_journal_balance();
```

## 🔧 BACKEND API FIXES

### Payment Creation Endpoint (Atomic Transaction)
```typescript
// src/app/api/finance/payments/route.ts
export async function POST(request: Request) {
  const supabase = createClient(/* your config */);
  
  try {
    const paymentData = await request.json();
    
    // Start transaction
    const { data: payment, error: paymentError } = await supabase.rpc('create_payment_with_accounting', {
      invoice_id: paymentData.invoice_id,
      amount: paymentData.amount,
      payment_date: paymentData.payment_date,
      method: paymentData.method,
      reference: paymentData.reference,
      description: paymentData.description,
      bank_account_id: paymentData.bank_account_id,
      created_by: paymentData.created_by
    });
    
    if (paymentError) throw paymentError;
    
    return NextResponse.json({ success: true, data: payment });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Create the stored procedure:
```sql
CREATE OR REPLACE FUNCTION create_payment_with_accounting(
    p_invoice_id UUID,
    p_amount NUMERIC,
    p_payment_date TIMESTAMP,
    p_method TEXT,
    p_reference TEXT,
    p_description TEXT,
    p_bank_account_id UUID,
    p_created_by UUID
) RETURNS UUID AS $$
DECLARE
    payment_id UUID;
    bank_txn_id UUID;
BEGIN
    -- Insert payment
    INSERT INTO payments (
        invoice_id, amount, payment_date, method, reference, description
    ) VALUES (
        p_invoice_id, p_amount, p_payment_date, p_method, p_reference, p_description
    ) RETURNING id INTO payment_id;
    
    -- Create bank transaction if bank account specified
    IF p_bank_account_id IS NOT NULL THEN
        INSERT INTO bank_transactions (
            bank_account_id, amount, transaction_type, reference, transaction_date, description
        ) VALUES (
            p_bank_account_id, p_amount, 'credit', p_reference, p_payment_date, p_description
        ) RETURNING id INTO bank_txn_id;
    END IF;
    
    -- Triggers will handle the rest (invoice update, journal entries, GL)
    
    RETURN payment_id;
END;
$$ LANGUAGE plpgsql;
```

## 🎯 FRONTEND FIXES (TanStack Query)

### Payment Mutation with Proper Invalidation
```typescript
// components/finance/PaymentManager.tsx
export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (paymentData) => {
      const response = await fetch('/api/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      if (!response.ok) throw new Error('Payment creation failed');
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['payments']);
      queryClient.invalidateQueries(['bank-accounts']);
      queryClient.invalidateQueries(['financial-summary']);
      queryClient.invalidateQueries(['ledgers']);
      
      // Specific invalidations
      if (variables.invoice_id) {
        queryClient.invalidateQueries(['invoice', variables.invoice_id]);
      }
      if (variables.bank_account_id) {
        queryClient.invalidateQueries(['bank-transactions', variables.bank_account_id]);
      }
      
      // Show success toast
      toast.success('Payment created successfully');
    },
    onError: (error) => {
      toast.error(`Payment creation failed: ${error.message}`);
    }
  });
};
```

## 🚀 DEPLOYMENT SEQUENCE

1. **Run the SQL diagnostics first** (from FINANCE_AUDIT_SQL_DIAGNOSTICS.md)
2. **Fix existing data inconsistencies** manually
3. **Deploy the triggers** in this order:
   - Account balance update trigger
   - Journal balance validation
   - Invoice payment tracking
   - PO payment tracking
   - Auto journal creation triggers
4. **Update frontend mutations** with proper invalidation
5. **Test with small transactions** before full deployment

These triggers will ensure data consistency going forward, while the diagnostics will help you clean up existing issues.
