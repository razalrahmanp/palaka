# Accounting Concepts Guide: Journal Entries, Ledger, and New Entry Forms

## 1. What is a Journal vs. Ledger?

### **Journal (Journal Entries)**
The **journal** is the **"book of original entry"** in accounting - it's where all business transactions are **first recorded** in chronological order.

**Think of it like a diary for your business money:**
- **Date**: When the transaction happened
- **Description**: What happened (e.g., "Sold furniture to customer")
- **Accounts**: Which accounts are affected
- **Amounts**: How much money moved

**Example Journal Entry:**
```
Date: August 5, 2025
Description: Sold dining table to customer for ₹50,000 cash

Accounts:
- Cash (Debit): ₹50,000      [Money coming in]
- Sales Revenue (Credit): ₹50,000   [Revenue earned]
```

### **Ledger (General Ledger)**
The **ledger** is like **individual account files** - it takes journal entries and **organizes them by account**.

**Think of it like sorting your diary entries into folders:**
- All cash transactions go to "Cash Account" folder
- All sales transactions go to "Sales Revenue Account" folder
- Each account shows its running balance

**Example Ledger Account:**
```
CASH ACCOUNT
Date        Description              Debit    Credit   Balance
Aug 1      Opening balance                             ₹10,000
Aug 5      Furniture sale          ₹50,000            ₹60,000
Aug 6      Rent payment                     ₹15,000   ₹45,000
```

### **Simple Analogy:**
- **Journal** = Your daily spending diary
- **Ledger** = Your bank account statements (sorted by category)

---

## 2. Why Are There Two "New Entry" Buttons?

You're seeing two "New Entry" buttons because they appear in **different locations** for **convenience**:

### **Location 1: Main Navigation Tab**
- **Where**: Top navigation tabs: `Dashboard | Journal Entries | Chart of Accounts | Financial Reports | New Entry`
- **Purpose**: Always accessible from anywhere in the accounting system

### **Location 2: Dashboard Quick Actions**
- **Where**: Top-right corner of the accounting dashboard
- **Purpose**: Quick access when viewing the dashboard

**Both buttons do the same thing** - they open the **Journal Entry Form**.

---

## 3. What Does the "New Entry" Form Do?

The **New Entry form** is where you **record business transactions** using double-entry accounting.

### **What Happens When You Create a New Entry:**

#### **Step 1: Transaction Details**
You enter:
- **Date**: When the transaction occurred
- **Reference Number**: Invoice number, receipt number, etc.
- **Description**: What happened

#### **Step 2: Account Lines (Double-Entry)**
For each transaction, you must:
- **Select accounts** that are affected
- **Enter amounts** for debits and credits
- **Ensure debits = credits** (accounting equation)

#### **Step 3: Save or Post**
- **Save as Draft**: Stores the entry but doesn't affect account balances
- **Post Entry**: Makes it official and updates all account balances

### **Real-World Example:**

**Scenario**: You sold a sofa for ₹30,000 cash

**New Entry Form:**
```
Date: August 5, 2025
Reference: INV-001
Description: Sold sofa to customer

Lines:
1. Cash Account (Debit): ₹30,000
2. Sales Revenue (Credit): ₹30,000

Total Debits: ₹30,000
Total Credits: ₹30,000
Status: ✅ Balanced
```

**What Happens After Posting:**
1. **Cash Account** balance increases by ₹30,000
2. **Sales Revenue** balance increases by ₹30,000
3. **Balance Sheet** updates automatically
4. **Income Statement** updates automatically
5. **Financial Reports** reflect the new transaction

---

## 4. Common Transaction Types You'll Record

### **Sales Transactions**
```
Customer pays cash for furniture:
- Debit: Cash ₹25,000
- Credit: Sales Revenue ₹25,000
```

### **Purchase Transactions**
```
Buy wood for furniture making:
- Debit: Materials Cost ₹15,000
- Credit: Cash ₹15,000
```

### **Expense Transactions**
```
Pay monthly rent:
- Debit: Rent Expense ₹20,000
- Credit: Cash ₹20,000
```

### **Loan Transactions**
```
Take a business loan:
- Debit: Cash ₹100,000
- Credit: Long Term Loans ₹100,000
```

---

## 5. Why Double-Entry Accounting?

### **The Golden Rule**: Debits = Credits
Every transaction affects **at least two accounts**, and the total debits must equal total credits.

### **Benefits:**
1. **Error Detection**: If debits ≠ credits, you know there's a mistake
2. **Complete Picture**: Shows both sides of every transaction
3. **Balance Sheet Always Balances**: Assets = Liabilities + Equity
4. **Audit Trail**: Complete record of all financial activities

---

## 6. Your Furniture Business Accounting Workflow

### **Daily Operations:**
1. **Make a sale** → Create journal entry (Cash + Sales Revenue)
2. **Buy materials** → Create journal entry (Materials Cost + Cash/Accounts Payable)
3. **Pay expenses** → Create journal entry (Expense Accounts + Cash)
4. **Pay salaries** → Create journal entry (Labor Cost + Cash)

### **Monthly Tasks:**
1. **Review Journal Entries** → Check all transactions are recorded
2. **Check Ledger Balances** → Verify account balances are correct
3. **Generate Reports** → Balance Sheet, Income Statement, etc.
4. **Sync Inventory** → Update inventory values in accounting

### **The Complete Flow:**
```
Transaction Happens → Record in Journal → Update Ledger → Generate Reports
     ↓                      ↓               ↓              ↓
Sell furniture     →   Journal Entry   →  Account      →  Financial
Buy materials          (New Entry       →  Balances       Reports
Pay expenses           Form)            →  Update         Show results
```

---

## 7. Practical Tips for Your ERP System

### **When to Use "New Entry":**
- ✅ Recording sales transactions
- ✅ Recording purchase transactions  
- ✅ Recording expense payments
- ✅ Recording loan transactions
- ✅ Adjusting entries for corrections

### **Best Practices:**
1. **Enter transactions daily** - don't let them pile up
2. **Use clear descriptions** - "Sold dining table INV-001" is better than "Sale"
3. **Keep reference numbers** - link to invoices, receipts, etc.
4. **Review before posting** - drafts can be edited, posted entries cannot
5. **Check balance regularly** - ensure debits = credits always

### **Your System Integration:**
- **Inventory sync** automatically creates journal entries when stock values change
- **Sales module** can auto-generate journal entries for sales transactions
- **Purchase module** can auto-generate journal entries for supplier payments
- **Manual entries** for expenses, adjustments, and other transactions

---

This guide should help you understand how journal entries work in your furniture ERP system and why the accounting module is structured this way. The "New Entry" form is your primary tool for recording all business transactions in a systematic, auditable way.
