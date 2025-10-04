# Withdrawals Card Update - Dashboard Enhancement

## Overview
Replaced the **Customer Conversion** card in the main dashboard stats section with a **Withdrawals (MTD)** card to provide better financial visibility.

## Changes Made

### 1. Dashboard Card Replacement
**File**: `/src/app/(erp)/dashboard/modular-page.tsx`

**Before:**
- Customer Conversion card showing conversion percentage
- Icon: Percent (%)
- Data: `customerConversionRatio`

**After:**
- Withdrawals (MTD) card showing monthly withdrawal totals
- Icon: ArrowDownLeft (↙)
- Data: `withdrawalsTotal` and `withdrawalsCount`

### 2. Icon Import Added
```typescript
// Added ArrowDownLeft icon import
import { 
  // ... existing imports
  ArrowDownLeft
} from "lucide-react";
```

### 3. Card Layout Structure
```typescript
{/* Withdrawals (MTD) Card */}
<Card className="bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200 h-20 sm:h-24">
  <CardContent className="p-2 sm:p-3 h-full">
    <div className="flex items-center justify-between h-full">
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-violet-600 truncate">
          Withdrawals (MTD)
        </p>
        <div className="text-sm sm:text-lg font-bold text-violet-900 truncate">
          ₹{(kpiData?.data?.withdrawalsTotal || 0).toLocaleString()}
        </div>
        <p className="text-xs text-violet-600 truncate">
          {kpiData?.data?.withdrawalsCount || 0} transactions
        </p>
      </div>
      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-violet-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
        <ArrowDownLeft className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
      </div>
    </div>
  </CardContent>
</Card>
```

## Data Source
The withdrawals data comes from the existing KPIs API endpoint (`/api/dashboard/kpis`) which already calculates:
- `withdrawalsTotal`: Total withdrawal amount for MTD
- `withdrawalsCount`: Number of withdrawal transactions
- `withdrawalsByType`: Breakdown by withdrawal type

## Features
- **MTD Tracking**: Shows month-to-date withdrawal totals
- **Transaction Count**: Displays number of withdrawal transactions
- **Responsive Design**: Adapts to different screen sizes
- **Loading States**: Shows shimmer animation while loading
- **Currency Formatting**: Properly formatted Indian Rupee display

## Business Value
1. **Financial Visibility**: Better insight into cash outflows
2. **Expense Monitoring**: Track partner withdrawals and business expenses
3. **Cash Flow Management**: Monitor withdrawal patterns for better planning
4. **Operational Efficiency**: Quick access to withdrawal metrics alongside other KPIs

## Dashboard Layout (Updated)
### Row 1: Revenue Metrics
- Revenue (MTD)
- Profit (MTD) 
- Gross Profit (MTD)
- Payment Collected

### Row 2: Expense & Outflow Metrics
- Total Expenses (MTD)
- Outstanding
- Vendor Payments
- **Withdrawals (MTD)** ← *New Addition*

## Technical Notes
- Uses existing withdrawals calculation from KPIs API
- Maintains consistent color scheme (violet gradient)
- Preserves responsive grid layout
- Compatible with existing loading and error states
- No additional API calls required

## Testing
✅ Development server starts successfully  
✅ Component renders without errors  
✅ Responsive design works across screen sizes  
✅ Loading states function properly  
✅ Data formatting displays correctly  

## Future Enhancements
- Add withdrawal trend indicators
- Include withdrawal type breakdown in card tooltip
- Add click-through to detailed withdrawals page
- Implement withdrawal alerts for high amounts