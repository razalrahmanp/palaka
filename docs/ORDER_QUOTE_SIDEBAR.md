# Order Quote Sidebar Implementation

## Overview
Created a comprehensive sidebar component that displays recent quotes and sales orders with a toggleable interface.

## Features

### 🔄 Switchable View
- Toggle between Quotes and Sales Orders
- Visual icons (FileText for quotes, ShoppingCart for orders)
- Real-time count display

### 📋 Data Display
- **Quote/Order ID**: Last 8 characters for easy reference
- **Customer Name**: From customer relationship
- **Status**: Color-coded badges with icons
  - Draft: Outline badge with clock icon
  - Sent: Secondary badge with file icon
  - Accepted/Confirmed: Success badge with check icon
  - Rejected/Cancelled: Destructive badge with X icon
  - Processing: Warning badge with alert icon
  - Shipped/Delivered: Success badge with relevant icons
- **Amount**: Formatted currency with discount indication
- **Date**: Formatted creation date
- **Created By**: User who created the record
- **Freight**: Additional freight charges display

### 🎨 UI/UX Features
- **Responsive Design**: Fixed 320px width with full height
- **Hover Effects**: Cards have hover animations and border highlights
- **Loading States**: Spinner during data fetch
- **Error Handling**: Retry buttons and error messages
- **Empty States**: Friendly messages when no data found
- **Refresh**: Manual refresh button for latest data

### 🔌 Integration
- **Click Handlers**: Configurable callbacks for quote/order selection
- **Toast Notifications**: Success feedback on item selection
- **Console Logging**: Debug information for selected items

## Files Created/Modified

### ✅ New Component
- `src/components/OrderQuoteSidebar.tsx` - Main sidebar component

### ✅ New UI Component
- `src/components/ui/scroll-area.tsx` - Radix scroll area wrapper

### ✅ Modified Pages
- `src/app/(erp)/billing/page.tsx` - Added sidebar to billing layout

### ✅ Dependencies Added
- `@radix-ui/react-scroll-area` - For smooth scrolling

## API Integration

### Quotes Endpoint
```typescript
GET /api/sales/quotes
Expected Response: { quotes: Quote[] }
```

### Orders Endpoint
```typescript
GET /api/sales/orders  
Expected Response: { orders: SalesOrder[] }
```

## Usage Example

```tsx
<OrderQuoteSidebar
  onQuoteSelect={(quote) => {
    console.log("Selected quote:", quote);
    // Load quote data into form
  }}
  onOrderSelect={(order) => {
    console.log("Selected order:", order);
    // View order details
  }}
/>
```

## Layout Integration

The sidebar is integrated into the billing page with a flex layout:
- Main billing dashboard takes flex-1 (expandable)
- Sidebar has fixed width with border-left
- Responsive and scrollable content

## Status Badge Colors

| Status | Badge Type | Color | Icon |
|--------|------------|--------|------|
| Draft | Outline | Gray | Clock |
| Sent | Secondary | Blue | FileText |
| Accepted | Default | Green | CheckCircle |
| Confirmed | Default | Green | CheckCircle |
| Rejected | Destructive | Red | XCircle |
| Cancelled | Destructive | Red | XCircle |
| Processing | Secondary | Yellow | AlertCircle |
| Shipped | Default | Green | ShoppingCart |
| Delivered | Default | Green | CheckCircle |

## Future Enhancements

1. **Search/Filter**: Add search functionality
2. **Pagination**: Handle large datasets
3. **Sort Options**: Sort by date, amount, status
4. **Advanced Actions**: Quick actions like duplicate, delete
5. **Real-time Updates**: WebSocket integration for live updates
6. **Export Options**: PDF/Excel export functionality

## Testing

- ✅ Component renders without errors
- ✅ Switch toggles between quotes and orders
- ✅ Data fetching works correctly
- ✅ Click handlers trigger appropriate callbacks
- ✅ Responsive design maintains layout
- ✅ Loading and error states display properly
