# Expense Dialog Search Fields Implementation

## Overview
Added search/filter functionality to the expense dialog in the Invoice tab to make it easier to find and select expense categories and entities (employees, trucks, suppliers).

## Features Added

### 1. Expense Category Search Field
**Location**: Invoice Tab > Create Expense Dialog > Category Dropdown

**Functionality**:
- Sticky search input at the top of the dropdown
- Filters categories in real-time as you type
- Searches across:
  - Category name (e.g., "Salaries", "Office Supplies")
  - Parent category (e.g., "Salaries & Benefits", "Administrative")
  - Account code (e.g., "6200", "6100")
- Case-insensitive search
- Maintains category grouping (Cash Management, Owner's Drawings, Business Expenses)
- Shows "No results" message when no matches found
- Search term resets when a category is selected

**User Experience**:
```
1. Click on "Expense Category" dropdown
2. Type in the search box (e.g., "salary")
3. Dropdown filters to show only matching categories:
   - Salaries
   - Administrative Salaries
   - Sales Salaries
   - Management Salaries
   - Driver Salaries
   etc.
4. Select the desired category
5. Search box clears automatically
```

### 2. Entity Search Field (Employee/Truck/Supplier)
**Location**: Invoice Tab > Create Expense Dialog > Entity Dropdown (appears for certain categories)

**Functionality**:
- Appears when selecting categories that require entity selection:
  - **Employee-related**: Salaries, Overtime, Incentives, etc.
  - **Truck-related**: Vehicle Fuel, Vehicle Maintenance, etc.
  - **Supplier-related**: Vendor Payments, etc.
- Sticky search input at the top of the dropdown
- Filters entities in real-time as you type
- **Employee search** across:
  - Employee name
  - Position/title
  - Employee ID
- **Truck search** across:
  - Plate number
  - Model
  - Fuel type
- **Supplier search** across:
  - Supplier name
  - Contact information
- Case-insensitive search
- Shows "No results" message when no matches found
- Search term resets when an entity is selected

**User Experience**:
```
For Employee Selection:
1. Select category: "Salaries"
2. Employee dropdown appears
3. Type in search box (e.g., "manager")
4. Filters to show only employees with "manager" in:
   - Name
   - Position (e.g., "HR Manager", "Sales Manager")
   - Employee ID
5. Select the desired employee
6. Search box clears automatically
```

## Technical Implementation

### State Variables Added
```typescript
const [categorySearchTerm, setCategorySearchTerm] = useState('');
const [entitySearchTerm, setEntitySearchTerm] = useState('');
```

### Filter Functions

#### `getFilteredCategories()`
```typescript
const getFilteredCategories = () => {
  const lowerSearchTerm = categorySearchTerm.toLowerCase();
  
  return Object.entries(subcategoryMap).filter(([category, details]) => {
    if (!categorySearchTerm) return true;
    const searchString = `${category} ${details.category} ${details.accountCode}`.toLowerCase();
    return searchString.includes(lowerSearchTerm);
  });
};
```

#### Updated `getEntityOptions()`
Now includes filtering logic for each entity type:
```typescript
// For employees
.filter(employee => {
  if (!entitySearchTerm) return true;
  const searchString = `${employee.name} ${employee.position} ${employee.employee_id || ''}`.toLowerCase();
  return searchString.includes(lowerSearchTerm);
})
```

### UI Updates

#### Category Dropdown Structure
```tsx
<SelectContent className="max-h-96">
  {/* Search input - sticky at top */}
  <div className="sticky top-0 z-10 bg-white border-b p-2">
    <Input
      placeholder="Search categories..."
      value={categorySearchTerm}
      onChange={(e) => setCategorySearchTerm(e.target.value)}
      className="h-8"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    />
  </div>

  {/* Filtered category groups */}
  {/* Cash Management */}
  {/* Owner's Drawings */}
  {/* Business Expenses */}

  {/* No results message */}
  {getFilteredCategories().length === 0 && (
    <div className="p-4 text-center text-sm text-gray-500">
      No categories found matching "{categorySearchTerm}"
    </div>
  )}
</SelectContent>
```

#### Entity Dropdown Structure
```tsx
<SelectContent className="max-h-96">
  {/* Search input - sticky at top */}
  <div className="sticky top-0 z-10 bg-white border-b p-2">
    <Input
      placeholder="Search employees..."
      value={entitySearchTerm}
      onChange={(e) => setEntitySearchTerm(e.target.value)}
      className="h-8"
    />
  </div>

  {/* Filtered entity options */}
  {getEntityOptions().map(option => (
    <SelectItem key={option.value} value={option.value}>
      {option.label}
    </SelectItem>
  ))}

  {/* No results message */}
  {getEntityOptions().length === 0 && (
    <div className="p-4 text-center text-sm text-gray-500">
      No employees found matching "{entitySearchTerm}"
    </div>
  )}
</SelectContent>
```

## Benefits

### 1. Improved User Experience
- **Faster category finding**: No need to scroll through 100+ categories
- **Quick employee lookup**: Find employees by name or position instantly
- **Reduced errors**: Easier to find the correct category/entity

### 2. Time Savings
- **Before**: Scroll through entire list, visually scan for category
- **After**: Type a few letters, select from filtered results
- **Estimated time saved**: 5-10 seconds per expense entry

### 3. Better for Large Datasets
- **Many employees**: Easy to find specific employee among dozens
- **Many trucks**: Quick vehicle lookup by plate number
- **Many categories**: Fast category selection from extensive list

## Usage Examples

### Example 1: Create Salary Expense
```
1. Open expense dialog
2. Type "sal" in category search
3. See filtered results:
   - Salaries
   - Administrative Salaries
   - Sales Salaries
   - Management Salaries
4. Select "Salaries"
5. Employee dropdown appears
6. Type "surumi" in employee search
7. See: "Surumi A A - HR Manager (₹12,000)"
8. Select employee
9. Enter amount
10. Submit
```

### Example 2: Create Vehicle Fuel Expense
```
1. Open expense dialog
2. Type "fuel" in category search
3. See: "Vehicle Fuel - Fleet"
4. Select category
5. Truck dropdown appears
6. Type "KL" in truck search
7. See all vehicles with "KL" in plate number
8. Select truck
9. Enter amount
10. Submit
```

### Example 3: Create Office Supplies Expense
```
1. Open expense dialog
2. Type "office" in category search
3. See filtered results:
   - Office Rent
   - Office Utilities
   - Office Supplies
   - Office Equipment
4. Select "Office Supplies"
5. No entity selection needed (not required for this category)
6. Enter description and amount
7. Submit
```

## Technical Notes

### Dropdown Height
- Increased from `max-h-60` to `max-h-96` to accommodate search input
- More visible results after filtering

### Search Input Behavior
```typescript
onClick={(e) => e.stopPropagation()}
onKeyDown={(e) => e.stopPropagation()}
```
- Prevents dropdown from closing when typing
- Allows smooth typing experience

### Sticky Positioning
```css
className="sticky top-0 z-10 bg-white border-b"
```
- Search box stays at top when scrolling
- Always visible during category selection

### Auto-Reset
```typescript
onValueChange={(value) => {
  handleCategoryChange(value);
  setCategorySearchTerm(''); // Clears search after selection
}}
```
- Search term resets automatically after selection
- Ready for next search

## Files Modified

### `src/components/finance/SalesOrderInvoiceManager.tsx`

**Lines ~400**: Added search state variables
```typescript
const [categorySearchTerm, setCategorySearchTerm] = useState('');
const [entitySearchTerm, setEntitySearchTerm] = useState('');
```

**Lines ~1480-1530**: Updated `getEntityOptions()` with search filtering
- Added filter logic for trucks
- Added filter logic for employees  
- Added filter logic for suppliers

**Lines ~1523-1532**: Added `getFilteredCategories()` function
- Filters expense categories based on search term

**Lines ~6040-6165**: Updated category Select component
- Added search input at top
- Applied filtering to all category groups
- Added no results message
- Auto-reset search on selection

**Lines ~6195-6235**: Updated entity Select component
- Added search input at top
- Applied getEntityOptions() which now includes filtering
- Added no results message
- Auto-reset search on selection

## Future Enhancements

### Possible Improvements
1. **Fuzzy search**: Match approximate spellings (e.g., "slary" finds "salary")
2. **Recent selections**: Show recently used categories/entities at top
3. **Keyboard navigation**: Arrow keys to navigate filtered results
4. **Search history**: Remember previous searches
5. **Advanced filters**: Filter by category type, account code range, etc.
6. **Multi-select**: Select multiple entities for batch expenses

### Performance Considerations
- Current implementation is efficient for datasets up to ~1000 items
- For larger datasets, consider:
  - Debouncing search input
  - Virtual scrolling for results
  - Backend search for very large datasets

## Testing Checklist

- [x] Category search filters correctly
- [x] Entity search filters correctly (employees)
- [x] Entity search filters correctly (trucks)
- [x] Entity search filters correctly (suppliers)
- [x] Case-insensitive search works
- [x] Search box stays visible when scrolling
- [x] Search clears after selection
- [x] No results message displays correctly
- [x] Category grouping maintained after filtering
- [x] Typing in search doesn't close dropdown
- [x] Selected value displays correctly

## Summary

The expense dialog now has **powerful search capabilities** that make it much easier and faster to create expenses. Users can quickly find the right category and entity by typing just a few letters, significantly improving the expense creation workflow! 🎯✨
