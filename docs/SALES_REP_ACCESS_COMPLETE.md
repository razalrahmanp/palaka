# Sales Representative Dashboard - Access Guide

## 🎯 **How to Access the Sales Representative Dashboard**

The Sales Representative Dashboard can be accessed in several ways depending on your user role and preferences.

## 📍 **Access Methods**

### **Method 1: Direct URL Access**
Simply navigate directly to:
```
http://localhost:3001/sales/representative
```
*Note: Server is currently running on port 3001*

### **Method 2: Through Main Sales Page** ⭐ *RECOMMENDED*
1. **Login** with a Sales Representative account
2. Navigate to **Sales** from the main sidebar menu
3. You'll see a **"My Dashboard"** button in the top-right corner of the Sales page
4. Click **"My Dashboard"** to access your personal sales representative dashboard

### **Method 3: From Main Navigation**
1. **Login** to the application at: `http://localhost:3001/login`
2. Click **"Sales"** in the main sidebar navigation
3. Look for the **"My Dashboard"** button (visible only to Sales Representatives)

## 🔐 **Access Requirements**

### **User Role Requirement:**
- You must be logged in with a user account that has the **"Sales Representative"** role
- Other roles (Sales Manager, System Administrator, etc.) cannot access this dashboard

### **Authentication Flow:**
1. The system automatically checks your role when you access the page
2. If you don't have the correct role, you'll see an "Access Denied" message
3. Only users with "Sales Representative" role can see the dashboard content

## 🎨 **Dashboard Features Available**

Once you access the dashboard, you'll have tabs for:

- **📦 My Orders** - View and manage your assigned orders
- **👥 My Customers** - Manage your customer relationships  
- **🔄 Returns & Exchanges** - Handle product returns and exchanges
- **📞 Complaints** - Resolve customer complaints
- **📈 Performance** - View your sales performance metrics

## 🔧 **Troubleshooting**

### **"Access Denied" Error:**
- **Cause:** Your user account doesn't have "Sales Representative" role
- **Solution:** Contact your system administrator to verify/update your role

### **"My Dashboard" Button Not Visible:**
- **Cause:** You're not logged in as a Sales Representative
- **Solution:** Ensure you're logged in with the correct user account

### **Page Not Loading:**
- **Cause:** Development server might not be running
- **Solution:** Ensure the server is running on port 3001

## 📱 **Navigation Tips**

### **From Sales Page:**
```
Main Navigation → Sales → My Dashboard (top-right button)
```

### **Direct Access:**
```
Browser URL → http://localhost:3001/sales/representative
```

### **Role-Based UI:**
- The "My Dashboard" button only appears for Sales Representatives
- Sales Managers and Administrators see different navigation options
- Other roles won't see sales representative specific features

## 🚀 **Quick Start Guide**

1. **Login:** Use your Sales Representative credentials
2. **Navigate:** Go to Sales page from main menu
3. **Access:** Click "My Dashboard" button in the header
4. **Explore:** Use the tabs to navigate between different sections
5. **Manage:** Handle orders, customers, returns, complaints, and view performance

---

**Last Updated:** August 2, 2025  
**Access URL:** `http://localhost:3001/sales/representative`  
**Required Role:** Sales Representative
