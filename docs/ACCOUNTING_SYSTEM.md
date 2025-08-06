# Furniture ERP - Complete Accounting System

## Overview

This comprehensive accounting system transforms the basic financial tracking into a full-featured, QuickBooks-like accounting solution for the Furniture ERP. It implements double-entry bookkeeping, general ledger, financial statements, and all essential accounting features required for professional business management.

## ✨ Key Features

### 📊 Core Accounting Features
- **Double-Entry Bookkeeping**: All transactions automatically balanced
- **Chart of Accounts**: Comprehensive account structure with 200+ default accounts
- **General Ledger**: Complete transaction history with running balances
- **Journal Entries**: Create, edit, post, and manage journal entries
- **Financial Statements**: Balance Sheet, Income Statement, Trial Balance
- **Daysheet**: Daily transaction summary and balance verification

### 🏗️ System Architecture
- **Database Schema**: 12 core accounting tables with relationships
- **API Layer**: RESTful APIs for all accounting operations
- **User Interface**: React components for accounting dashboard and forms
- **Automation**: Triggers for balance updates and audit trails
- **Security**: Audit trails and transaction locking mechanisms

### 📈 Financial Reports
1. **Trial Balance**: Verify books are balanced
2. **Balance Sheet**: Assets, Liabilities, and Equity
3. **Income Statement**: Revenue, Expenses, and Net Income
4. **Daysheet**: Daily transaction summary
5. **AR Aging**: Customer payment analysis
6. **AP Aging**: Supplier payment analysis

## 🗄️ Database Structure

### Core Tables
```sql
chart_of_accounts       -- Account definitions and hierarchy
journal_entries         -- Journal entry headers
journal_entry_lines     -- Individual transaction lines
general_ledger          -- Posted transactions with running balances
accounting_periods      -- Fiscal periods management
tax_codes              -- Tax configuration
```

### Views & Reports
```sql
trial_balance          -- Real-time trial balance
balance_sheet          -- Balance sheet data
income_statement       -- P&L statement data
ar_aging              -- Customer aging analysis
ap_aging              -- Supplier aging analysis
```

### Automation Features
```sql
update_account_balance()     -- Auto-update account balances
post_to_general_ledger()     -- Auto-post journal entries
validate_journal_balance()   -- Ensure balanced entries
create_audit_trail()         -- Track all changes
```

## 🚀 Getting Started

### 1. Database Setup
```bash
# Apply the accounting schema
psql -d your_database -f database/accounting_schema.sql

# Load default chart of accounts
psql -d your_database -f database/default_chart_of_accounts.sql
```

### 2. Environment Setup
Ensure your `.env.local` contains:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. API Testing
Open browser console and run:
```javascript
// Load the test script
fetch('/scripts/test-accounting-apis.js')
  .then(response => response.text())
  .then(script => eval(script))
```

## 📱 Usage Guide

### Creating Journal Entries

#### Manual Journal Entry
```javascript
const journalEntry = {
  entry_date: "2024-01-15",
  description: "Office supplies purchase",
  reference: "INV-001",
  lines: [
    {
      account_id: "office_supplies_account_id",
      debit_amount: 500.00,
      description: "Office supplies"
    },
    {
      account_id: "cash_account_id", 
      credit_amount: 500.00,
      description: "Cash payment"
    }
  ]
}

// POST to /api/accounting/journal-entries
```

#### Automated Entries
The system automatically creates journal entries for:
- Sales invoices
- Customer payments
- Purchase orders
- Vendor payments
- Payroll processing

### Accessing Reports

#### Trial Balance
```
GET /api/accounting/reports/trial-balance?asOfDate=2024-01-31
```

#### Balance Sheet
```
GET /api/accounting/reports/balance-sheet?asOfDate=2024-01-31
```

#### Income Statement
```
GET /api/accounting/reports/income-statement?startDate=2024-01-01&endDate=2024-01-31
```

## 🏢 Default Chart of Accounts

### Assets (1000-1999)
- **1000-1199**: Current Assets (Cash, Bank, AR, Inventory)
- **1500-1699**: Fixed Assets (Land, Buildings, Equipment)
- **1700-1799**: Intangible Assets (Goodwill, Patents)

### Liabilities (2000-2999)
- **2000-2199**: Current Liabilities (AP, Accrued Expenses)
- **2500-2699**: Long-term Liabilities (Loans, Mortgages)

### Equity (3000-3999)
- **3000-3199**: Owner's Equity
- **3100-3199**: Retained Earnings

### Revenue (4000-4999)
- **4000-4199**: Operating Revenue (Sales, Services)
- **4200-4299**: Other Revenue (Interest, Gains)

### Expenses (5000-7999)
- **5000-5999**: Cost of Goods Sold
- **6000-6999**: Operating Expenses
- **7000-7999**: Other Expenses

## 🔧 API Endpoints

### Chart of Accounts
```
GET    /api/accounting/chart-of-accounts
POST   /api/accounting/chart-of-accounts
GET    /api/accounting/chart-of-accounts/[id]
PUT    /api/accounting/chart-of-accounts/[id]
DELETE /api/accounting/chart-of-accounts/[id]
```

### Journal Entries
```
GET    /api/accounting/journal-entries
POST   /api/accounting/journal-entries
GET    /api/accounting/journal-entries/[id]
PUT    /api/accounting/journal-entries/[id]
DELETE /api/accounting/journal-entries/[id]
POST   /api/accounting/journal-entries/[id]/post
```

### Reports
```
GET /api/accounting/general-ledger
GET /api/accounting/reports/trial-balance
GET /api/accounting/reports/balance-sheet
GET /api/accounting/reports/income-statement
GET /api/accounting/reports/daysheet
GET /api/accounting/reports/ar-aging
GET /api/accounting/reports/ap-aging
```

## 💰 Business Benefits

### For Accountants
- **Professional Standards**: Follows GAAP principles
- **Audit Ready**: Complete audit trails and documentation
- **Regulatory Compliance**: Proper financial statements and reports
- **Efficiency**: Automated posting and balance calculations

### For Business Owners
- **Real-time Visibility**: Live financial data and reports
- **Better Decisions**: Accurate P&L and cash flow analysis
- **Growth Planning**: Historical trends and forecasting
- **Cost Control**: Detailed expense tracking and analysis

### For Management
- **Department Analysis**: Cost center and profit center reporting
- **Budget vs Actual**: Performance tracking and variance analysis
- **KPI Monitoring**: Financial ratios and key metrics
- **Cash Management**: AR/AP aging and cash flow forecasting

## 🔐 Security & Compliance

### Audit Trail
- All transactions logged with user, timestamp, and changes
- Immutable posted entries
- Complete change history

### Data Integrity
- Double-entry validation
- Account balance reconciliation
- Period-end closing controls

### Access Controls
- Role-based permissions
- Transaction approval workflows
- Sensitive data protection

## 📊 Reporting Features

### Standard Reports
1. **Trial Balance**: Account balances verification
2. **Balance Sheet**: Financial position statement
3. **Income Statement**: Profitability analysis
4. **Cash Flow Statement**: Cash movement tracking
5. **General Ledger**: Detailed transaction history

### Management Reports
1. **Departmental P&L**: Department profitability
2. **Product Profitability**: Product line analysis
3. **Customer Profitability**: Customer value analysis
4. **Expense Analysis**: Cost breakdown and trends
5. **Budget vs Actual**: Performance variance analysis

### Aging Reports
1. **AR Aging**: Customer payment analysis
2. **AP Aging**: Supplier payment scheduling
3. **Inventory Aging**: Stock movement analysis

## 🚀 Future Enhancements

### Phase 2 Features
- [ ] Multi-currency support
- [ ] Advanced budgeting and forecasting
- [ ] Project/job costing
- [ ] Fixed asset depreciation scheduling
- [ ] Bank reconciliation automation

### Phase 3 Features
- [ ] Consolidated reporting (multi-entity)
- [ ] Advanced analytics and dashboards
- [ ] API integrations (banks, payment processors)
- [ ] Mobile accounting app
- [ ] AI-powered expense categorization

## 🤝 Integration Points

### Existing ERP Modules
- **Sales**: Automatic revenue recognition
- **Inventory**: COGS and inventory valuation
- **HR**: Payroll expense allocation
- **Procurement**: Purchase expense recording
- **Manufacturing**: Work-in-progress tracking

### External Systems
- **Banking**: Transaction import and reconciliation
- **Payment Processors**: Automatic payment recording
- **Tax Software**: Tax return preparation data
- **Business Intelligence**: Financial data export

## 📞 Support

For technical support or questions about the accounting system:
1. Check the API documentation
2. Review the test scripts for examples
3. Examine the database schema for data relationships
4. Use the accounting dashboard for real-time monitoring

---

*This accounting system provides enterprise-level financial management capabilities while maintaining the simplicity and efficiency of the existing Furniture ERP platform.*
