# Accounting System Visual Workflow

## 🏪 Your Furniture Business → Accounting Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                    FURNITURE BUSINESS OPERATIONS                │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ERP SYSTEM CAPTURES                       │
│  • Customer purchases furniture                                │
│  • Inventory receives new stock                                │
│  • Business pays expenses                                       │
│  • Business receives payments                                   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AUTOMATIC JOURNAL ENTRIES                    │
│                                                                 │
│  Sale of Sofa (AED 3,000):                                    │
│  Dr. Cash              3,000                                   │
│      Cr. Sales Revenue      3,000                             │
│  Dr. Cost of Goods     1,800                                   │
│      Cr. Inventory          1,800                             │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CHART OF ACCOUNTS UPDATE                    │
│                                                                 │
│  Cash Account:         +3,000                                  │
│  Inventory Account:    -1,800                                  │
│  Sales Revenue:        +3,000                                  │
│  Cost of Goods Sold:   +1,800                                  │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FINANCIAL REPORTS                         │
│                                                                 │
│  Balance Sheet:                                                 │
│  ├─ Assets: Cash + Inventory + Equipment                       │
│  ├─ Liabilities: Loans + Accounts Payable                      │
│  └─ Equity: Owner's Capital + Retained Earnings                │
│                                                                 │
│  Income Statement:                                              │
│  ├─ Revenue: Sales                                              │
│  ├─ Expenses: Cost of Goods + Operating Expenses               │
│  └─ Net Income: Revenue - Expenses                             │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Real-World Example: Al Rams Furniture

### Starting Position (Opening Balances):
```
ASSETS:
├─ Cash in Hand:           ₹10,000
├─ Bank Account:           ₹90,000
├─ Inventory - Furniture:  ₹200,000
├─ Showroom Equipment:     ₹50,000
└─ Total Assets:           ₹350,000

LIABILITIES:
├─ Bank Loan:              ₹100,000
├─ Supplier Payables:      ₹50,000
└─ Total Liabilities:      ₹150,000

EQUITY:
└─ Owner's Capital:        ₹200,000
```

### Daily Transaction Example:

**Day 1: Customer buys dining set for ₹5,000 (cash)**
```
Before Transaction:        After Transaction:
Cash: ₹10,000    →     Cash: ₹15,000
Inventory: ₹200,000 →  Inventory: ₹197,000 (set cost ₹3,000)
Sales Revenue: ₹0 →    Sales Revenue: ₹5,000
Cost of Goods: ₹0 →    Cost of Goods: ₹3,000
```

**Day 2: Pay showroom rent ₹3,000**
```
Before Transaction:        After Transaction:
Cash: ₹15,000    →     Cash: ₹12,000
Rent Expense: ₹0 →     Rent Expense: ₹3,000
```

**Day 3: Receive new stock worth ₹10,000 (on credit)**
```
Before Transaction:        After Transaction:
Inventory: ₹197,000 →  Inventory: ₹207,000
Accounts Payable: ₹50,000 → Accounts Payable: ₹60,000
```

### Month-End Financial Position:
```
BALANCE SHEET (as of Month End):
ASSETS:
├─ Cash:                   AED 12,000
├─ Bank Account:           AED 90,000
├─ Inventory:              AED 207,000
├─ Equipment:              AED 50,000
└─ TOTAL ASSETS:           AED 359,000

LIABILITIES:
├─ Bank Loan:              AED 100,000
├─ Accounts Payable:       AED 60,000
└─ TOTAL LIABILITIES:      AED 160,000

EQUITY:
├─ Owner's Capital:        AED 200,000
├─ Retained Earnings:      AED -1,000 (Loss: 3,000 rent - 2,000 profit)
└─ TOTAL EQUITY:           AED 199,000

✓ BALANCE CHECK: 359,000 = 160,000 + 199,000 ✓

INCOME STATEMENT (for the Month):
REVENUE:
└─ Furniture Sales:        AED 5,000

EXPENSES:
├─ Cost of Goods Sold:     AED 3,000
├─ Rent Expense:           AED 3,000
└─ TOTAL EXPENSES:         AED 6,000

NET LOSS:                  AED -1,000
```

## 🔄 Integration Points in Your ERP

### 1. **Sales Module → Accounting**
```
Customer Orders → Sales Invoice → Automatic Journal Entry:
Dr. Cash/Accounts Receivable
    Cr. Sales Revenue
Dr. Cost of Goods Sold
    Cr. Inventory
```

### 2. **Inventory Module → Accounting**
```
Stock Received → Purchase Entry → Automatic Journal Entry:
Dr. Inventory
    Cr. Cash/Accounts Payable

Stock Adjustment → Inventory Count → Automatic Journal Entry:
Dr. Inventory Variance (if shortage)
    Cr. Inventory
```

### 3. **Purchase Module → Accounting**
```
Supplier Invoice → Purchase Entry → Automatic Journal Entry:
Dr. Inventory/Expense
    Cr. Accounts Payable

Payment to Supplier → Payment Entry → Automatic Journal Entry:
Dr. Accounts Payable
    Cr. Cash/Bank
```

### 4. **HR/Payroll Module → Accounting**
```
Monthly Salary → Payroll Entry → Automatic Journal Entry:
Dr. Salary Expense
    Cr. Cash/Bank
```

## 🎯 Key Performance Indicators (KPIs)

### Daily Monitoring:
- **Cash Position**: Always positive
- **Sales vs Cost**: Gross profit margin > 40%
- **Inventory Turnover**: Stock moving regularly

### Weekly Monitoring:
- **Accounts Receivable**: Customers paying within 30 days
- **Accounts Payable**: Not exceeding credit terms
- **Expense Control**: Operating expenses under budget

### Monthly Monitoring:
- **Profitability**: Net income positive
- **Liquidity**: Enough cash for operations
- **Debt Ratios**: Manageable debt levels

## 🚨 Warning Signs

### 🔴 Critical Issues:
- Trial balance doesn't balance
- Negative cash flow for consecutive months
- High accounts receivable aging
- Inventory not moving (dead stock)

### 🟡 Watch Carefully:
- Decreasing gross profit margins
- Increasing expense ratios
- High debt-to-equity ratios
- Frequent inventory adjustments

## 💡 Best Practices for Al Rams Furniture

### Daily:
1. Record all sales in the system immediately
2. Enter all expenses and payments
3. Check cash position
4. Monitor inventory levels

### Weekly:
1. Reconcile bank statements
2. Review accounts receivable aging
3. Check supplier payment schedules
4. Review weekly profit/loss

### Monthly:
1. Generate and review balance sheet
2. Analyze income statement trends
3. Calculate key financial ratios
4. Plan for next month's operations
5. Meet with accountant if needed

### Quarterly:
1. Tax preparation and filing
2. Financial performance review
3. Budget vs actual analysis
4. Strategic planning session

---

**Remember:** The system is designed to make accounting automatic and easy. Focus on running your furniture business - the accounting happens behind the scenes!
