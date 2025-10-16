# Quick Guide: Using New Capital Expenditure Categories

## ✅ What Was Done

### 1. Added 40+ Capital Expenditure Subcategories
Located in: `src/types/index.ts` (lines 650-694)

### 2. Updated Expense Dialog UI
Located in: `src/components/finance/SalesOrderInvoiceManager.tsx`

**New Section Added:** 💰 CAPITAL EXPENDITURE & ASSET PURCHASES

This section now appears **above** "Business Expenses" in the expense dialog dropdown.

---

## 🎯 How to See the New Categories

### Option 1: Open Expense Dialog and Search

1. Go to any page with expenses (Finance → Expenses)
2. Click "Add Expense" button
3. In the "Expense Category" dropdown, you'll see:

```
┌─────────────────────────────────────────┐
│ Search categories...                    │
├─────────────────────────────────────────┤
│ CASH MANAGEMENT (green)                 │
│ OWNER'S DRAWINGS (purple)               │
│ 💰 CAPITAL EXPENDITURE & ASSET         │
│    PURCHASES (orange)                   │
│   • Capital Expenditure - General       │
│   • Asset Purchase - General            │
│   • Land Purchase                       │
│   • Building Purchase                   │
│   • Building Construction               │
│   • Leasehold Improvements              │
│   • Machinery Purchase                  │
│   • Production Equipment                │
│   • Manufacturing Equipment             │
│   • Equipment Installation              │
│   • Equipment Upgrade                   │
│   • Vehicle Purchase                    │
│   • Delivery Vehicle Purchase           │
│   • Company Car Purchase                │
│   • Truck Purchase                      │
│   • Office Furniture Purchase           │
│   • Showroom Furniture                  │
│   • Factory Furniture                   │
│   • Computer Purchase                   │
│   • Laptop Purchase                     │
│   • Server Purchase                     │
│   • Network Equipment                   │
│   • Software License Purchase           │
│   • ERP System                          │
│   • Accounting Software                 │
│   • Office Equipment Purchase           │
│   • Printer Purchase                    │
│   • Scanner Purchase                    │
│   • Photocopier Purchase                │
│   • Fixed Asset Addition                │
│ BUSINESS EXPENSES (blue)                │
│   ... (all other expenses)              │
└─────────────────────────────────────────┘
```

### Option 2: Use the Search Box

1. Open expense dialog
2. Type in the search box:
   - "purchase" → Shows all purchase categories
   - "vehicle" → Shows vehicle-related categories
   - "computer" → Shows computer equipment
   - "building" → Shows building purchases
   - "capital" → Shows capital expenditure categories

---

## 📝 Complete List of New Categories

### **Property & Buildings**
| Subcategory | Category | Account Code |
|------------|----------|--------------|
| Land Purchase | Property Purchase | 1210 |
| Building Purchase | Building Purchase | 1220 |
| Building Construction | Building Purchase | 1220 |
| Leasehold Improvements | Asset Improvement | 1290 |

### **Machinery & Equipment**
| Subcategory | Category | Account Code |
|------------|----------|--------------|
| Machinery Purchase | Machinery Purchase | 1230 |
| Production Equipment | Equipment Purchase | 1230 |
| Manufacturing Equipment | Machinery Purchase | 1230 |
| Equipment Installation | Asset Installation | 1230 |
| Equipment Upgrade | Asset Improvement | 1230 |

### **Vehicles**
| Subcategory | Category | Account Code |
|------------|----------|--------------|
| Vehicle Purchase | Vehicle Purchase | 1240 |
| Delivery Vehicle Purchase | Vehicle Purchase | 1240 |
| Company Car Purchase | Vehicle Purchase | 1240 |
| Truck Purchase | Vehicle Purchase | 1240 |

### **Furniture & Fixtures**
| Subcategory | Category | Account Code |
|------------|----------|--------------|
| Office Furniture Purchase | Furniture Purchase | 1250 |
| Showroom Furniture | Furniture Purchase | 1250 |
| Factory Furniture | Furniture Purchase | 1250 |

### **Computer Equipment**
| Subcategory | Category | Account Code |
|------------|----------|--------------|
| Computer Purchase | Computer Equipment Purchase | 1260 |
| Laptop Purchase | Computer Equipment Purchase | 1260 |
| Server Purchase | Computer Equipment Purchase | 1260 |
| Network Equipment | Computer Equipment Purchase | 1260 |

### **Software**
| Subcategory | Category | Account Code |
|------------|----------|--------------|
| Software License Purchase | Software Purchase | 1270 |
| ERP System | Software Purchase | 1270 |
| Accounting Software | Software Purchase | 1270 |

### **Office Equipment**
| Subcategory | Category | Account Code |
|------------|----------|--------------|
| Office Equipment Purchase | Equipment Purchase | 1280 |
| Printer Purchase | Computer Equipment Purchase | 1280 |
| Scanner Purchase | Computer Equipment Purchase | 1280 |
| Photocopier Purchase | Equipment Purchase | 1280 |

### **General Capital Expenditure**
| Subcategory | Category | Account Code |
|------------|----------|--------------|
| Capital Expenditure - General | Capital Expenditure | 1200 |
| Asset Purchase - General | Asset Purchase | 1200 |
| Fixed Asset Addition | Capital Expenditure | 1200 |

---

## 🧪 Testing Steps

### 1. Visual Verification
```bash
# Open the app in browser
http://localhost:3000

# Navigate to Finance section
# Click "Add Expense"
# Check if you see the orange "💰 CAPITAL EXPENDITURE" section
```

### 2. Test Adding Capital Expenditure

**Example: Purchase a Laptop**

1. Click "Add Expense"
2. Select Category: "Laptop Purchase"
3. You'll see:
   - Category: Computer Equipment Purchase
   - Account Code: 1260
   - Type: Fixed
4. Enter amount: 50000
5. Enter date: Today
6. Payment method: Bank Transfer
7. Save

**Result:**
- Expense saved with category "Laptop Purchase"
- Will appear in Cash Flow Statement (Investing Activities)
- Account code 1260 (Computer Equipment Purchase)

---

## 🔍 Troubleshooting

### Issue: Categories Not Showing

**Possible Causes:**
1. Browser cache (press Ctrl+Shift+R to hard refresh)
2. Development server not reloaded

**Solutions:**
```bash
# Restart development server
# Stop current server (Ctrl+C)
npm run dev
```

### Issue: Categories Showing But Not Saving

**Possible Cause:** Database constraint not updated

**Solution:**
```bash
# Run the SQL migration
# See: database/asset_management_migration.sql
```

### Issue: Can't Find a Specific Category

**Use the search box:**
- Type partial names like "laptop", "vehicle", "building"
- Categories are grouped, scroll through the orange section

---

## 📊 Where Categories Appear

### 1. Expense Dialog
✅ Orange section: "💰 CAPITAL EXPENDITURE & ASSET PURCHASES"

### 2. Cash Flow Statement
✅ Investing Activities → "Cash paid for purchase of assets"

### 3. Expenses Table
✅ Filter by category to see all capital expenditure

### 4. Financial Reports
✅ Will be categorized under Fixed Assets (1200-1290)

---

## 💡 Best Practices

### When to Use Capital Expenditure Categories

**Use for:**
- Assets with lifespan > 1 year
- Significant value (typically > ₹10,000)
- Physical assets (land, buildings, equipment)
- Intangible assets (software licenses)

**Examples:**
✅ Laptop purchase (₹50,000) → "Laptop Purchase"
✅ Office desk (₹15,000) → "Office Furniture Purchase"
✅ Delivery van (₹5,00,000) → "Delivery Vehicle Purchase"
✅ ERP software (₹2,00,000) → "ERP System"

**Don't use for:**
❌ Office supplies (₹500) → Use "Office Supplies"
❌ Laptop repair (₹5,000) → Use "Equipment Maintenance"
❌ Software subscription (monthly) → Use "Software Licenses"
❌ Vehicle fuel → Use "Vehicle Fuel"

### Category Selection Guide

**Property:**
- Buying land → "Land Purchase"
- Constructing building → "Building Construction"
- Renovating leased space → "Leasehold Improvements"

**Machinery:**
- New production machine → "Machinery Purchase"
- Installing machine → "Equipment Installation"
- Upgrading machine → "Equipment Upgrade"

**Vehicles:**
- Any company vehicle → "Vehicle Purchase" or specific type

**IT Equipment:**
- Computers/Laptops → "Computer Purchase" / "Laptop Purchase"
- Servers → "Server Purchase"
- Printers → "Printer Purchase"

**Software:**
- One-time license → "Software License Purchase"
- Recurring subscription → "Software Licenses" (Business Expenses)

---

## 🎯 Quick Reference Card

```
CAPITAL EXPENDITURE QUICK CODES:
═══════════════════════════════════════════
1210 → Land Purchase
1220 → Buildings
1230 → Machinery & Equipment
1240 → Vehicles
1250 → Furniture & Fixtures
1260 → Computer Equipment
1270 → Software (Capitalized)
1280 → Office Equipment
1290 → Leasehold Improvements
1200 → General Capital Expenditure
═══════════════════════════════════════════
```

---

**Created:** October 16, 2025
**Status:** ✅ Ready to Use
**Location:** `docs/CAPITAL_EXPENDITURE_QUICK_GUIDE.md`
