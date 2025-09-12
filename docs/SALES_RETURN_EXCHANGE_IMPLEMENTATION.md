# Sales Return and Exchange Feature Implementation Guide

## Overview
This implementation adds Return and Exchange functionality to the billing system, allowing users to process returns and exchanges directly from the sales order items in the billing interface.

## Features Implemented

### 1. UI Components
- **Return Button** (🔄): Blue icon for returning products
- **Exchange Button** (↔️): Green icon for exchanging products  
- **Return/Exchange Dialog**: Modal interface for processing returns and exchanges

### 2. Database Schema Enhancements
- Enhanced `returns` table with sales representative tracking and value fields
- Updated `return_items` table to link with sales order items
- Added inventory update function for automatic stock management

### 3. Inventory Management
- **Regular Products**: Automatically added back to inventory on return
- **Custom Products**: No inventory update (as specified)
- **Exchange Process**: Return old product, deduct new product from inventory

## How It Works

### User Flow
1. User selects a sales order from the right sidebar in billing
2. Sales order items load in the invoice section
3. For each item, user sees three buttons:
   - **Delete** (🗑️): Remove from current list
   - **Return** (🔄): Process product return
   - **Exchange** (↔️): Process product exchange

### Return Process
1. Click Return button → Opens Return/Exchange dialog
2. Select "Return Product" 
3. Provide reason and condition notes
4. Submit → Creates return record and updates inventory (for regular products)
5. Item is removed from current billing list

### Exchange Process
1. Click Exchange button → Opens Return/Exchange dialog
2. Select "Exchange Product"
3. Provide reason for exchange
4. Submit → Creates exchange record
5. System processes return of old product
6. User can then add new product to the order

## Database Schema Changes

### Enhanced Returns Table
```sql
ALTER TABLE public.returns 
ADD COLUMN sales_representative_id uuid REFERENCES public.users(id),
ADD COLUMN return_value numeric DEFAULT 0,
ADD COLUMN cost_value numeric DEFAULT 0,
ADD COLUMN created_by uuid REFERENCES public.users(id);
```

### Enhanced Return Items Table
```sql
ALTER TABLE public.return_items
ADD COLUMN sales_order_item_id uuid REFERENCES public.sales_order_items(id),
ADD COLUMN unit_price numeric DEFAULT 0,
ADD COLUMN is_custom_product boolean DEFAULT false,
ADD COLUMN custom_product_id uuid REFERENCES public.custom_products(id);
```

### Inventory Update Function
```sql
CREATE OR REPLACE FUNCTION update_inventory_quantity(
  p_product_id uuid,
  p_quantity_change integer
) RETURNS void AS $$
-- Function automatically updates inventory and logs adjustments
```

## API Endpoints

### 1. Create Return/Exchange
- **POST** `/api/sales/returns/create`
- Creates return record and updates inventory
- Handles both return and exchange types

### 2. Update Inventory
- **POST** `/api/inventory/update-for-returns`
- Updates inventory quantities for returns/exchanges
- Calls database function for stock adjustments

## File Structure

```
src/
├── components/billing/
│   ├── InvoiceBillingDashboard.tsx (enhanced)
│   └── ReturnExchangeDialog.tsx (new)
├── app/api/
│   ├── sales/returns/create/route.ts (new)
│   └── inventory/update-for-returns/route.ts (new)
└── database/
    └── inventory_update_function.sql (new)
```

## Integration Points

### 1. Billing Component Integration
- Added Return/Exchange buttons to product list
- Integrated dialog state management
- Connected to existing sales order loading system

### 2. Inventory System Integration
- Automatic inventory updates for regular products
- Respect for custom product rules (no inventory tracking)
- Stock adjustment logging

### 3. Sales Representative Tracking
- Links returns to the sales rep who created the order
- Enables tracking of return patterns by rep
- Supports performance analysis

## Business Rules

### Product Types
- **Regular Products**: Tracked in inventory, quantity restored on return
- **Custom Products**: Not tracked in inventory, no quantity changes

### Return Types
- **Return**: Product returned, refund processed, inventory updated
- **Exchange**: Old product returned, new product selection required

### Permissions
- Only users with billing access can process returns/exchanges
- Sales representative information automatically captured
- Audit trail maintained for all transactions

## Usage Instructions

### For End Users
1. Load a sales order in the billing interface
2. Locate the product to return/exchange
3. Click the appropriate button (Return 🔄 or Exchange ↔️)
4. Fill in the required information in the dialog
5. Submit to process the return/exchange

### For Administrators
- Monitor returns through the returns table
- Track return patterns by sales representative
- Review inventory adjustments in stock_adjustments table
- Analyze return reasons for quality improvement

## Technical Notes

### Error Handling
- Validation for required fields (reason)
- Database transaction safety
- Inventory update error recovery
- User feedback through toast notifications

### Performance Considerations
- Minimal additional UI elements (small icon buttons)
- Efficient database queries
- Async processing for inventory updates
- Client-side validation to reduce server calls

## Future Enhancements

### Potential Additions
1. **Return Approval Workflow**: Multi-step approval process
2. **Return Analytics Dashboard**: Visualize return patterns
3. **Automated Refund Processing**: Integration with payment systems
4. **Return Label Generation**: Shipping labels for physical returns
5. **Quality Control Integration**: Link returns to quality issues

### Configuration Options
- Return time limits
- Approval thresholds
- Automatic vs manual inventory updates
- Return reason categories

## Support and Maintenance

### Monitoring
- Track return/exchange volume
- Monitor inventory accuracy
- Review error logs
- Analyze performance metrics

### Troubleshooting
- Check database connectivity for inventory updates
- Verify sales order data loading
- Validate return record creation
- Test dialog state management

This implementation provides a robust foundation for sales returns and exchanges while maintaining data integrity and providing clear audit trails for business analysis.