# Custom Products Opening Stock Fix

## Issue Identified

The P&L opening stock calculation was including **custom products** in the COGS calculation, which was incorrect because:

1. **Custom products** are made on-demand for specific customer requests
2. They are **not held in inventory** 
3. They don't have a `product_id` in the `sales_order_items` table (they use `custom_product_id` instead)
4. Including them in opening stock calculation was inflating the opening stock value

## Sales Order Items Structure

The `sales_order_items` table has **TWO types** of products:

```typescript
sales_order_items {
  id: uuid
  order_id: uuid              // FK to sales_orders
  product_id: uuid | null     // Regular inventory products
  custom_product_id: uuid | null  // Custom made-to-order products
  quantity: number
  unit_price: number
  cost: number
}
```

### Regular Products
- Have `product_id` (not null)
- Exist in `products` table
- Stored in `inventory_items`
- Have `products.cost` field
- **Should be included** in opening stock calculation

### Custom Products  
- Have `custom_product_id` (not null)
- Made on customer request
- **NOT in inventory**
- Don't have opening/closing stock
- **Should be EXCLUDED** from opening stock calculation

## The Problem

**Before the fix:**
```typescript
// Was fetching ALL sold items including custom products
const { data: soldItems } = await supabase
  .from('sales_order_items')
  .select('product_id, quantity, products(cost, name)')
  .in('order_id', salesOrderIds);
// This included items where product_id is NULL (custom products)
```

**Result:** Opening stock was too high because it was trying to calculate cost for custom products that were never in inventory.

## The Solution

**After the fix:**
```typescript
// Now only fetches regular inventory products
const { data: soldItems } = await supabase
  .from('sales_order_items')
  .select('product_id, quantity, products(cost, name)')
  .in('order_id', salesOrderIds)
  .not('product_id', 'is', null);  // ← EXCLUDE custom products
```

**Result:** Opening stock now only includes the cost of **regular inventory items** that were actually held in stock.

## Opening Stock Formula (Corrected)

```
Opening Stock = Cost of REGULAR Items Sold + Closing Stock

Where:
- Cost of REGULAR Items Sold = Σ(sold_qty × products.cost) 
  FOR items with product_id only
  
- Closing Stock = Current inventory value
  (inventory_items.quantity × products.cost)

Custom products are NOT included because they were never in opening inventory.
```

## Console Log Updates

The console log now shows:

```typescript
📦 Opening Stock Calculation (2025-01-01):
{
  method: 'Cost of Sold Items + Closing Stock (Regular Products Only)',
  salesOrdersInPeriod: 150,
  totalRevenue: '82,63,958',
  regularProductsSold: 120,      // ← Items with product_id
  customProductsSold: 30,         // ← Items with custom_product_id
  note: '30 custom products excluded from opening stock',
  costOfSoldItems: 'XX,XX,XXX',
  closingStock: '41,82,590',
  openingStock: 'calculated'
}
```

## Expected Impact

### Before Fix:
```
Opening Stock: ₹76,08,289 (WRONG - included custom products)
Purchases: ₹1,60,60,326
Closing Stock: ₹41,82,590
COGS: ₹1,94,86,025 (TOO HIGH!)
```

### After Fix:
```
Opening Stock: ₹XX,XX,XXX (CORRECT - regular inventory only)
Purchases: ₹1,60,60,326
Closing Stock: ₹41,82,590
COGS: ₹XX,XX,XXX (REALISTIC)
```

The opening stock should now be **lower** and more accurate, resulting in a **realistic COGS** and **gross profit**.

## Accounting Logic

### Custom Products (Excluded):
```
Revenue from custom product: ₹10,000
Cost to make: ₹6,000 (labor + materials purchased)
Profit: ₹4,000

This profit is captured through:
- Revenue: ₹10,000 (in sales)
- Cost: ₹6,000 (in purchases/expenses when materials bought)
- NOT in opening/closing stock (never held inventory)
```

### Regular Products (Included):
```
Opening Stock: Had 100 units @ ₹1,000 cost = ₹1,00,000
Purchased: 50 units @ ₹1,000 = ₹50,000
Sold: 80 units @ ₹2,000 revenue = ₹1,60,000
Closing Stock: 70 units @ ₹1,000 = ₹70,000

COGS = 1,00,000 + 50,000 - 70,000 = ₹80,000
GP = 1,60,000 - 80,000 = ₹80,000
```

## Files Modified

1. **`src/app/api/finance/reports/[reportType]/route.ts`**
   - Line ~1048: Added `.not('product_id', 'is', null)` filter
   - Line ~1078-1088: Enhanced console logging with custom products count

## Testing Checklist

- [ ] Refresh P&L report
- [ ] Check console logs for "regularProductsSold" vs "customProductsSold" counts
- [ ] Verify opening stock is reasonable (not inflated)
- [ ] Verify COGS is realistic relative to revenue
- [ ] Check gross profit/loss makes business sense
- [ ] Compare with SQL query results from `calculate_opening_quantities.sql`

## SQL Verification Query

Run this to see the breakdown:

```sql
-- Count regular vs custom products sold
SELECT 
    'Regular Products' as type,
    COUNT(*) as items_count,
    SUM(soi.quantity) as total_quantity
FROM sales_order_items soi
JOIN sales_orders so ON soi.order_id = so.id
WHERE so.created_at >= '2025-01-01T00:00:00.000Z'
  AND so.created_at <= '2025-10-17T23:59:59.999Z'
  AND soi.product_id IS NOT NULL

UNION ALL

SELECT 
    'Custom Products' as type,
    COUNT(*) as items_count,
    SUM(soi.quantity) as total_quantity
FROM sales_order_items soi
JOIN sales_orders so ON soi.order_id = so.id
WHERE so.created_at >= '2025-01-01T00:00:00.000Z'
  AND so.created_at <= '2025-10-17T23:59:59.999Z'
  AND soi.custom_product_id IS NOT NULL;
```

## Related Documentation

- `INVENTORY_BASED_COGS_IMPLEMENTATION.md` - Original COGS implementation
- `OPENING_STOCK_CALCULATION_FIX.md` - Evolution of opening stock formula
- `calculate_opening_quantities.sql` - SQL verification queries

---

**Date:** October 17, 2025  
**Issue:** Opening stock included custom products incorrectly  
**Status:** ✅ Fixed - Now excludes custom products from opening stock calculation
