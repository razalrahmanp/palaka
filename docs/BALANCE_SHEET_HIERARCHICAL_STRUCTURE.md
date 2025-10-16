# Balance Sheet Report - Hierarchical Structure Implementation

## Date: October 16, 2025

## Overview
Implemented a professional Balance Sheet report with hierarchical categorization of Assets, Liabilities, and Equity, matching standard accounting practices. The report includes expand/collapse functionality for better usability.

## Structure Based on Accounting Standards

### Assets Classification
```
ASSETS
├─ Current Assets
│  ├─ Cash and Cash Equivalents
│  ├─ Accounts Receivable
│  ├─ Inventory
│  └─ Prepaid Expenses
├─ Property, Plant & Equipment (Fixed Assets)
│  ├─ Land
│  ├─ Buildings
│  ├─ Leasehold Improvements
│  ├─ Furniture & Fixtures
│  └─ Delivery Vehicles
├─ Intangible Assets
│  ├─ Patents
│  ├─ Trademarks
│  └─ Goodwill
└─ Other Assets
```

### Liabilities Classification
```
LIABILITIES
├─ Current Liabilities
│  ├─ Accounts Payable
│  ├─ Short-Term Debt
│  ├─ Accrued Expenses
│  └─ Customer Deposits / Unearned Revenue
├─ Long-Term Liabilities
│  ├─ Long-Term Debt
│  ├─ Mortgages Payable
│  └─ Bonds Payable
└─ Other Liabilities
   └─ Deferred Tax Liabilities
```

### Equity Classification
```
EQUITY
├─ Owner's Equity
│  └─ Common Stock
├─ Retained Earnings
│  └─ Accumulated Profits/Losses
└─ Capital
   └─ Paid-in Capital
```

## Database Schema Integration

### Account Subtypes from Database
The implementation uses the `account_subtype` enum from the database:

**Asset Subtypes:**
- `CURRENT_ASSET` - Cash, receivables, inventory, prepaid expenses
- `FIXED_ASSET` - Property, plant, equipment (PP&E)
- `INTANGIBLE_ASSET` - Patents, trademarks, goodwill
- `OTHER_ASSET` - Other long-term assets

**Liability Subtypes:**
- `CURRENT_LIABILITY` - Short-term obligations (due within 1 year)
- `LONG_TERM_LIABILITY` - Long-term debt, mortgages
- `OTHER_LIABILITY` - Deferred taxes, other obligations

**Equity Subtypes:**
- `OWNERS_EQUITY` - Common stock, paid-in capital
- `RETAINED_EARNINGS` - Accumulated profits
- `CAPITAL` - Additional capital contributions

## API Implementation

### Backend Route: `generateBalanceSheetManual()`

#### Data Fetching
```typescript
const { data, error } = await supabase
  .from('chart_of_accounts')
  .select(`
    id,
    account_code,
    account_name,
    account_type,
    account_subtype,
    normal_balance,
    current_balance,
    opening_balances(debit_amount, credit_amount),
    general_ledger(debit_amount, credit_amount, transaction_date)
  `)
  .in('account_type', ['ASSET', 'LIABILITY', 'EQUITY'])
  .order('account_code');
```

#### Balance Calculation
```typescript
// Calculate opening balance
const openingBalance = account.opening_balances?.[0] 
  ? (account.opening_balances[0].debit_amount || 0) - (account.opening_balances[0].credit_amount || 0)
  : 0;

// Calculate transaction balance up to as_of_date
const glTransactions = account.general_ledger?.filter(
  (gl: any) => new Date(gl.transaction_date) <= new Date(asOfDate)
) || [];

const transactionBalance = glTransactions.reduce((sum: number, gl: any) => {
  if (account.normal_balance === 'DEBIT') {
    return sum + (gl.debit_amount - gl.credit_amount);
  } else {
    return sum + (gl.credit_amount - gl.debit_amount);
  }
}, 0);

const balance = openingBalance + transactionBalance;
```

#### Hierarchical Grouping
```typescript
// Group accounts by type and subtype
const accountsByTypeAndSubtype: Record<string, Record<string, any[]>> = {};

data?.forEach((account: any) => {
  const accountType = account.account_type;
  const accountSubtype = account.account_subtype || 'OTHER';
  
  if (!accountsByTypeAndSubtype[accountType]) {
    accountsByTypeAndSubtype[accountType] = {};
  }
  
  if (!accountsByTypeAndSubtype[accountType][accountSubtype]) {
    accountsByTypeAndSubtype[accountType][accountSubtype] = [];
  }
  
  accountsByTypeAndSubtype[accountType][accountSubtype].push({
    account_code: account.account_code,
    account_name: account.account_name,
    amount: balance,
    subtype: accountSubtype
  });
});
```

#### Building Hierarchical Sections
```typescript
const buildHierarchicalSection = (accountType: string, subtypeLabels: Record<string, string>) => {
  const result: any[] = [];
  const typeData = accountsByTypeAndSubtype[accountType] || {};
  
  Object.entries(subtypeLabels).forEach(([subtypeKey, subtypeLabel]) => {
    const accounts = typeData[subtypeKey] || [];
    
    if (accounts.length > 0) {
      // Calculate subtotal
      const subtotal = accounts.reduce((sum, acc) => sum + acc.amount, 0);
      
      // Add subtype header
      result.push({
        account_code: subtypeKey.substring(0, 4).toUpperCase(),
        account_name: subtypeLabel,
        amount: subtotal,
        is_subtype_header: true,
        account_count: accounts.length
      });
      
      // Add individual accounts
      accounts.forEach(account => {
        result.push({
          account_code: account.account_code,
          account_name: `  ${account.account_name}`,
          amount: account.amount,
          subtype: account.subtype,
          is_account_item: true
        });
      });
    }
  });
  
  return result;
};
```

### API Response Structure
```json
{
  "report_type": "Balance Sheet",
  "as_of_date": "2025-10-16",
  "sections": {
    "ASSETS": [
      {
        "account_code": "CURR",
        "account_name": "Current Assets",
        "amount": 810000,
        "is_subtype_header": true,
        "account_count": 4
      },
      {
        "account_code": "1001",
        "account_name": "  Cash and Cash Equivalents",
        "amount": 150000,
        "subtype": "CURRENT_ASSET",
        "is_account_item": true
      },
      {
        "account_code": "1100",
        "account_name": "  Accounts Receivable",
        "amount": 45000,
        "subtype": "CURRENT_ASSET",
        "is_account_item": true
      },
      {
        "account_code": "FIXE",
        "account_name": "Property, Plant & Equipment",
        "amount": 780000,
        "is_subtype_header": true,
        "account_count": 5
      },
      {
        "account_code": "1500",
        "account_name": "  Land",
        "amount": 200000,
        "subtype": "FIXED_ASSET",
        "is_account_item": true
      }
    ],
    "LIABILITIES": [
      {
        "account_code": "CURR",
        "account_name": "Current Liabilities",
        "amount": 450000,
        "is_subtype_header": true,
        "account_count": 4
      },
      {
        "account_code": "2000",
        "account_name": "  Accounts Payable",
        "amount": 300000,
        "subtype": "CURRENT_LIABILITY",
        "is_account_item": true
      }
    ],
    "EQUITY": [
      {
        "account_code": "OWNE",
        "account_name": "Owner's Equity",
        "amount": 740000,
        "is_subtype_header": true,
        "account_count": 2
      },
      {
        "account_code": "3000",
        "account_name": "  Common Stock",
        "amount": 500000,
        "subtype": "OWNERS_EQUITY",
        "is_account_item": true
      },
      {
        "account_code": "3100",
        "account_name": "  Retained Earnings",
        "amount": 240000,
        "subtype": "RETAINED_EARNINGS",
        "is_account_item": true
      }
    ]
  },
  "summary": {
    "total_assets": 1590000,
    "total_liabilities": 850000,
    "total_equity": 740000,
    "balance_check": 0
  }
}
```

## Frontend Implementation

### Expand/Collapse Functionality

#### State Management
```typescript
const [expandedSubtypes, setExpandedSubtypes] = useState<Set<string>>(new Set());

const toggleSubtype = (subtypeCode: string) => {
  const newExpanded = new Set(expandedSubtypes);
  if (newExpanded.has(subtypeCode)) {
    newExpanded.delete(subtypeCode);
  } else {
    newExpanded.add(subtypeCode);
  }
  setExpandedSubtypes(newExpanded);
};
```

#### Rendering with Collapse Logic
```typescript
{reportData.sections.ASSETS.map((item, idx) => {
  const isSubtypeHeader = item.is_subtype_header;
  const isAccountItem = item.is_account_item;
  
  // Hide account items if subtype is not expanded
  if (isAccountItem && reportData.sections?.ASSETS) {
    const parentIdx = reportData.sections.ASSETS.slice(0, idx).reverse().findIndex(i => i.is_subtype_header);
    if (parentIdx !== -1) {
      const parentItem = reportData.sections.ASSETS[idx - parentIdx - 1];
      if (!expandedSubtypes.has(parentItem.account_code)) {
        return null;
      }
    }
  }
  
  return (
    <TableRow 
      className={
        isSubtypeHeader ? 'bg-green-100 font-bold cursor-pointer hover:bg-green-200' :
        isAccountItem ? 'hover:bg-gray-50' : ''
      }
      onClick={() => {
        if (isSubtypeHeader) {
          toggleSubtype(item.account_code);
        }
      }}
    >
      {/* Cell content with chevron icons */}
    </TableRow>
  );
})}
```

### Visual Hierarchy

**Collapsed View (Default):**
```
ASSETS
▶ Current Assets (₹8,10,000)
▶ Property, Plant & Equipment (₹7,80,000)
Total Assets: ₹15,90,000

LIABILITIES
▶ Current Liabilities (₹4,50,000)
▶ Long-Term Liabilities (₹4,00,000)
Total Liabilities: ₹8,50,000

EQUITY
▶ Owner's Equity (₹7,40,000)
Total Equity: ₹7,40,000
```

**Expanded View:**
```
ASSETS
▼ Current Assets (₹8,10,000)
  → Cash and Cash Equivalents (₹1,50,000)
  → Accounts Receivable (₹45,000)
  → Inventory (₹6,00,000)
  → Prepaid Expenses (₹15,000)
▼ Property, Plant & Equipment (₹7,80,000)
  → Land (₹2,00,000)
  → Buildings (₹5,00,000)
  → Leasehold Improvements (₹1,00,000)
  → Furniture & Fixtures (₹50,000)
  → Delivery Vehicles (₹80,000)
Total Assets: ₹15,90,000
```

## Key Features

### 1. Professional Categorization
- Follows standard accounting principles
- Clear separation of Current vs Non-Current assets
- Proper liability classification
- Complete equity breakdown

### 2. Expand/Collapse Interactivity
- Default: All collapsed (summary view)
- Click subtype header: Shows individual accounts
- Click again: Collapses back
- Chevron icons indicate state

### 3. Visual Design
- **Green** for Assets (positive value)
- **Red** for Liabilities (obligations)
- **Blue** for Equity (owner's interest)
- Color intensity: Darker headers, lighter items
- Hover effects on clickable headers

### 4. Balance Verification
- Shows balance check: Assets = Liabilities + Equity
- Visual indicator (✓ BALANCED or ✗ OUT OF BALANCE)
- Red/Green color coding for balance status

## Financial Ratios Support

The Balance Sheet data structure supports calculation of key financial ratios:

### Liquidity Ratios
```typescript
// Current Ratio = Current Assets / Current Liabilities
const currentAssets = assetsData.filter(item => item.subtype === 'CURRENT_ASSET')
  .reduce((sum, item) => sum + item.amount, 0);
const currentLiabilities = liabilitiesData.filter(item => item.subtype === 'CURRENT_LIABILITY')
  .reduce((sum, item) => sum + item.amount, 0);
const currentRatio = currentAssets / currentLiabilities;
// Example: 810,000 / 450,000 = 1.8

// Quick Ratio = (Current Assets - Inventory) / Current Liabilities
const inventory = assetsData.find(item => item.account_name.includes('Inventory'))?.amount || 0;
const quickRatio = (currentAssets - inventory) / currentLiabilities;
// Example: (810,000 - 600,000) / 450,000 = 0.47
```

### Leverage Ratios
```typescript
// Debt-to-Equity Ratio = Total Liabilities / Total Equity
const debtToEquityRatio = totalLiabilities / totalEquity;
// Example: 850,000 / 740,000 = 1.15
```

## Testing Checklist

- [x] Assets grouped by subtype (Current, Fixed, Intangible, Other)
- [x] Liabilities grouped by subtype (Current, Long-Term, Other)
- [x] Equity grouped by subtype (Owner's Equity, Retained Earnings, Capital)
- [x] Balance calculation includes opening balances and GL transactions
- [x] As of date filtering works correctly
- [x] Expand/collapse functionality works
- [x] Chevron icons update correctly
- [x] Hover effects work on headers
- [x] Balance check verification displays correctly
- [x] Totals calculate accurately
- [x] No TypeScript errors
- [x] Visual hierarchy clear and professional

## Files Modified

1. **API Route:** `src/app/api/finance/reports/[reportType]/route.ts`
   - Enhanced `generateBalanceSheetManual()` function
   - Added hierarchical grouping by account_subtype
   - Added subtype header and account item flags
   - Proper balance calculation with opening balances

2. **Frontend Component:** `src/components/finance/reports/BalanceSheetReport.tsx`
   - Added expand/collapse state management
   - Updated TypeScript interfaces
   - Enhanced table rendering with conditional display
   - Added chevron icons for visual indicators
   - Applied color-coded backgrounds

## Benefits

1. **Professional Format**: Matches standard accounting reports
2. **Better Organization**: Clear categorization of accounts
3. **User Control**: Expand only relevant sections
4. **Clean Interface**: Collapsed view reduces clutter
5. **Standard Compliance**: Follows GAAP/IFRS structure
6. **Furniture Business Ready**: Designed for retail/manufacturing businesses

## Future Enhancements

1. Add comparative balance sheets (year-over-year)
2. Include percentage of total analysis
3. Add accumulated depreciation details
4. Show current vs non-current breakdown in summary
5. Add working capital calculation
6. Include financial ratio calculations in UI
7. Export with hierarchical structure maintained
8. Add notes/annotations to accounts

## Related Documentation

- See: `PL_EXPAND_COLLAPSE_FEATURE.md` for P&L expand/collapse implementation
- Database Schema: `database/schema.sql` (chart_of_accounts table)
- Enum Values: `database/enum.sql` (account_type, account_subtype)
