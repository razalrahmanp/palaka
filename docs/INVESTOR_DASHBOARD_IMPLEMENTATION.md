# Investor & Withdrawal Dashboard Implementation

## Overview
Transformed the simple withdrawals summary into a comprehensive **Investor Dashboard** with visual analytics including pie charts, line charts, and individual investor breakdowns.

## Features Implemented

### 1. **Dual View Modes**
- **Overview Mode**: Aggregate investment/withdrawal analytics
- **All Investors Mode**: Individual investor performance tracking

### 2. **Overview Mode Components**

#### Summary Cards (3 Cards)
1. **Total Investment**
   - Blue gradient card
   - Shows total capital inflow
   - Icon: TrendingUp

2. **Total Withdrawal**
   - Red gradient card
   - Shows total capital outflow
   - Icon: TrendingDown

3. **Net Position**
   - Green gradient card
   - Shows Investment - Withdrawal
   - Icon: DollarSign

#### Investment Breakdown (Pie Chart)
- **Title**: "Investment by Category"
- **Data Source**: Investments grouped by `investment_categories`
- **Colors**: Blue, Green, Orange, Red, Purple, Pink
- **Labels**: Category name with percentage
- **Tooltip**: Shows currency amount

#### Withdrawal Breakdown (Pie Chart)
- **Title**: "Withdrawal by Type"
- **Data Source**: Withdrawals grouped by `withdrawal_type`
- **Types**:
  - Capital Withdrawal (Red)
  - Interest Payment (Orange)
  - Profit Distribution (Green)
- **Labels**: Type name with percentage
- **Tooltip**: Shows currency amount

#### Trend Analysis (Line Chart)
- **Title**: "Investment vs Withdrawal Trend"
- **Data**: Last 6 months monthly aggregation
- **Lines**:
  - Investment (Blue, 3px stroke)
  - Withdrawal (Red, 3px stroke)
- **Features**:
  - Responsive dots on data points
  - Hover tooltips with currency formatting
  - Grid background
  - Smooth monotone curves

### 3. **All Investors Mode**

#### Individual Investor Cards
Each investor displays:
- **Header**:
  - Investor name
  - Equity percentage
  - User icon
  - Net position (large, color-coded)

- **Metrics Grid** (3 columns):
  1. Total Investment (Blue border)
  2. Total Withdrawal (Red border)
  3. Net Position (Green/Orange border based on positive/negative)

- **Sorting**: Investors sorted by net position (highest first)

## API Endpoint

### `/api/dashboard/investors`
**Method**: GET

**Query Parameters**:
- `start_date`: Filter start date (default: Jan 1 of current year)
- `end_date`: Filter end date (default: today)

**Response Structure**:
```json
{
  "success": true,
  "totalInvestment": 12500000,
  "totalWithdrawal": 3200000,
  "netPosition": 9300000,
  "investmentByCategory": [
    { "name": "Capital Injection", "value": 10000000 },
    { "name": "Equipment", "value": 2500000 }
  ],
  "withdrawalByType": [
    { "name": "Capital Withdrawal", "value": 2000000 },
    { "name": "Profit Distribution", "value": 1000000 },
    { "name": "Interest Payment", "value": 200000 }
  ],
  "trendData": [
    { "month": "May 2025", "investment": 5000000, "withdrawal": 500000 },
    { "month": "Jun 2025", "investment": 3000000, "withdrawal": 800000 }
  ],
  "investors": [
    {
      "id": 1,
      "name": "John Doe",
      "total_investment": 7500000,
      "total_withdrawal": 1500000,
      "net_position": 6000000,
      "equity_percentage": 60
    }
  ]
}
```

**Data Sources**:
1. `partners` table - Investor profiles
2. `investments` table - Capital injections with categories
3. `withdrawals` table - Withdrawals with types
4. `investment_categories` table - Category names

## Database Schema Used

### Tables
1. **partners**
   - id, name, equity_percentage, is_active

2. **investments**
   - id, partner_id, amount, investment_date, category_id
   - Foreign key to investment_categories

3. **withdrawals**
   - id, partner_id, amount, withdrawal_date, withdrawal_type
   - withdrawal_type enum: capital_withdrawal, interest_payment, profit_distribution

4. **investment_categories**
   - id, name

## Technical Stack

### Frontend Components
- **InvestorWithdrawalDashboard.tsx**: Main component
- **DashboardCharts.tsx**: Updated to import investor dashboard
- **Libraries**:
  - Recharts: PieChart, LineChart
  - Lucide React: Icons
  - Shadcn UI: Cards, Buttons

### Backend
- **API Route**: `src/app/api/dashboard/investors/route.ts`
- **Database**: Supabase (PostgreSQL)
- **Query Optimization**: Parallel fetches with Promise.all

## Visual Design

### Color Scheme
- **Investment Theme**: Blue gradients (#3B82F6)
- **Withdrawal Theme**: Red/Violet gradients (#EF4444, #DC2626)
- **Net Position**: Green (positive) / Orange (negative)

### Responsive Layout
- Mobile: Single column
- Tablet: 2 columns for cards
- Desktop: Full grid layouts

### Typography
- Headers: Bold, larger text
- Metrics: 3xl font for emphasis
- Subtitles: Small, gray text

## Calculations

### Investment Aggregation
```typescript
totalInvestment = SUM(investments.amount) WHERE date IN [startDate, endDate]
```

### Withdrawal Aggregation
```typescript
totalWithdrawal = SUM(withdrawals.amount) WHERE date IN [startDate, endDate]
```

### Net Position
```typescript
netPosition = totalInvestment - totalWithdrawal
```

### Per-Investor Metrics
```typescript
investor.net_position = 
  SUM(investments WHERE partner_id = investor.id) - 
  SUM(withdrawals WHERE partner_id = investor.id)
```

### Monthly Trend
- Last 6 months aggregation
- Month-wise grouping of investments and withdrawals
- Zero-filled for months with no activity

## User Experience

### Toggle Interaction
1. Click "Overview" button - Shows aggregate analytics
2. Click "All Investors" button - Shows individual investor cards
3. Smooth transitions between views
4. Persistent state during session

### Loading States
- Spinner animation while fetching data
- Centered in card content
- Violet-themed spinner

### Empty States
- "No investor data available" message
- Users icon placeholder
- Gray-themed, centered

## Integration Points

### Dashboard Page
- Accessed via `selectedChart === 'withdrawals'`
- Integrated into existing DashboardCharts component
- Date range inherited from dashboard filters

### Data Flow
1. User selects "Withdrawals" chart from dashboard
2. InvestorWithdrawalDashboard component mounts
3. Fetches data from `/api/dashboard/investors`
4. Renders overview or investor view based on toggle
5. Updates when date range changes

## Future Enhancements
- Export to PDF/Excel
- Drill-down to individual transactions
- Comparison with previous periods
- Investment vs Withdrawal ratio gauges
- ROI calculations per investor
- Payment reminders for profit distribution
