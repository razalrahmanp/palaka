# Journal Entries Guide for Payables and Receivables

## Overview
This guide explains how to create proper journal entries for payables and receivables using the enhanced transaction system. All entries follow double-entry bookkeeping principles and utilize the chart of accounts structure.

## Key Account Types in Schema

### Assets (Normal Balance: DEBIT)
- **1001 - Cash**: Cash on hand
- **1002 - Bank Account**: Bank deposits and electronic payments
- **1200 - Accounts Receivable**: Money owed by customers
- **1300 - Inventory**: Physical stock assets

### Liabilities (Normal Balance: CREDIT)
- **2001 - Accounts Payable**: Money owed to suppliers/vendors
- **2100 - Accrued Liabilities**: Outstanding obligations
- **2200 - Notes Payable**: Loan obligations

### Expenses (Normal Balance: DEBIT)
- **5000 - General Expenses**: Operating costs
- **5100 - Salaries & Wages**: Employee compensation
- **5200 - Rent Expense**: Property rental costs
- **5300 - Utilities**: Electricity, water, internet

## Journal Entry Types

### 1. Vendor Payments (Accounts Payable)

**Purpose**: Record payments made to suppliers for outstanding bills

**Transaction Flow**:
```
Dr. Accounts Payable (2001)     ₹X,XXX
    Cr. Bank Account (1002)         ₹X,XXX
```

**When to Use**:
- Paying supplier invoices
- Settling vendor bills
- Reducing outstanding payables

**Example**:
```sql
INSERT INTO journal_entries (description, entry_date, source_document_type) 
VALUES ('Vendor Payment - ABC Furniture Supplier', '2024-01-15', 'VENDOR_PAYMENT');

INSERT INTO journal_entry_lines (account_code, description, debit_amount, credit_amount)
VALUES 
  ('2001', 'Payment to ABC Furniture Supplier', 50000, 0),
  ('1002', 'Bank transfer payment', 0, 50000);
```

**Result**: 
- Reduces Accounts Payable (liability decreases)
- Reduces Bank Account (asset decreases)
- Net effect: Company has less cash but also owes less money

### 2. Customer Payments (Accounts Receivable)

**Purpose**: Record payments received from customers for outstanding invoices

**Transaction Flow**:
```
Dr. Bank Account (1002)          ₹X,XXX
    Cr. Accounts Receivable (1200)     ₹X,XXX
```

**When to Use**:
- Customer pays outstanding invoice
- Collecting receivables
- Recording customer settlements

**Example**:
```sql
INSERT INTO journal_entries (description, entry_date, source_document_type) 
VALUES ('Customer Payment - XYZ Corp', '2024-01-15', 'CUSTOMER_PAYMENT');

INSERT INTO journal_entry_lines (account_code, description, debit_amount, credit_amount)
VALUES 
  ('1002', 'Payment received via bank transfer', 75000, 0),
  ('1200', 'Payment from XYZ Corp for Invoice #INV-001', 0, 75000);
```

**Result**:
- Increases Bank Account (asset increases)
- Reduces Accounts Receivable (asset decreases)
- Net effect: Company converts receivable to cash

### 3. Business Expenses

**Purpose**: Record day-to-day business expenses paid

**Transaction Flow**:
```
Dr. Expense Account (5XXX)       ₹X,XXX
    Cr. Bank Account (1002)         ₹X,XXX
```

**When to Use**:
- Office rent payments
- Utility bill payments
- General operating expenses
- Employee salary payments

**Example**:
```sql
INSERT INTO journal_entries (description, entry_date, source_document_type) 
VALUES ('Office Rent Payment - January 2024', '2024-01-01', 'EXPENSE');

INSERT INTO journal_entry_lines (account_code, description, debit_amount, credit_amount)
VALUES 
  ('5200', 'Office rent for January 2024', 25000, 0),
  ('1002', 'Bank transfer for rent payment', 0, 25000);
```

**Result**:
- Increases Rent Expense (expense increases)
- Reduces Bank Account (asset decreases)
- Net effect: Company records operating cost

## Advanced Scenarios

### 4. Vendor Bill Creation (Without Payment)

**Purpose**: Record liability when goods/services are received but not yet paid

**Transaction Flow**:
```
Dr. Expense/Inventory Account    ₹X,XXX
    Cr. Accounts Payable (2001)     ₹X,XXX
```

**Example**:
```sql
-- When receiving inventory from supplier
INSERT INTO journal_entry_lines (account_code, description, debit_amount, credit_amount)
VALUES 
  ('1300', 'Inventory received from ABC Supplier', 100000, 0),
  ('2001', 'Outstanding bill to ABC Supplier', 0, 100000);
```

### 5. Sales Invoice Creation (Without Payment)

**Purpose**: Record revenue when goods are sold but payment not yet received

**Transaction Flow**:
```
Dr. Accounts Receivable (1200)   ₹X,XXX
    Cr. Sales Revenue (4001)        ₹X,XXX
```

**Example**:
```sql
-- When selling goods on credit
INSERT INTO journal_entry_lines (account_code, description, debit_amount, credit_amount)
VALUES 
  ('1200', 'Invoice INV-001 to XYZ Corp', 85000, 0),
  ('4001', 'Sales revenue from XYZ Corp', 0, 85000);
```

## Quick Reference Table

| Transaction Type | Debit Account | Credit Account | Effect |
|-----------------|---------------|----------------|---------|
| Pay Vendor | Accounts Payable (2001) | Bank (1002) | Reduces what we owe |
| Receive Customer Payment | Bank (1002) | Accounts Receivable (1200) | Converts receivable to cash |
| Record Expense | Expense Account (5XXX) | Bank (1002) | Records business cost |
| Create Vendor Bill | Inventory/Expense | Accounts Payable (2001) | Creates liability |
| Create Sales Invoice | Accounts Receivable (1200) | Sales Revenue (4001) | Creates receivable |

## Account Balance Impact

### Normal Balances:
- **Assets** (Debit normal): Increase with debits, decrease with credits
- **Liabilities** (Credit normal): Increase with credits, decrease with debits
- **Expenses** (Debit normal): Increase with debits, decrease with credits
- **Revenue** (Credit normal): Increase with credits, decrease with debits

### Balance Sheet Equation:
```
Assets = Liabilities + Equity
```

Every journal entry must maintain this equation balance.

## Implementation in System

The enhanced transaction system provides:

1. **Quick Entry Templates**: Pre-configured journal entries for common transactions
2. **Automatic Account Mapping**: System suggests appropriate accounts based on transaction type
3. **Validation**: Ensures debits equal credits before posting
4. **Real-time Updates**: Immediately updates account balances and financial reports

## Best Practices

1. **Always include clear descriptions** that identify the supplier/customer and purpose
2. **Use reference numbers** for tracking (invoice numbers, payment references)
3. **Record transactions on the actual date** they occur
4. **Review balances** regularly to ensure accuracy
5. **Reconcile bank accounts** monthly to verify entries

## Troubleshooting

### Common Issues:

1. **Unbalanced Entries**: Ensure total debits = total credits
2. **Wrong Account Types**: Verify normal balance directions
3. **Missing References**: Always include transaction references for audit trail
4. **Date Errors**: Use actual transaction dates, not posting dates

### Verification Steps:

1. Check that Balance Sheet balances (Assets = Liabilities + Equity)
2. Verify Accounts Payable matches vendor statements
3. Confirm Accounts Receivable matches customer records
4. Reconcile bank accounts with statements
