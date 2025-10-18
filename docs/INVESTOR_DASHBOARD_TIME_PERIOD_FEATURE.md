# Investor Dashboard Time Period Selection Feature

## Overview
Added comprehensive time period dropdown selector to the Investor & Withdrawal Dashboard, allowing users to filter data by various time ranges.

## Implementation Date
October 18, 2025

## Features Added

### 1. Time Period Dropdown Menu
- **Location**: Header section, between title and view toggle buttons
- **Component**: shadcn/ui DropdownMenu with Calendar icon
- **Design**: Compact button with violet theme matching dashboard aesthetics

### 2. Time Period Options

#### Quick Select (Main Level)
- **Today**: Current day data
- **This Week**: Monday to Sunday of current week
- **This Month**: First to last day of current month
- **Last Month**: Previous month's complete data

#### Week (Monthly Base) - Submenu
- **Week 1**: Days 1-7 of current month
- **Week 2**: Days 8-14 of current month
- **Week 3**: Days 15-21 of current month
- **Week 4**: Days 22-28 of current month
- **Week 5**: Days 29+ of current month (if applicable)

#### Month (Jan-Dec) - Submenu
Individual months with proper day counts:
- January (31 days)
- February (28/29 days - leap year aware)
- March (31 days)
- April (30 days)
- May (31 days)
- June (30 days)
- July (31 days)
- August (31 days)
- September (30 days)
- October (31 days)
- November (30 days)
- December (31 days)

#### All Time Options - Submenu

**Quarters:**
- **Q1**: January - March
- **Q2**: April - June
- **Q3**: July - September
- **Q4**: October - December

**Half-Yearly:**
- **H1**: January - June
- **H2**: July - December

**Yearly:**
- **This Year**: Full current year (Jan 1 - Dec 31)

#### All Time
- **All Time**: Complete historical data (from 2000-01-01 to present)

## Technical Implementation

### TypeScript Types
```typescript
type TimePeriod = 
  | 'today' 
  | 'this_week' 
  | 'this_month' 
  | 'last_month'
  | 'week_1' | 'week_2' | 'week_3' | 'week_4' | 'week_5'
  | 'jan' | 'feb' | 'mar' | 'apr' | 'may' | 'jun' 
  | 'jul' | 'aug' | 'sep' | 'oct' | 'nov' | 'dec'
  | 'quarter_1' | 'quarter_2' | 'quarter_3' | 'quarter_4'
  | 'half_1' | 'half_2'
  | 'this_year'
  | 'all_time'
```

### State Management
```typescript
const [timePeriod, setTimePeriod] = useState<TimePeriod>('all_time')
```

### Date Range Calculation
- **Function**: `getDateRangeForPeriod(period: TimePeriod)`
- **Returns**: `{ startDate: string, endDate: string, allTime?: boolean }`
- **Date Format**: ISO 8601 (YYYY-MM-DD)
- **Features**:
  - Automatic current date calculation
  - Week calculation (Monday as week start)
  - Leap year handling for February
  - Dynamic month end dates

### API Integration
- **Endpoint**: `/api/dashboard/investors`
- **Parameters**:
  - `all_time=true` for all-time data
  - `start_date` and `end_date` for specific ranges
- **Auto-refetch**: Data automatically updates when period changes via `useEffect` dependency

### UI Components Used
- **DropdownMenu**: Main container
- **DropdownMenuTrigger**: Button with Calendar icon
- **DropdownMenuContent**: Dropdown panel
- **DropdownMenuItem**: Individual options
- **DropdownMenuSub**: Nested submenus
- **DropdownMenuSubTrigger**: Submenu triggers
- **DropdownMenuSubContent**: Submenu panels
- **DropdownMenuSeparator**: Visual separators
- **DropdownMenuLabel**: Section headers
- **Button**: Trigger button component

### CSS Styling
- **Size**: Small (`size="sm"`, `h-8`)
- **Text**: Extra small (`text-xs`)
- **Colors**: Violet theme matching dashboard
- **Border**: `border-violet-300`
- **Hover**: `hover:bg-violet-50`
- **Icon Size**: `h-3.5 w-3.5`
- **Scrollable**: Month submenu has `max-h-80 overflow-y-auto`

## User Experience

### Visual Feedback
- Current selection displayed on button
- Hover effects on menu items
- Smooth transitions
- Compact design to preserve space

### Accessibility
- Keyboard navigation support (via shadcn/ui)
- Clear labeling
- Nested menus for organized options
- Scrollable submenu for long lists

### Loading State
- Spinner shown during data fetch
- Loading state managed via `loading` state variable

## Usage Instructions

### For Users
1. Click the time period button (shows current selection, default: "All Time")
2. Select from quick options or hover over submenu items
3. Click desired period
4. Dashboard automatically updates with filtered data

### For Developers
To add new time periods:
1. Add new type to `TimePeriod` union
2. Add entry to `TIME_PERIOD_LABELS` record
3. Add case to `getDateRangeForPeriod` function
4. Add menu item to appropriate dropdown section

## Files Modified
- `src/components/dashboard/InvestorWithdrawalDashboard.tsx`

## Dependencies
- lucide-react: Calendar, ChevronDown icons
- @/components/ui/dropdown-menu: Dropdown components
- @/components/ui/button: Button component

## Browser Compatibility
- Modern browsers with ES6+ support
- Date API used for calculations
- CSS Grid and Flexbox for layout

## Future Enhancements
- Custom date range picker
- Date range presets (Last 7 days, Last 30 days, etc.)
- Year selector for historical data
- Multiple period comparison
- Save favorite time periods

## Testing Checklist
- ✅ All quick select options work
- ✅ Weekly breakdown (5 weeks)
- ✅ All 12 months selectable
- ✅ All 4 quarters work
- ✅ Both half-year periods work
- ✅ This Year option works
- ✅ All Time returns complete data
- ✅ API receives correct date parameters
- ✅ Data refreshes on period change
- ✅ Leap year handling for February
- ✅ Week calculation (Monday start)
- ✅ Current date boundaries respected

## Notes
- Default period: "All Time"
- All dates calculated dynamically based on current date
- Weekly breakdown assumes month starts on day 1
- Week 5 captures remaining days (29-31)
- Quarters and halves are calendar-based (not fiscal)
- All time starts from 2000-01-01
- Date format: ISO 8601 (YYYY-MM-DD)

## Support
For issues or questions, refer to the main dashboard documentation or contact the development team.
