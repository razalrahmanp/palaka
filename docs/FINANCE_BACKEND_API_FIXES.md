# FINANCE BACKEND - MISSING API ENDPOINTS

## 🎯 CRITICAL API ENDPOINTS TO FIX INTEGRATION

### 1. **Opening Balances Management API**
```typescript
// src/app/api/finance/opening-balances/route.ts
import { createClient } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient();
  
  try {
    const { data: openingBalances, error } = await supabase
      .from('opening_balances')
      .select(`
        *,
        chart_of_accounts(account_code, account_name, account_type)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json({ data: openingBalances });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = createClient();
  
  try {
    const balanceData = await request.json();
    
    // Call stored procedure to create opening balance with journal entry
    const { data, error } = await supabase.rpc('create_opening_balance', {
      p_account_id: balanceData.account_id,
      p_balance_amount: balanceData.balance_amount,
      p_balance_date: balanceData.balance_date,
      p_description: balanceData.description,
      p_created_by: balanceData.created_by
    });
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 2. **Account Balance Summary API**
```typescript
// src/app/api/finance/account-balances/route.ts
import { createClient } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const accountType = searchParams.get('account_type');
  const asOfDate = searchParams.get('as_of_date');
  
  try {
    // Get real-time account balances
    let query = supabase
      .from('account_balance_view')
      .select('*')
      .order('account_code');
    
    if (accountType) {
      query = query.eq('account_type', accountType);
    }
    
    const { data: balances, error } = await query;
    
    if (error) throw error;
    
    // Calculate totals by account type
    const summary = balances.reduce((acc, account) => {
      if (!acc[account.account_type]) {
        acc[account.account_type] = { total: 0, accounts: [] };
      }
      acc[account.account_type].total += parseFloat(account.current_balance || 0);
      acc[account.account_type].accounts.push(account);
      return acc;
    }, {});
    
    return NextResponse.json({ 
      data: balances, 
      summary,
      as_of_date: asOfDate || new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 3. **Financial Reports API**
```typescript
// src/app/api/finance/reports/[reportType]/route.ts
import { createClient } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { reportType: string } }
) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  
  try {
    switch (params.reportType) {
      case 'profit-loss':
        return await generateProfitLossReport(supabase, startDate, endDate);
      case 'balance-sheet':
        return await generateBalanceSheetReport(supabase, endDate);
      case 'trial-balance':
        return await generateTrialBalanceReport(supabase, endDate);
      case 'cash-flow':
        return await generateCashFlowReport(supabase, startDate, endDate);
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generateProfitLossReport(supabase, startDate, endDate) {
  const { data, error } = await supabase.rpc('generate_profit_loss_report', {
    p_start_date: startDate,
    p_end_date: endDate
  });
  
  if (error) throw error;
  
  return NextResponse.json({
    report_type: 'Profit & Loss Statement',
    period: { start_date: startDate, end_date: endDate },
    data
  });
}

async function generateBalanceSheetReport(supabase, asOfDate) {
  const { data, error } = await supabase.rpc('generate_balance_sheet_report', {
    p_as_of_date: asOfDate
  });
  
  if (error) throw error;
  
  return NextResponse.json({
    report_type: 'Balance Sheet',
    as_of_date: asOfDate,
    data
  });
}

async function generateTrialBalanceReport(supabase, asOfDate) {
  const { data, error } = await supabase.rpc('generate_trial_balance_report', {
    p_as_of_date: asOfDate
  });
  
  if (error) throw error;
  
  return NextResponse.json({
    report_type: 'Trial Balance',
    as_of_date: asOfDate,
    data
  });
}
```

### 4. **Enhanced Payments API**
```typescript
// src/app/api/finance/payments/route.ts (UPDATED)
import { createClient } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get('invoice_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  
  try {
    let query = supabase
      .from('payments')
      .select(`
        *,
        invoices(id, invoice_number, total, customer_id),
        bank_transactions(id, reference)
      `)
      .order('payment_date', { ascending: false });
    
    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId);
    }
    
    if (startDate) {
      query = query.gte('payment_date', startDate);
    }
    
    if (endDate) {
      query = query.lte('payment_date', endDate);
    }
    
    const { data: payments, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({ data: payments });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = createClient();
  
  try {
    const paymentData = await request.json();
    
    // Validate required fields
    if (!paymentData.amount || !paymentData.payment_date) {
      return NextResponse.json(
        { error: 'Amount and payment date are required' }, 
        { status: 400 }
      );
    }
    
    // Use stored procedure for atomic transaction
    const { data: payment, error } = await supabase.rpc('create_payment_with_accounting', {
      p_invoice_id: paymentData.invoice_id,
      p_purchase_order_id: paymentData.purchase_order_id,
      p_amount: paymentData.amount,
      p_payment_date: paymentData.payment_date,
      p_method: paymentData.method || 'cash',
      p_reference: paymentData.reference,
      p_description: paymentData.description,
      p_bank_account_id: paymentData.bank_account_id,
      p_created_by: paymentData.created_by
    });
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, data: payment });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 5. **Journal Entries API**
```typescript
// src/app/api/finance/journal-entries/route.ts (NEW)
import { createClient } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const status = searchParams.get('status');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  
  try {
    let query = supabase
      .from('journal_entries')
      .select(`
        *,
        journal_entry_lines(
          *,
          chart_of_accounts(account_code, account_name, account_type)
        )
      `)
      .order('entry_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (startDate) {
      query = query.gte('entry_date', startDate);
    }
    
    if (endDate) {
      query = query.lte('entry_date', endDate);
    }
    
    const { data: journalEntries, error, count } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({ 
      data: journalEntries,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = createClient();
  
  try {
    const journalData = await request.json();
    
    // Validate double-entry balance
    const totalDebit = journalData.lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
    const totalCredit = journalData.lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: 'Journal entry must be balanced. Debits and credits must be equal.' },
        { status: 400 }
      );
    }
    
    // Create journal entry with lines
    const { data, error } = await supabase.rpc('create_journal_entry_with_lines', {
      p_journal_data: journalData
    });
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 6. **Bank Reconciliation API**
```typescript
// src/app/api/finance/bank-reconciliation/[bankAccountId]/route.ts
import { createClient } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { bankAccountId: string } }
) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  
  try {
    // Get bank transactions
    const { data: bankTransactions, error: bankError } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('bank_account_id', params.bankAccountId)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date');
    
    if (bankError) throw bankError;
    
    // Get corresponding book transactions (payments/receipts)
    const { data: bookTransactions, error: bookError } = await supabase
      .from('bank_reconciliation_view')
      .select('*')
      .eq('bank_account_id', params.bankAccountId)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);
    
    if (bookError) throw bookError;
    
    // Calculate reconciliation summary
    const bankBalance = bankTransactions.reduce((sum, txn) => {
      return sum + (txn.transaction_type === 'credit' ? txn.amount : -txn.amount);
    }, 0);
    
    const bookBalance = bookTransactions.reduce((sum, txn) => {
      return sum + (txn.debit_amount - txn.credit_amount);
    }, 0);
    
    const difference = bankBalance - bookBalance;
    
    return NextResponse.json({
      bank_account_id: params.bankAccountId,
      period: { start_date: startDate, end_date: endDate },
      summary: {
        bank_balance: bankBalance,
        book_balance: bookBalance,
        difference: difference,
        is_reconciled: Math.abs(difference) < 0.01
      },
      bank_transactions: bankTransactions,
      book_transactions: bookTransactions
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## 🗄️ REQUIRED DATABASE VIEWS

### Account Balance View
```sql
-- Create a view for real-time account balances
CREATE OR REPLACE VIEW account_balance_view AS
SELECT 
    coa.id,
    coa.account_code,
    coa.account_name,
    coa.account_type,
    coa.normal_balance,
    COALESCE(
        CASE 
            WHEN coa.normal_balance = 'DEBIT' THEN 
                COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0) + COALESCE(ob.balance_amount, 0)
            ELSE 
                COALESCE(SUM(gl.credit_amount - gl.debit_amount), 0) + COALESCE(ob.balance_amount, 0)
        END, 
        COALESCE(ob.balance_amount, 0)
    ) AS current_balance,
    COALESCE(ob.balance_amount, 0) AS opening_balance,
    COUNT(gl.id) AS transaction_count,
    MAX(gl.transaction_date) AS last_transaction_date
FROM chart_of_accounts coa
LEFT JOIN general_ledger gl ON coa.id = gl.account_id
LEFT JOIN opening_balances ob ON coa.id = ob.account_id
GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type, coa.normal_balance, ob.balance_amount
ORDER BY coa.account_code;
```

### Bank Reconciliation View
```sql
-- Create view for bank reconciliation
CREATE OR REPLACE VIEW bank_reconciliation_view AS
SELECT 
    'PAYMENT' as transaction_type,
    p.id as source_id,
    p.payment_date as transaction_date,
    p.amount,
    p.reference,
    p.description,
    bt.bank_account_id,
    p.amount as debit_amount,
    0 as credit_amount,
    CASE WHEN bt.id IS NOT NULL THEN true ELSE false END as is_cleared
FROM payments p
LEFT JOIN bank_transactions bt ON p.reference = bt.reference
WHERE p.bank_account_id IS NOT NULL

UNION ALL

SELECT 
    'PURCHASE_PAYMENT' as transaction_type,
    vph.id as source_id,
    vph.payment_date as transaction_date,
    vph.amount,
    vph.reference,
    vph.description,
    vph.bank_account_id,
    0 as debit_amount,
    vph.amount as credit_amount,
    CASE WHEN bt.id IS NOT NULL THEN true ELSE false END as is_cleared
FROM vendor_payment_history vph
LEFT JOIN bank_transactions bt ON vph.reference = bt.reference
WHERE vph.bank_account_id IS NOT NULL;
```

## 🔧 STORED PROCEDURES FOR REPORTING

### Profit & Loss Report
```sql
CREATE OR REPLACE FUNCTION generate_profit_loss_report(
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE (
    account_type TEXT,
    account_code TEXT,
    account_name TEXT,
    amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        coa.account_type::TEXT,
        coa.account_code::TEXT,
        coa.account_name::TEXT,
        CASE 
            WHEN coa.account_type IN ('REVENUE') THEN 
                COALESCE(SUM(gl.credit_amount - gl.debit_amount), 0)
            WHEN coa.account_type IN ('EXPENSE', 'COST_OF_GOODS_SOLD') THEN 
                COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0)
            ELSE 0
        END as amount
    FROM chart_of_accounts coa
    LEFT JOIN general_ledger gl ON coa.id = gl.account_id 
        AND gl.transaction_date BETWEEN p_start_date AND p_end_date
    WHERE coa.account_type IN ('REVENUE', 'EXPENSE', 'COST_OF_GOODS_SOLD')
    GROUP BY coa.account_type, coa.account_code, coa.account_name, coa.id
    ORDER BY coa.account_type, coa.account_code;
END;
$$ LANGUAGE plpgsql;
```

### Balance Sheet Report
```sql
CREATE OR REPLACE FUNCTION generate_balance_sheet_report(
    p_as_of_date DATE
) RETURNS TABLE (
    account_type TEXT,
    account_code TEXT,
    account_name TEXT,
    amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        coa.account_type::TEXT,
        coa.account_code::TEXT,
        coa.account_name::TEXT,
        CASE 
            WHEN coa.normal_balance = 'DEBIT' THEN 
                COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0) + COALESCE(ob.balance_amount, 0)
            ELSE 
                COALESCE(SUM(gl.credit_amount - gl.debit_amount), 0) + COALESCE(ob.balance_amount, 0)
        END as amount
    FROM chart_of_accounts coa
    LEFT JOIN general_ledger gl ON coa.id = gl.account_id 
        AND gl.transaction_date <= p_as_of_date
    LEFT JOIN opening_balances ob ON coa.id = ob.account_id
    WHERE coa.account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
    GROUP BY coa.account_type, coa.account_code, coa.account_name, coa.normal_balance, ob.balance_amount
    ORDER BY coa.account_type, coa.account_code;
END;
$$ LANGUAGE plpgsql;
```

## 🚀 DEPLOYMENT PRIORITY

1. **Deploy database views and stored procedures** first
2. **Create the missing API endpoints** in order:
   - Opening balances API
   - Account balances API  
   - Enhanced payments API
   - Journal entries API
   - Financial reports API
   - Bank reconciliation API
3. **Update frontend components** to use these APIs
4. **Test thoroughly** with sample data

These APIs will connect your existing frontend to the database with proper accounting integration!
