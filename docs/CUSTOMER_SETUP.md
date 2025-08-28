# Customer Management Setup

## ✅ Current Status
The customer management system is **fully functional** and working correctly. Customers can be created successfully from the billing dashboard.

## Features Implemented

### 1. Complete Customer Form
- **Name** (required)
- **Phone** (required) 
- **Email** (optional)
- **Address** (required) - with geocoding support
- **Floor/Unit** (required)
- **City**, **State**, **Pincode**
- **Status** (Lead/Active/Churned)
- **Source** (Billing System/Website/Referral/etc.)
- **Notes**

### 2. Database Integration
- All fields mapped to database schema
- Proper constraint handling (email uniqueness, foreign keys)
- UUID primary keys
- Audit trail (created_at, updated_at, created_by)

### 3. Geocoding Support
- Automatic address geocoding when Google Maps API is configured
- Stores latitude, longitude, formatted address
- Works without API key (skips geocoding gracefully)

## Setup Instructions

### Google Maps Geocoding (Optional)
To enable automatic address geocoding:

1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the "Geocoding API" service
3. Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` in `.env.local` with your actual key:
   ```
   GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```
4. Restart the development server

### Testing Customer Creation

1. Navigate to `/billing` in your application
2. Click "Add New Customer" 
3. Fill in the required fields:
   - Name: "Test Customer"
   - Phone: "9876543210"
   - Address: "123 Test Street"
   - Floor/Unit: "2nd Floor"
4. Click "Add Customer"

## API Endpoints

- **POST** `/api/crm/customers` - Create new customer
- **GET** `/api/crm/customers/search?q=phone&limit=10` - Search customers

## Database Schema

```sql
-- Key fields in customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  phone VARCHAR,
  email VARCHAR UNIQUE,
  address TEXT,
  floor VARCHAR,
  city VARCHAR,
  state VARCHAR,
  pincode VARCHAR,
  status VARCHAR DEFAULT 'Lead',
  source VARCHAR DEFAULT 'billing_system',
  notes TEXT,
  tags TEXT[],
  latitude DECIMAL,
  longitude DECIMAL,
  formatted_address TEXT,
  geocoded_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  is_deleted BOOLEAN DEFAULT FALSE
);
```

## Troubleshooting

### Common Issues
1. **"Google Maps API key not found"** - This is just a warning. Customer creation still works.
2. **500 Error** - Check server logs for database constraint violations.
3. **Email already exists** - Ensure unique email addresses or leave email field empty.

### Server Logs
Monitor the development server console for detailed error information with enhanced logging.

## Next Steps
The customer management system is ready for production use. Consider:
1. Adding Google Maps API key for geocoding
2. Implementing customer editing functionality
3. Adding customer deletion (soft delete)
4. Customer search and filtering improvements
