# 📱 WhatsApp Bill Sending - User Guide

## ✅ What's New: WhatsApp Integration

The Al Rams ERP system now supports sending professional bills directly to customers via WhatsApp! This feature is available in both the **Sales Orders** section and the **Finance Module**.

## 🚀 How to Send Bills via WhatsApp

### Method 1: From Sales Orders Page
1. Navigate to **Sales** → **Orders** tab
2. Find the order you want to send
3. Click the **📱 WhatsApp** button on the order card
4. The system will:
   - Fetch complete order details from the database
   - Format a professional bill message
   - Either send via WhatsApp Business API or open web.whatsapp.com

### Method 2: From Finance Module  
1. Navigate to **Finance** → **Sales Orders & Invoice Management**
2. Find the order in the list
3. Click the **💬 message icon** in the Actions column
4. The bill will be sent to the customer's phone number

## 🖨️ How to Print Bills

### Print from Sales Orders:
1. Go to **Sales** → **Orders** tab
2. Click the **🖨️ Print** button on any order card
3. A professional invoice will open in a new window
4. Click the print button or use Ctrl+P

### Print from Finance Module:
1. Go to **Finance** → **Sales Orders & Invoice Management**  
2. Click the **🖨️ printer icon** in the Actions column
3. Professional invoice opens ready for printing

## 📋 What Information is Included

The WhatsApp bill includes:
- **Company header**: AL RAMS FURNITURE
- **Order details**: Order number, date, status
- **Customer information**: Name, phone, address
- **Itemized list**: Product names, quantities, pricing
- **Total amounts**: Subtotal and final amount
- **Company contact**: Phone number for queries

## 📞 Customer Requirements

For WhatsApp sending to work:
- ✅ Customer must have a **phone number** in their profile
- ✅ Phone number should be properly formatted
- ✅ Customer profile should be complete

## ⚙️ Setup Requirements

### Option A: WhatsApp Business API (Production)
Configure these environment variables in `.env.local`:
```env
WHATSAPP_BUSINESS_API_URL=https://graph.facebook.com/v17.0
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

### Option B: Web WhatsApp (Works Immediately)
- No configuration needed!
- Opens web.whatsapp.com with pre-formatted message
- User manually sends the message
- Perfect for immediate use and testing

## ❗ Troubleshooting

### "Customer phone number not found"
**Solution**: Update the customer's profile to include a valid phone number

### "Failed to send WhatsApp message"
**Solution**: 
1. Check if customer phone number is valid
2. Ensure WhatsApp Business API is configured (or use web fallback)
3. Try again - the system will fall back to web.whatsapp.com

### "Error printing bill"
**Solution**:
1. Check if order has valid customer and item data
2. Ensure browser allows pop-ups
3. Try refreshing the page and attempting again

### Customer name shows as "(unknown)" or ID
**Solution**:
1. Verify customer data exists in the database
2. Check that order is properly linked to customer
3. Refresh the data by clicking the refresh button

## 💡 Tips for Best Results

1. **Complete Customer Profiles**: Ensure all customers have:
   - Full name
   - Valid phone number (with country code)
   - Complete address

2. **Order Data**: Verify orders contain:
   - Proper product names
   - Correct pricing information
   - Valid customer linkage

3. **WhatsApp Setup**: 
   - For production, set up WhatsApp Business API
   - For testing, web.whatsapp.com works perfectly

4. **Phone Number Format**: 
   - Include country code (e.g., +91 9876543210)
   - System auto-formats numbers for WhatsApp compatibility

## 🎯 Quick Test

1. Create a test order with complete customer information
2. Click the WhatsApp button
3. Verify the message format and content
4. Send a test message to yourself

## 📝 Sample WhatsApp Message

```
🧾 AL RAMS FURNITURE - INVOICE

📋 Order #: ORD12345678
📅 Date: 19/08/2025

👤 Customer Details:
Name: John Doe
Address: 123 Main Street, Mumbai, India

🛋️ Items Ordered:
------------------------------
1. Luxury Sofa Set
   Qty: 2 × ₹29,999.00 = ₹59,998.00
   SKU: SOF-001

------------------------------
💰 Total Amount: ₹59,998.00

✅ Status: CONFIRMED

📞 Contact us for any queries
Thank you for choosing Al Rams Furniture! 🏡
```

---

## 🆘 Need Help?

If you encounter any issues:
1. Check this guide first
2. Verify customer data is complete
3. Test with web.whatsapp.com option
4. Contact system administrator for API configuration

**The WhatsApp integration is now live and ready to use!** 🎉
