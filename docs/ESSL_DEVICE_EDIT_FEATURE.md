# ESSL Device IP Change - Edit Feature

## Problem
When the ESSL device IP changed from `192.168.1.71:4370` to `192.168.1.80:4370`, you couldn't register a new device because:

**Error:**
```
duplicate key value violates unique constraint "essl_devices_device_serial_key"
Key (device_serial)=(Unknown) already exists.
```

**Root Cause:** 
The device serial number "Unknown" was already registered with the old IP address, so you couldn't create a new device record.

---

## ✅ Solution: Edit Device Feature

I've added an **Edit Device** button that allows you to update the IP address and port of existing devices.

### How to Use:

1. **Go to HR → Biometric Devices**
2. **Find the old device** (192.168.1.71:4370)
3. **Click the Edit icon** (pencil icon) in the Actions column
4. **Update the IP address:**
   - Change from: `192.168.1.71`
   - Change to: `192.168.1.80`
5. **Click "Test Connection"** to verify
6. **Click "Update Device"** to save

### What You Can Edit:
- ✅ Device Name
- ✅ IP Address
- ✅ Port
- ✅ Location

**Note:** The device serial number stays the same (it's tied to the physical device).

---

## Features Added

### 1. Edit Button
New pencil icon button in the Actions column of the devices table.

### 2. Edit Dialog
Similar to "Add Device" dialog but:
- Pre-filled with current device information
- Shows current serial number
- Updates existing device instead of creating new one

### 3. API Endpoint
Uses existing `PATCH /api/essl/devices` endpoint to update device details.

---

## Benefits

✅ **No duplicate entries** - Update existing device instead of creating new one
✅ **Preserve history** - All attendance records stay linked to same device
✅ **Easy IP changes** - Handle DHCP or network changes quickly
✅ **Test before saving** - Verify connection works before updating

---

## Why IP Changed?

Your ESSL device IP might have changed because:

1. **DHCP:** Router assigned new IP automatically
2. **Network change:** Device reconnected to different network
3. **Router reset:** New IP range or settings

### Prevent Future IP Changes:

**Option 1: Set Static IP on Device**
- Access ESSL device settings (usually via device menu)
- Set static IP instead of DHCP
- Recommended: `192.168.1.80` (or any fixed IP)

**Option 2: DHCP Reservation on Router**
- Login to your router
- Find DHCP settings
- Reserve IP for device MAC address
- Device always gets same IP

---

## Quick Fix Steps

### If Device IP Changed Again:

1. Click **Edit** on the device
2. Update IP address to new one
3. Test connection
4. Save

**That's it!** No need to delete and re-register.

---

## Database Schema

The `essl_devices` table now allows updates via:

```sql
UPDATE essl_devices
SET 
  ip_address = '192.168.1.80',
  port = 4370,
  device_name = 'Updated Name',
  location = 'Updated Location'
WHERE id = 'device-uuid';
```

---

## Future Improvements

Possible enhancements:

1. **Auto-detect IP change** - Scan network for device serial
2. **IP change notification** - Alert when device IP changes
3. **Multi-IP support** - Allow fallback IPs
4. **DDNS integration** - Use domain name instead of IP

---

Your device is now editable! Just click the Edit button to update the IP address. 🎉
