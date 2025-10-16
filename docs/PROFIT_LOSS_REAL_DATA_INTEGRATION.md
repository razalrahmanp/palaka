# Profit & Loss Real Data Integration

## Overview
Updated the Profit & Loss (P&L) report to fetch real data directly from `sales_orders` and `expenses` tables instead of using the chart of accounts and general ledger.

## Changes Made

### API Endpoint Updated
**File:** `src/app/api/finance/reports/[reportType]/route.ts`

### Revenue Calculation
- **Source Table:** `sales_orders`
- **Column Used:** `final_price`
- **Date Filter:** Uses `created_at` column (between start_date and end_date)
- **Status Filter:** Only includes completed orders: `['completed', 'delivered', 'invoiced']`
- **Formula:** `Total Revenue = SUM(sales_orders.final_price)`

```typescript
const { data: salesData } = await supabase
  .from('sales_orders')
  .select('id, final_price, grand_total, created_at, customer_id, customers(name)')
  .gte('created_at', startDate)
  .lte('created_at', endDate)
  .in('status', ['completed', 'delivered', 'invoiced']);

const totalRevenue = salesData?.reduce((sum, sale) => 
  sum + parseFloat(sale.final_price || '0'), 0
) || 0;
```

### Expense Categorization
- **Source Table:** `expenses`
- **Date Filter:** Uses `date` column (between start_date and end_date)
- **All Categories Included:** Every expense category from the expenses table is fetched
- **Grouping Structure:** Expenses are grouped by **Category** → **Subcategory** → **Individual Items**

#### Hierarchical Structure
```
Category (e.g., "Salaries & Benefits")
  ├── Subcategory (e.g., "Management")
  │     └── Individual expense items with amounts
  ├── Subcategory (e.g., "Operations")
  │     └── Individual expense items with amounts
  └── Subcategory (e.g., "General")
        └── Individual expense items with amounts
```

#### COGS Categories (Cost of Goods Sold)
Expenses with these categories are classified as COGS:
- Raw Materials
- Direct Labor
- Manufacturing Overhead
- Manufacturing
- Production

#### Operating Expense Categories
All other expense categories are classified as Operating Expenses:
- Administrative
- Salaries & Benefits
- Marketing & Sales
- Logistics & Distribution
- Technology
- Insurance
- Maintenance & Repairs
- Travel & Entertainment
- Research & Development
- Vehicle Fleet
- Accounts Payable
- Prepaid Expenses
- Rent
- Utilities
- Customer Refunds
- Miscellaneous
- Other

```typescript
const { data: expensesData } = await supabase
  .from('expenses')
  .select('id, date, category, description, amount, type, subcategory')
  .gte('date', startDate)
  .lte('date', endDate);

// Group by category and subcategory
const expensesByCategory: Record<string, Record<string, any[]>> = {};

expensesData?.forEach((expense: any) => {
  const category = expense.category || 'Other';
  const subcategory = expense.subcategory || 'General';
  
  if (!expensesByCategory[category]) {
    expensesByCategory[category] = {};
  }
  if (!expensesByCategory[category][subcategory]) {
    expensesByCategory[category][subcategory] = [];
  }
  
  expensesByCategory[category][subcategory].push({
    account_code: `${category.substring(0, 4).toUpperCase()}-${subcategory.substring(0, 3).toUpperCase()}`,
    account_name: subcategory,
    category: category,
    amount: parseFloat(expense.amount || '0'),
    description: expense.description,
    type: expense.type,
    date: expense.date
  });
});

// Categorize as COGS or Operating Expense
const cogsCategories = ['Raw Materials', 'Direct Labor', 'Manufacturing Overhead', 'Manufacturing', 'Production'];
if (cogsCategories.includes(category)) {
  totalCOGS += amount;
} else {
  totalOperatingExpenses += amount;
}
```

## P&L Calculation Formula

```
Gross Profit = Total Revenue - Total COGS
Net Income = Gross Profit - Total Operating Expenses

Where:
- Total Revenue = SUM(sales_orders.final_price) [completed orders only]
- Total COGS = SUM(expenses.amount) [COGS categories only]
- Total Operating Expenses = SUM(expenses.amount) [Operating categories only]
```

## API Response Structure

```json
{
  "report_type": "Profit & Loss Statement",
  "period": {
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  },
  "sections": {
    "REVENUE": [
      {
        "account_code": "REV001",
        "account_name": "Sales Revenue",
        "amount": 1500000,
        "count": 245
      }
    ],
    "COST_OF_GOODS_SOLD": [
      {
        "account_code": "RAWM",
        "account_name": "Raw Materials",
        "amount": 450000,
        "is_category_header": true
      },
      {
        "account_code": "RAWM-STE",
        "account_name": "  Steel Products",
        "amount": 250000,
        "is_subcategory_header": true,
        "items": [
          {
            "account_code": "RAWM-STE",
            "account_name": "Steel Products",
            "category": "Raw Materials",
            "amount": 250000,
            "description": "Steel purchase",
            "type": "Direct",
            "date": "2024-06-15"
          }
        ]
      },
      {
        "account_code": "RAWM-WOO",
        "account_name": "  Wood Materials",
        "amount": 200000,
        "is_subcategory_header": true,
        "items": [...]
      }
    ],
    "EXPENSES": [
      {
        "account_code": "SALA",
        "account_name": "Salaries & Benefits",
        "amount": 320000,
        "is_category_header": true
      },
      {
        "account_code": "SALA-MAN",
        "account_name": "  Management",
        "amount": 150000,
        "is_subcategory_header": true,
        "items": [
          {
            "account_code": "SALA-MAN",
            "account_name": "Management",
            "category": "Salaries & Benefits",
            "amount": 75000,
            "description": "CEO Salary",
            "type": "Fixed",
            "date": "2024-06-30"
          },
          {
            "account_code": "SALA-MAN",
            "account_name": "Management",
            "category": "Salaries & Benefits",
            "amount": 75000,
            "description": "CFO Salary",
            "type": "Fixed",
            "date": "2024-06-30"
          }
        ]
      },
      {
        "account_code": "SALA-OPS",
        "account_name": "  Operations",
        "amount": 170000,
        "is_subcategory_header": true,
        "items": [...]
      }
    ]
  },
  "summary": {
    "total_revenue": 1500000,
    "total_cogs": 450000,
    "gross_profit": 1050000,
    "total_expenses": 320000,
    "net_income": 730000,
    "sales_count": 245,
    "expense_count": 187
  }
}
```

## Frontend Component
The existing frontend component at `src/components/finance/reports/ProfitLossReport.tsx` remains unchanged and will automatically receive the new data structure.

## Testing Checklist

- [ ] Verify revenue calculation from sales_orders.final_price
- [ ] Confirm only completed/delivered/invoiced orders are included
- [ ] Check COGS categories are properly classified
- [ ] Verify Operating Expense categories are correctly grouped
- [ ] Test date range filtering (start_date to end_date)
- [ ] Validate summary calculations (gross profit and net income)
- [ ] Test with empty date ranges
- [ ] Test with no sales orders
- [ ] Test with no expenses
- [ ] Verify expense count and sales count in summary

## Database Tables Used

### sales_orders
- **Columns:** id, final_price, grand_total, created_at, customer_id, status
- **Filter:** status IN ('completed', 'delivered', 'invoiced')
- **Date Column:** created_at

### expenses
- **Columns:** id, date, category, description, amount, type, subcategory
- **Date Column:** date
- **All Categories:** Automatically grouped into COGS or Operating Expenses

## Benefits of This Approach

1. **Direct Data Source:** No dependency on chart of accounts or general ledger entries
2. **Real-Time Accuracy:** Always reflects actual sales orders and expenses
3. **Simplified Logic:** Straightforward calculation without complex accounting rules
4. **Performance:** Single query per table (no joins or nested queries)
5. **Transparency:** Easy to trace revenue and expenses back to source tables
6. **Flexibility:** Easy to add new expense categories or change COGS classification

## Migration Notes

- **Previous Implementation:** Used stored procedure `generate_profit_loss_report` with fallback to chart_of_accounts and general_ledger
- **Current Implementation:** Direct queries to sales_orders and expenses tables
- **Removed Function:** `generateProfitLossManual` (legacy manual calculation)
- **No Breaking Changes:** API response structure remains compatible with frontend

## Future Enhancements

1. Add filtering by customer, sales representative, or expense category
2. Include tax calculations (currently not included in net income)
3. Add other income/expenses category
4. Support for multiple revenue streams (not just sales)
5. Drill-down capability to view individual transactions
6. Export detailed transaction list with each report
7. Comparison with previous periods
8. Budget vs. actual analysis

## Related Files

- **API Route:** `src/app/api/finance/reports/[reportType]/route.ts`
- **Frontend Component:** `src/components/finance/reports/ProfitLossReport.tsx`
- **Route Page:** `src/app/(erp)/reports/profit-loss/page.tsx`
- **Database Schema:** `database/schema.sql` (lines 1810-1850 for sales_orders, 878-920 for expenses)

## Contact & Support

For issues or questions regarding this implementation, refer to the technical documentation or check the schema definitions in `database/schema.sql`.
