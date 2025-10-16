# P&L Report - Expand/Collapse Functionality

## Date: October 16, 2025

## Feature Overview
Added interactive expand/collapse functionality to the Profit & Loss report, allowing users to toggle visibility of subcategories and individual expense items by clicking on category and subcategory headers.

## User Experience

### Default State (Collapsed)
- All categories show only the category header with total amount
- Subcategories and individual items are hidden
- Chevron right icon (▶) indicates collapsed state

### Expanded State
- Clicking a category header reveals its subcategories
- Clicking a subcategory header reveals individual expense items
- Chevron down icon (▼) indicates expanded state
- Clicking again collapses the section

## Visual Indicators

### Category Headers
- **Icon:** Chevron Right (▶) when collapsed, Chevron Down (▼) when expanded
- **Cursor:** Pointer on hover
- **Background:** Brightens on hover (indicates clickable)
- **Behavior:** Click to toggle subcategories

### Subcategory Headers
- **Icon:** Chevron Right (▶) when collapsed, Chevron Down (▼) when expanded
- **Indentation:** Slightly indented (ml-4) to show hierarchy
- **Cursor:** Pointer on hover
- **Background:** Brightens on hover
- **Behavior:** Click to toggle individual items

### Individual Items
- **Icon:** None
- **Indentation:** More indented (ml-8) to show hierarchy
- **Cursor:** Default
- **Background:** Hover effect only
- **Behavior:** Non-clickable (display only)

## Implementation Details

### State Management
```typescript
// Track which categories are expanded
const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

// Track which subcategories are expanded
const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
```

### Toggle Functions

#### Category Toggle
```typescript
const toggleCategory = (categoryCode: string) => {
  const newExpanded = new Set(expandedCategories);
  if (newExpanded.has(categoryCode)) {
    newExpanded.delete(categoryCode);
    // Also collapse all subcategories under this category
    const newSubExpanded = new Set(expandedSubcategories);
    Array.from(expandedSubcategories).forEach(subKey => {
      if (subKey.startsWith(categoryCode + '-')) {
        newSubExpanded.delete(subKey);
      }
    });
    setExpandedSubcategories(newSubExpanded);
  } else {
    newExpanded.add(categoryCode);
  }
  setExpandedCategories(newExpanded);
};
```

#### Subcategory Toggle
```typescript
const toggleSubcategory = (subcategoryCode: string) => {
  const newExpanded = new Set(expandedSubcategories);
  if (newExpanded.has(subcategoryCode)) {
    newExpanded.delete(subcategoryCode);
  } else {
    newExpanded.add(subcategoryCode);
  }
  setExpandedSubcategories(newExpanded);
};
```

### Rendering Logic

#### Revenue Section
```typescript
{reportData.sections.REVENUE.map((item, index) => {
  const isHeader = item.is_category_header;
  const isItem = item.is_revenue_item;
  
  // Hide items if category is not expanded
  if (isItem && !expandedCategories.has('REV001')) {
    return null;
  }
  
  return (
    <TableRow 
      className={
        isHeader ? 'bg-green-100 font-bold cursor-pointer hover:bg-green-200' :
        isItem ? 'hover:bg-gray-50' : ''
      }
      onClick={() => {
        if (isHeader) {
          toggleCategory(item.account_code);
        }
      }}
    >
      <TableCell className="font-mono text-sm">
        {isHeader && (
          <span className="inline-flex items-center gap-1">
            {expandedCategories.has(item.account_code) ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {item.account_code}
          </span>
        )}
        {!isHeader && item.account_code}
      </TableCell>
      {/* ... other cells ... */}
    </TableRow>
  );
})}
```

#### COGS & Expenses Sections
```typescript
{reportData.sections.COST_OF_GOODS_SOLD.map((item, index) => {
  const isHeader = item.is_category_header;
  const isSubHeader = item.is_subcategory_header;
  const isItem = item.is_expense_item;
  
  // Determine the parent category code
  let parentCategoryCode = '';
  if (isSubHeader || isItem) {
    parentCategoryCode = item.account_code.split('-')[0];
  }
  
  // Hide subcategories if category is not expanded
  if (isSubHeader && !expandedCategories.has(parentCategoryCode)) {
    return null;
  }
  
  // Hide items if subcategory is not expanded
  if (isItem && !expandedSubcategories.has(item.account_code)) {
    return null;
  }
  
  return (
    <TableRow 
      className={
        isHeader ? 'bg-orange-100 font-bold cursor-pointer hover:bg-orange-200' :
        isSubHeader ? 'bg-orange-50 font-semibold cursor-pointer hover:bg-orange-100' :
        isItem ? 'hover:bg-gray-50' : ''
      }
      onClick={() => {
        if (isHeader) {
          toggleCategory(item.account_code);
        } else if (isSubHeader) {
          toggleSubcategory(item.account_code);
        }
      }}
    >
      {/* Chevron icons and content */}
    </TableRow>
  );
})}
```

## Interaction Flow

### Scenario 1: Expanding Revenue
1. **Initial State:** Revenue shows only "Sales Revenue" header with total
2. **User Action:** Click on "Sales Revenue" row
3. **Result:** Individual sales orders appear below
4. **Visual:** Chevron changes from ▶ to ▼

### Scenario 2: Expanding COGS/Expenses Category
1. **Initial State:** Category shows only header (e.g., "Manufacturing")
2. **User Action:** Click on category header
3. **Result:** Subcategories appear (e.g., "General")
4. **Visual:** Chevron changes from ▶ to ▼
5. **Note:** Individual items still hidden until subcategory is clicked

### Scenario 3: Expanding Subcategory
1. **Prerequisite:** Parent category must be expanded
2. **User Action:** Click on subcategory header (e.g., "General")
3. **Result:** Individual expense items appear
4. **Visual:** Subcategory chevron changes from ▶ to ▼

### Scenario 4: Collapsing Category
1. **Initial State:** Category expanded with visible subcategories
2. **User Action:** Click on category header again
3. **Result:** 
   - All subcategories hide
   - All individual items under those subcategories also hide
   - All subcategory expanded states are cleared
4. **Visual:** Chevron changes from ▼ to ▶

## CSS Classes Used

### Clickable Headers
```css
cursor-pointer              /* Show pointer cursor */
hover:bg-green-200         /* Revenue header hover */
hover:bg-orange-200        /* COGS category header hover */
hover:bg-orange-100        /* COGS subcategory header hover */
hover:bg-red-200           /* Expense category header hover */
hover:bg-red-100           /* Expense subcategory header hover */
```

### Indentation
```css
ml-4    /* Subcategory indentation (16px) */
ml-8    /* Individual item indentation (32px) */
```

### Icon Styling
```css
inline-flex items-center gap-1    /* Icon and text alignment */
h-4 w-4                           /* Icon size */
```

## Benefits

1. **Cleaner Interface**: Default collapsed view shows only high-level summary
2. **Progressive Disclosure**: Users can drill down to details as needed
3. **Performance**: Less initial rendering (hidden items not visible)
4. **Better UX**: Users control what information they want to see
5. **Professional Look**: Standard accounting software behavior
6. **Mobile Friendly**: Less scrolling needed on smaller screens

## User Workflow Examples

### Quick Overview (No Clicks)
```
REVENUE
└─ Sales Revenue: ₹1,500,000

COGS
├─ Manufacturing: ₹486,760
└─ Raw Materials: ₹21,010

EXPENSES
├─ Salaries & Benefits: ₹113,190
├─ Maintenance & Repairs: ₹941,553
└─ ... other categories
```

### Detailed Review (All Expanded)
```
REVENUE ▼
└─ Sales Revenue: ₹1,500,000 ▼
   ├─ Order #abc123 - Acme Corp: ₹500,000
   ├─ Order #def456 - XYZ Inc: ₹600,000
   └─ Order #ghi789 - Tech Co: ₹400,000

COGS ▼
├─ Manufacturing: ₹486,760 ▼
│  └─ General: ₹486,760 ▼
│     ├─ Production Costs: ₹150,000
│     ├─ Factory Overhead: ₹180,000
│     └─ Equipment: ₹156,760
└─ Raw Materials: ₹21,010 ▼
   └─ General: ₹21,010 ▼
      ├─ Steel: ₹10,000
      └─ Wood: ₹11,010
```

### Targeted Investigation (Selective Expansion)
```
REVENUE
└─ Sales Revenue: ₹1,500,000

COGS
├─ Manufacturing: ₹486,760
└─ Raw Materials: ₹21,010

EXPENSES ▼
├─ Salaries & Benefits: ₹113,190
├─ Maintenance & Repairs: ₹941,553 ▼
│  └─ General: ₹941,553 ▼
│     ├─ Building Maintenance: ₹300,000
│     ├─ Equipment Repairs: ₹400,000
│     └─ Facility Upgrades: ₹241,553
└─ ... other categories
```

## Files Modified

- **Component:** `src/components/finance/reports/ProfitLossReport.tsx`
  - Added state management for expand/collapse
  - Added toggle functions
  - Updated rendering logic with conditional display
  - Added chevron icons
  - Added cursor and hover styles

## Technical Notes

### Performance Considerations
- Uses React's conditional rendering (`return null`) for hidden items
- Hidden items don't render to DOM (not just CSS `display: none`)
- State managed with `Set` for O(1) lookup performance
- No unnecessary re-renders (only affected sections update)

### Accessibility
- Clickable rows use `cursor-pointer` to indicate interactivity
- Visual feedback on hover
- Clear visual indicators (chevrons) for expand/collapse state
- Could be enhanced with:
  - ARIA attributes (aria-expanded, role="button")
  - Keyboard navigation (Enter/Space to toggle)
  - Screen reader announcements

### Future Enhancements
1. "Expand All" / "Collapse All" buttons
2. Remember expanded state in localStorage
3. URL parameter to share specific expanded view
4. Keyboard shortcuts (Ctrl+E to expand all, etc.)
5. Animation transitions for smooth expand/collapse
6. Search functionality to auto-expand matching items

## Testing Checklist

- [x] Categories collapse by default
- [x] Clicking category header toggles subcategories
- [x] Clicking subcategory header toggles items
- [x] Chevron icons update correctly
- [x] Hover effects work on headers
- [x] Collapsing category also collapses its subcategories
- [x] Non-header rows are not clickable
- [x] Total rows remain visible at all times
- [x] No TypeScript errors
- [x] No console errors

## Related Documentation

- See: `PL_DETAILED_EXPENSE_LISTING.md` for expense listing implementation
- See: `PROFIT_LOSS_REAL_DATA_INTEGRATION.md` for data integration details
