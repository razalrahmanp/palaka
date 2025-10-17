# Removed "All Ledgers" Tab from General Ledger

## Changes Made

### 1. Updated Default Tab
Changed the default active tab from `'all'` to `'customer'`:
```typescript
const [activeTab, setActiveTab] = useState('customer');
```

### 2. Removed "All Ledgers" Tab Button
- Removed the "All Ledgers" tab trigger from the TabsList
- Updated grid layout from `grid-cols-9` to `grid-cols-8` to accommodate 8 tabs instead of 9

**Remaining Tabs:**
1. Customers
2. Suppliers
3. Employees
4. Investors
5. Loans
6. Banks
7. Sales Returns
8. Purchase Returns

### 3. Simplified Content Display
- Removed the conditional check for `activeTab === 'all'`
- Removed the entire grouped view logic (showing ledgers grouped by type and category)
- Now all tabs use the same regular table view format

### 4. Cleaned Up Unused Code
Removed the following unused elements:

**Imports:**
- `LayoutGrid` icon
- `ChevronDown` icon
- `ChevronUp` icon

**State Variables:**
- `expandedGroups` - tracked which type groups were expanded in "All Ledgers" view
- `expandedSubgroups` - tracked which subcategories were expanded

**Functions:**
- `groupLedgersByType()` - grouped ledgers by type and category
- `toggleGroup()` - toggled group expansion
- `toggleSubgroup()` - toggled subcategory expansion

## Benefits

✅ **Cleaner UI**: Users now start directly on the Customers tab
✅ **Simplified Navigation**: Removed unused "All Ledgers" tab reduces cognitive load
✅ **Better Performance**: Removed complex grouping logic that wasn't needed
✅ **Cleaner Codebase**: Removed ~150 lines of unused code

## User Experience

When users navigate to the General Ledger:
1. **Default View**: Opens on "Customers (Receivables)" tab
2. **Available Tabs**: 8 focused tabs for specific ledger types
3. **Consistent Layout**: All tabs use the same table format for easy understanding

## Testing Checklist

- [x] No TypeScript errors
- [ ] Page loads correctly with Customers tab active
- [ ] All 8 tabs are clickable and functional
- [ ] Search and filter work on all tabs
- [ ] Pagination works correctly
- [ ] Export functionality still works
