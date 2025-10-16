# Asset Management System Implementation

## 📋 Overview

This document describes the comprehensive asset management system added to the application, including fixed assets tracking, purchases, disposals, depreciation, and integration with the cash flow statement.

---

## 🗃️ Database Schema

### Tables Created

#### 1. **asset_categories**
Categorizes assets with default depreciation settings.

**Columns:**
- `id` - Serial primary key
- `category_name` - Unique category name
- `description` - Category description
- `depreciation_method` - Method: straight_line, declining_balance, units_of_production, no_depreciation
- `default_useful_life` - Default lifespan in months
- `default_salvage_percentage` - Default salvage value percentage
- `chart_account_code` - Link to chart of accounts
- `is_active` - Active status
- `created_at`, `updated_at` - Timestamps

**Default Categories:**
- Land (non-depreciable)
- Buildings (360 months, 10% salvage)
- Machinery & Equipment (120 months, 5% salvage)
- Vehicles (60 months, 15% salvage)
- Furniture & Fixtures (84 months, 10% salvage)
- Computer Equipment (36 months, 5% salvage)
- Software (36 months, 0% salvage)
- Office Equipment (60 months, 10% salvage)
- Leasehold Improvements (120 months, 0% salvage)

---

#### 2. **assets** (Fixed Assets Register)
Main table tracking all company assets.

**Key Features:**
- Unique asset tags (e.g., AST-2025-001)
- Purchase information (date, supplier, price, reference)
- Depreciation settings (method, useful life, salvage value)
- Current status tracking (active, under_maintenance, retired, disposed, sold, donated, scrapped)
- Location and assignment tracking
- Insurance and warranty tracking
- Serial numbers, model numbers, manufacturer details

**Calculated Fields:**
- `current_book_value` - Current value after depreciation
- `accumulated_depreciation` - Total depreciation to date

**Integration:**
- Links to `suppliers` for purchase tracking
- Links to `employees` for asset assignment
- Links to `users` for audit trail

---

#### 3. **asset_purchases**
Transaction log for all asset acquisitions.

**Cost Breakdown:**
- `asset_cost` - Base cost of the asset
- `installation_cost` - Installation expenses
- `freight_cost` - Shipping/transportation
- `other_costs` - Miscellaneous costs
- `total_cost` - Auto-calculated sum

**Payment Tracking:**
- Payment method (cash, bank_transfer, cheque, credit_card, loan, lease)
- Payment status (pending, partial, paid, financed)
- Amount paid and balance due (auto-calculated)
- Links to bank accounts and loans

**Features:**
- Invoice and PO number tracking
- Document attachments (JSONB)
- Created by audit trail

---

#### 4. **asset_disposals**
Records of asset sales, donations, and disposals.

**Disposal Types:**
- Sale
- Donation
- Scrap
- Trade-in
- Theft
- Destruction
- Obsolete

**Financial Tracking:**
- Original cost
- Accumulated depreciation at disposal
- Book value (auto-calculated)
- Sale price (if applicable)
- Gain/loss on disposal (auto-calculated)

**Approval Workflow:**
- Approved by user
- Approval date
- Reason for disposal
- Disposal certificate reference

**Auto-Update Trigger:**
Updates asset status when disposal record is created.

---

#### 5. **asset_depreciation_schedule**
Monthly depreciation calculation schedule.

**Period Tracking:**
- Year and month
- Period start and end dates
- Opening book value
- Depreciation amount
- Accumulated depreciation
- Closing book value

**Accounting Integration:**
- `is_posted` - Whether depreciation has been posted
- `journal_entry_id` - Link to journal entry
- `posted_date` - When posted
- `posted_by` - User who posted

**Unique Constraint:**
One depreciation entry per asset per month.

---

#### 6. **asset_maintenance_log**
Maintenance and repair history for assets.

**Maintenance Types:**
- Routine
- Preventive
- Corrective
- Emergency
- Inspection
- Upgrade

**Cost Tracking:**
- Labor cost
- Parts cost
- Other costs
- Total cost (auto-calculated)

**Service Provider:**
- Internal or external
- Vendor linkage
- Invoice tracking

**Scheduling:**
- Maintenance date
- Next maintenance date
- Status (scheduled, in_progress, completed, cancelled)

---

## 💰 Expense Categories Added

### New Capital Expenditure Categories

The following categories were added to the `expenses` table:

```
Capital Expenditure Categories:
├── Capital Expenditure (General)
├── Asset Purchase (General)
├── Equipment Purchase
├── Vehicle Purchase
├── Property Purchase
├── Building Purchase
├── Machinery Purchase
├── Furniture Purchase
├── Computer Equipment Purchase
├── Software Purchase
├── Asset Improvement
└── Asset Installation
```

### Integration with subcategoryMap

**Property Purchase:**
- Land Purchase (Account: 1210)
- Building Purchase (Account: 1220)
- Building Construction (Account: 1220)
- Leasehold Improvements (Account: 1290)

**Machinery & Equipment:**
- Machinery Purchase (Account: 1230)
- Production Equipment (Account: 1230)
- Manufacturing Equipment (Account: 1230)
- Equipment Installation (Account: 1230)
- Equipment Upgrade (Account: 1230)

**Vehicles:**
- Vehicle Purchase (Account: 1240)
- Delivery Vehicle Purchase (Account: 1240)
- Company Car Purchase (Account: 1240)
- Truck Purchase (Account: 1240)

**Furniture & Fixtures:**
- Office Furniture Purchase (Account: 1250)
- Showroom Furniture (Account: 1250)
- Factory Furniture (Account: 1250)

**Computer Equipment:**
- Computer Purchase (Account: 1260)
- Laptop Purchase (Account: 1260)
- Server Purchase (Account: 1260)
- Network Equipment (Account: 1260)

**Software:**
- Software License Purchase (Account: 1270)
- ERP System (Account: 1270)
- Accounting Software (Account: 1270)

**Office Equipment:**
- Office Equipment Purchase (Account: 1280)
- Printer Purchase (Account: 1280)
- Scanner Purchase (Account: 1280)
- Photocopier Purchase (Account: 1280)

---

## 📊 Cash Flow Statement Integration

### Investing Activities Section

**Updated to fetch from:**

1. **Cash paid for purchase of assets:**
   - Source: `expenses` table
   - Categories: All capital expenditure categories listed above
   - Date range: Within reporting period

2. **Cash received from sale of assets:**
   - Source: `asset_disposals` table
   - Filter: `disposal_type = 'sale'`
   - Field: `sale_price`
   - Date range: Within reporting period

**Calculation:**
```
Net Investing Cash Flow = Cash from Asset Sales - Cash Paid for Assets
```

---

## 🔧 Database Views Created

### 1. **view_active_assets**
Summary of all active assets with current values.

**Columns:**
- Asset details (tag, name, category)
- Purchase information
- Current book value
- Accumulated depreciation
- Total depreciation
- Location and assignment

### 2. **view_asset_depreciation_by_category**
Depreciation summary grouped by category.

**Metrics:**
- Asset count per category
- Total cost
- Total depreciation
- Total book value

### 3. **view_monthly_depreciation**
Monthly depreciation totals for accounting.

**Metrics:**
- Period date
- Number of assets
- Total depreciation amount
- Opening and closing values

---

## 🔄 Triggers Implemented

### 1. **update_asset_timestamp()**
Automatically updates `updated_at` timestamp when asset record is modified.

### 2. **update_asset_on_disposal()**
Automatically updates asset status when disposal record is created:
- Sale → status: 'sold'
- Donation → status: 'donated'
- Scrap → status: 'scrapped'
- Other → status: 'disposed'

---

## 🚀 Implementation Steps

### 1. Run the Migration

```bash
# Execute the migration SQL file
psql -U your_username -d your_database -f database/asset_management_migration.sql
```

Or use Supabase Dashboard:
1. Go to SQL Editor
2. Paste the contents of `asset_management_migration.sql`
3. Click "Run"

### 2. Verify Tables Created

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'asset%';
```

Expected tables:
- asset_categories
- assets
- asset_purchases
- asset_disposals
- asset_depreciation_schedule
- asset_maintenance_log

### 3. Verify Expense Categories

```sql
SELECT category, COUNT(*) as count
FROM expenses
WHERE category LIKE '%Purchase%' OR category LIKE 'Capital%'
GROUP BY category;
```

### 4. Test Cash Flow Statement

```bash
# Test API endpoint
curl "http://localhost:3000/api/finance/reports/cash-flow?start_date=2025-01-01&end_date=2025-10-16"
```

Check Investing Activities section for non-zero values if capital expenditure exists.

---

## 📝 Usage Guide

### Adding a New Asset

1. **Record the Expense:**
   - Go to Expenses
   - Add new expense with capital expenditure category
   - Example: "Machinery Purchase"
   - Amount, date, description, payment method

2. **Create Asset Record:**
   - Navigate to Assets Management (when UI is built)
   - Create asset with:
     - Asset tag (auto-generated)
     - Category
     - Purchase details
     - Depreciation settings

3. **Track Depreciation:**
   - System auto-calculates monthly depreciation
   - Review depreciation schedule
   - Post to journal entries as needed

### Recording Asset Disposal

1. **Create Disposal Record:**
   - Select asset to dispose
   - Choose disposal type (sale, donation, scrap, etc.)
   - If sale: Enter sale price
   - Provide reason and approval

2. **Automatic Updates:**
   - Asset status updates automatically
   - Gain/loss calculated automatically
   - Cash flow statement reflects sale proceeds

### Expense Dialog Usage

**To record capital expenditure:**

1. Click "Add Expense"
2. Select Category dropdown
3. Search or scroll to capital expenditure categories:
   - "Capital Expenditure"
   - "Equipment Purchase"
   - "Vehicle Purchase"
   - "Property Purchase"
   - etc.
4. Select appropriate subcategory from the expanded list
5. Fill in amount, date, payment method
6. Save

**The expense will now appear in:**
- Expense reports
- Cash Flow Statement (Investing Activities)
- Ledgers
- Financial statements

---

## 🎯 Benefits

### 1. **Complete Asset Lifecycle Tracking**
- Purchase to disposal
- Depreciation calculation
- Maintenance history
- Location and assignment

### 2. **Accurate Financial Reporting**
- Cash Flow Statement accuracy
- Balance Sheet fixed asset values
- P&L depreciation expenses
- Asset disposal gains/losses

### 3. **Audit Trail**
- Created by tracking
- Timestamp tracking
- Approval workflows
- Document attachments

### 4. **Business Insights**
- Asset utilization
- Maintenance costs by asset
- Depreciation by category
- Disposal trends

---

## 📌 Next Steps

### Recommended UI Development

1. **Assets Management Page**
   - List all assets with filters
   - Add/Edit/View asset details
   - Asset disposal workflow
   - Depreciation schedule viewer

2. **Asset Dashboard**
   - Total asset value
   - Depreciation summary
   - Upcoming maintenance
   - Assets by category chart

3. **Reports**
   - Fixed Asset Register
   - Depreciation Schedule Report
   - Asset Disposal Report
   - Maintenance Cost Report

### API Endpoints to Create

```typescript
// Assets CRUD
GET    /api/finance/assets
POST   /api/finance/assets
PATCH  /api/finance/assets/[id]
DELETE /api/finance/assets/[id]

// Asset Purchases
GET    /api/finance/asset-purchases
POST   /api/finance/asset-purchases

// Asset Disposals
GET    /api/finance/asset-disposals
POST   /api/finance/asset-disposals

// Depreciation
GET    /api/finance/depreciation-schedule
POST   /api/finance/depreciation/calculate
POST   /api/finance/depreciation/post

// Maintenance
GET    /api/finance/asset-maintenance
POST   /api/finance/asset-maintenance
```

---

## ⚠️ Important Notes

1. **Expense Table Constraint:**
   - The expense category CHECK constraint was updated
   - Existing expenses remain unchanged
   - New expenses can use new categories

2. **Asset Disposals Table:**
   - Currently may not exist until migration is run
   - Cash Flow will return 0 for asset sales until populated
   - No errors will occur, gracefully handles missing data

3. **Depreciation:**
   - Manual calculation required initially
   - Implement automated monthly job for production
   - Review and post to journal entries manually

4. **Permissions:**
   - Adjust RLS policies as needed
   - Grant appropriate user permissions
   - Restrict disposal approval to managers

---

## 🔍 Troubleshooting

### Cash Flow Shows ₹0 for Investing Activities

**Causes:**
1. No capital expenditure expenses in date range
2. Migration not run (asset_disposals table doesn't exist)
3. No asset sales in period

**Solutions:**
1. Add test capital expenditure
2. Run migration SQL
3. Verify date range

### Expense Category Not Showing

**Causes:**
1. Migration not run
2. Database constraint not updated
3. Frontend subcategoryMap not updated

**Solutions:**
1. Run migration SQL file
2. Check ALTER TABLE command executed
3. Verify src/types/index.ts updated

---

## 📚 References

- SQL Migration File: `database/asset_management_migration.sql`
- Type Definitions: `src/types/index.ts` (subcategoryMap)
- Cash Flow API: `src/app/api/finance/reports/[reportType]/route.ts`
- Expense Dialog: `src/components/finance/SalesOrderInvoiceManager.tsx`

---

**Created:** October 16, 2025
**Version:** 1.0
**Status:** ✅ Complete
