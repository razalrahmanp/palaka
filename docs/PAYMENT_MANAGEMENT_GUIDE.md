# Payment Management Guide

## 🏢 **1. Vendor/Supplier Payments**

### **Using the Existing Vendor Payment System**

#### **Navigation Path:**
```
ERP Dashboard → Vendors → [Select Vendor] → Payment Manager
```

#### **Payment Process:**
1. **Create Purchase Orders**: Record what you're buying
2. **Record Bills**: Link bills to purchase orders
3. **Process Payments**: Individual or bulk payments
4. **Automatic Accounting**: System handles journal entries

#### **Payment Methods Available:**
- **Cash Payment** → Updates Cash Account (1010)
- **Bank Transfer** → Updates Bank Account (1020)
- **UPI Payment** → Updates UPI Account (1025)
- **Cheque** → Updates Bank Account (1020)

#### **Automatic Journal Entries:**
```
Dr. Accounts Payable (2100)    ₹10,000
    Cr. Cash/Bank (1010/1020)          ₹10,000
```

### **Alternative: Using Expense System for Quick Vendor Payments**

For immediate vendor payments without formal POs:

1. **Go to**: Finance → Expenses
2. **Select Category**: "Vendor Payment - Raw Materials" or "Vendor Payment - Services"
3. **Enter Details**: Vendor name in description
4. **Payment Method**: Cash/Bank
5. **System Creates**: Automatic journal entries

---

## 💰 **2. Salary & Daily Wages Payment**

### **A. Regular Employee Salaries**

#### **Method 1: Through HR Module**
```
ERP Dashboard → HR → Employees → [Select Employee] → Process Salary
```

#### **Method 2: Through Expense System**
1. **Category**: "Administrative Salaries", "Sales Salaries", or "Management Salaries"
2. **Description**: Employee name and salary period
3. **Amount**: Monthly/weekly salary
4. **Payment Method**: Bank transfer (recommended)

**Journal Entry:**
```
Dr. Administrative Salaries (6200)  ₹50,000
    Cr. Bank Account (1020)                ₹50,000
```

### **B. Daily Wages & Temporary Workers**

#### **New Categories Added:**
- **Daily Wages - Construction** (6207)
- **Daily Wages - Loading** (6208)
- **Daily Wages - Cleaning** (6209)
- **Contract Labor** (6210)
- **Overtime Payment** (6211)
- **Temporary Staff** (6212)

#### **Process:**
1. **Go to**: Finance → Expenses → New Expense
2. **Select Category**: Appropriate daily wage category
3. **Description**: Worker name, work details, days worked
4. **Amount**: Daily rate × days worked
5. **Payment Method**: Usually cash

**Example Journal Entry:**
```
Dr. Daily Wages - Loading (6208)    ₹2,400
    Cr. Cash (1010)                        ₹2,400
```

**Sample Entries:**
```
Description: "Ramesh - Loading work - 3 days @ ₹800/day"
Amount: ₹2,400
Category: Daily Wages - Loading

Description: "Contract cleaning staff - Weekly wages"
Amount: ₹5,600
Category: Contract Labor
```

---

## 🚗 **3. Adding New Expense Categories**

### **Vehicle Fleet Management Example**

#### **New Categories Added:**

| Category | Account Code | Type | Usage |
|----------|-------------|------|-------|
| Vehicle Fuel - Truck 001 | 6810 | Variable | Track fuel for specific vehicle |
| Vehicle Fuel - Truck 002 | 6811 | Variable | Track fuel for specific vehicle |
| Vehicle Maintenance - Truck 001 | 6813 | Variable | Maintenance costs per vehicle |
| Driver Salaries | 6818 | Fixed | Driver payment |
| Vehicle Parking & Tolls | 6819 | Variable | Daily operational costs |

#### **Usage Examples:**

**Fuel Tracking:**
```
Category: Vehicle Fuel - Truck 001
Description: "Diesel - 50L @ ₹75/L - Odometer: 45,230 km"
Amount: ₹3,750
Date: 2024-01-15
```

**Maintenance Tracking:**
```
Category: Vehicle Maintenance - Truck 001
Description: "Engine oil change + filter replacement"
Amount: ₹4,500
Vendor: ABC Auto Service
```

**Driver Salary:**
```
Category: Driver Salaries
Description: "Rajesh Kumar - Monthly salary"
Amount: ₹25,000
Payment Method: Bank Transfer
```

### **How to Add More Categories**

#### **Step 1: Update subcategoryMap in types/index.ts**
```typescript
// Add new categories to subcategoryMap
"Vehicle Fuel - New Truck": { category: "Vehicle Fleet", type: "Variable", accountCode: "6820" },
"Equipment Rental - Crane": { category: "Equipment Rental", type: "Variable", accountCode: "6950" },
"Project Expenses - Site A": { category: "Project Tracking", type: "Variable", accountCode: "6960" },
```

#### **Step 2: Update journalHelper.ts**
```typescript
// Add new category mapping
const categoryToAccountMap: { [key: string]: string } = {
  // ... existing categories
  'Equipment Rental': '6950',
  'Project Tracking': '6960',
};
```

#### **Step 3: Database Account Creation**
The system automatically creates chart of accounts when first used, but you can pre-create:

```sql
INSERT INTO chart_of_accounts (account_code, account_name, account_type, normal_balance, parent_code)
VALUES 
('6950', 'Equipment Rental', 'EXPENSE', 'DEBIT', '6000'),
('6960', 'Project Tracking', 'EXPENSE', 'DEBIT', '6000');
```

---

## 📊 **4. Reporting & Tracking**

### **Vehicle Expense Report Example**
```sql
-- Get all vehicle expenses for a specific truck
SELECT 
  e.date,
  e.subcategory,
  e.description,
  e.amount,
  e.payment_method
FROM expenses e
WHERE e.subcategory LIKE 'Vehicle%Truck 001%'
ORDER BY e.date DESC;
```

### **Daily Wages Summary**
```sql
-- Monthly daily wages summary
SELECT 
  EXTRACT(MONTH FROM date) as month,
  SUM(CASE WHEN subcategory = 'Daily Wages - Construction' THEN amount ELSE 0 END) as construction_wages,
  SUM(CASE WHEN subcategory = 'Daily Wages - Loading' THEN amount ELSE 0 END) as loading_wages,
  SUM(amount) as total_daily_wages
FROM expenses
WHERE subcategory LIKE 'Daily Wages%'
AND date >= '2024-01-01'
GROUP BY EXTRACT(MONTH FROM date);
```

### **Vendor Payment Summary**
```sql
-- Vendor payment summary
SELECT 
  v.name as vendor_name,
  SUM(p.amount) as total_paid,
  COUNT(p.id) as payment_count
FROM vendors v
JOIN payments p ON v.id = p.vendor_id
GROUP BY v.name;
```

---

## 🔧 **5. Best Practices**

### **For Vendor Payments:**
- Always create purchase orders for better tracking
- Use specific payment references
- Reconcile bank statements regularly

### **For Salary & Wages:**
- Maintain employee records for regular staff
- Use consistent naming for temporary workers
- Track overtime separately
- Ensure tax compliance for salary payments

### **For New Categories:**
- Use descriptive category names
- Follow consistent naming patterns
- Assign appropriate account codes
- Document category purposes

### **General Guidelines:**
- Always enter detailed descriptions
- Use proper payment methods
- Regular backups of expense data
- Monthly reconciliation with bank statements

---

## 🚀 **Quick Start Examples**

### **Scenario 1: Pay supplier for raw materials**
```
1. Go to: Vendors → [Supplier Name] → Payment Manager
2. Select outstanding bill
3. Enter payment amount
4. Choose payment method
5. Submit → Automatic journal entry created
```

### **Scenario 2: Pay daily wage worker**
```
1. Go to: Finance → Expenses → New Expense
2. Category: "Daily Wages - Loading"
3. Description: "Mohan - Loading work - 2 days @ ₹900/day"
4. Amount: ₹1,800
5. Payment Method: Cash
6. Submit → Expense recorded with journal entry
```

### **Scenario 3: Track vehicle fuel**
```
1. Go to: Finance → Expenses → New Expense
2. Category: "Vehicle Fuel - Truck 001"
3. Description: "Petrol - 40L @ ₹105/L - Trip to Mumbai"
4. Amount: ₹4,200
5. Payment Method: Cash
6. Submit → Vehicle expense tracked
```

This system provides comprehensive tracking while maintaining proper accounting standards and audit trails.
