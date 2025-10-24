# ESSL Biometric Device Integration

Complete integration guide for connecting your ESSL fingerprint device (SN: NFZ8242502197) to the ERP system.

## Device Configuration

**Your Device Details:**
- IP Address: `192.168.1.121`
- Gateway: `192.168.1.1`
- Port: `4370` (ZKTeco standard TCP port)
- Device Type: ESSL Fingerprint Scanner

## Quick Start

### 1. Test Device Connection

Run the test script to verify the device is accessible:

```powershell
npx ts-node scripts/test-essl-device.ts
```

This will:
- Connect to the device
- Fetch device information
- List enrolled users
- Show recent attendance logs

### 2. Register Device in Database

Use the API to register your device:

```powershell
# Using curl (if available)
curl -X POST http://localhost:3000/api/essl/devices -H "Content-Type: application/json" -d "{\"device_name\":\"Main Office Scanner\",\"ip_address\":\"192.168.1.121\",\"port\":4370,\"location\":\"Front Entrance\",\"device_type\":\"fingerprint\"}"
```

Or use Postman/Thunder Client with:
- **URL:** `POST http://localhost:3000/api/essl/devices`
- **Body:**
```json
{
  "device_name": "Main Office Scanner",
  "ip_address": "192.168.1.121",
  "port": 4370,
  "location": "Front Entrance",
  "device_type": "fingerprint"
}
```

### 3. Link Employees to Device

Each employee needs their device user ID set in the database:

```sql
-- Example: Update employee with their device user ID
UPDATE employees 
SET essl_device_id = '1' 
WHERE employee_id = 'EMP001';
```

The `essl_device_id` should match the user ID enrolled in the biometric device.

### 4. Sync Attendance Data

Sync attendance logs from device to database:

```powershell
# Using API (replace DEVICE_ID with the UUID from registration)
curl -X POST http://localhost:3000/api/essl/sync-attendance -H "Content-Type: application/json" -d "{\"deviceId\":\"YOUR_DEVICE_ID\",\"clearAfterSync\":false}"
```

## API Endpoints

### Test Connection
```
POST /api/essl/test-connection
Body: { "ip": "192.168.1.121", "port": 4370 }
```

### List Devices
```
GET /api/essl/devices
```

### Register Device
```
POST /api/essl/devices
Body: {
  "device_name": "string",
  "ip_address": "string",
  "port": 4370,
  "location": "string",
  "device_type": "fingerprint"
}
```

### Sync Attendance
```
POST /api/essl/sync-attendance
Body: {
  "deviceId": "uuid",
  "clearAfterSync": false  // true to clear device logs after sync
}
```

### Update Device
```
PATCH /api/essl/devices
Body: {
  "id": "uuid",
  "status": "active" | "inactive" | "maintenance"
}
```

### Delete Device
```
DELETE /api/essl/devices?id=uuid
```

## Database Schema

Your database already has these tables:

### essl_devices
Stores registered biometric devices
- `id` - Unique device identifier
- `device_name` - Friendly name
- `device_serial` - Device serial number
- `ip_address` - Network IP
- `port` - TCP port (default 4370)
- `location` - Physical location
- `device_type` - fingerprint/face/rfid/hybrid
- `status` - active/inactive/maintenance
- `last_connected` - Last successful connection
- `enrolled_users` - Number of enrolled users
- `firmware_version` - Device firmware

### attendance_punch_logs
Raw punch logs from the device
- `id` - Log entry ID
- `employee_id` - FK to employees
- `device_id` - FK to essl_devices
- `punch_time` - Timestamp of punch
- `punch_type` - IN/OUT/BREAK
- `verification_method` - fingerprint/face/card/password
- `verification_quality` - Quality score (1-100)
- `device_user_id` - User ID from device
- `raw_data` - Original device data (JSON)
- `processed` - Whether log is processed into attendance_records

### attendance_records
Processed daily attendance records
- `id` - Record ID
- `employee_id` - FK to employees
- `date` - Attendance date
- `check_in_time` - First IN punch
- `check_out_time` - Last OUT punch
- `total_hours` - Calculated hours
- `status` - present/absent/half_day/late/on_leave
- `device_id` - FK to essl_devices

### device_sync_logs
Audit trail for sync operations
- `id` - Log ID
- `device_id` - FK to essl_devices
- `sync_type` - attendance/employee/full
- `sync_status` - started/completed/failed
- `records_synced` - Number of records synced
- `sync_duration` - Duration in seconds
- `error_message` - Error details if failed
- `sync_timestamp` - When sync occurred

## Troubleshooting

### Connection Failed

**Problem:** Cannot connect to device

**Solutions:**
1. Verify IP address:
   ```powershell
   ping 192.168.1.121
   ```
   Note: Device may not respond to ping even when working

2. Check device menu:
   - Menu → Comm → Ethernet
   - Verify IP: 192.168.1.121
   - Verify Port: 4370
   - Ensure TCP/IP is enabled

3. Test TCP port:
   ```powershell
   Test-NetConnection -ComputerName 192.168.1.121 -Port 4370
   ```

4. Check firewall:
   - Windows Firewall may block port 4370
   - Add inbound rule for port 4370

### No Attendance Logs

**Problem:** Sync returns 0 records

**Solutions:**
1. Verify employees have `essl_device_id` set
2. Check device has punch logs (Menu → Attendance Logs)
3. Ensure device user IDs match `essl_device_id` in database

### Employee Not Found

**Problem:** Logs skipped because employee not found

**Solutions:**
1. Get device user IDs:
   ```powershell
   npx ts-node scripts/test-essl-device.ts
   ```
2. Update employee records:
   ```sql
   UPDATE employees 
   SET essl_device_id = 'DEVICE_USER_ID' 
   WHERE employee_id = 'EMP_ID';
   ```

### Network Issues

**Problem:** Device on different subnet or behind NAT

**Solutions:**
1. **Option A:** Static route (if both devices on same LAN)
   ```powershell
   route add 192.168.1.0 mask 255.255.255.0 192.168.1.1
   ```

2. **Option B:** Port forwarding (if device is remote)
   - Configure router to forward external port to 192.168.1.121:4370

3. **Option C:** VPN/Tunnel
   - Use VPN to connect to device network

## Automated Sync (Optional)

### Schedule with Windows Task Scheduler

1. Create a PowerShell script `sync-attendance.ps1`:
```powershell
$deviceId = "YOUR_DEVICE_UUID_HERE"
$apiUrl = "http://localhost:3000/api/essl/sync-attendance"

$body = @{
    deviceId = $deviceId
    clearAfterSync = $false
} | ConvertTo-Json

Invoke-RestMethod -Uri $apiUrl -Method POST -Body $body -ContentType "application/json"
```

2. Schedule task to run every hour:
```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\path\to\sync-attendance.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At "9:00AM" -RepetitionInterval (New-TimeSpan -Hours 1)
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "ESSL Attendance Sync" -Description "Sync attendance from ESSL device"
```

### Schedule with Node.js Cron (Recommended)

Create `scripts/attendance-cron.ts`:
```typescript
import cron from 'node-cron';

// Run every hour
cron.schedule('0 * * * *', async () => {
  const response = await fetch('http://localhost:3000/api/essl/sync-attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: 'YOUR_DEVICE_UUID',
      clearAfterSync: false
    })
  });
  const result = await response.json();
  console.log('Sync completed:', result);
});
```

## Security Best Practices

1. **Network Security:**
   - Keep device on private VLAN
   - Use firewall rules to restrict access
   - Only allow server IP to connect to port 4370

2. **Data Protection:**
   - Regular backups of attendance data
   - Audit logs enabled (already in database)
   - Encrypted connections (if device supports HTTPS)

3. **Access Control:**
   - Restrict API endpoints with authentication
   - Role-based access for sync operations
   - Monitor sync logs for anomalies

## Support

- **Device Manual:** Check ESSL documentation for your model
- **ZKTeco Protocol:** Device uses standard ZKTeco SDK protocol
- **Library Documentation:** https://github.com/alikuxac/zklib-js
- **API Testing:** Use Postman collection (import from `/docs/api`)

## Next Steps

1. ✅ Device connected and tested
2. ⏳ Register device in database
3. ⏳ Set employee `essl_device_id` values
4. ⏳ Run first attendance sync
5. ⏳ Verify data in attendance_records table
6. ⏳ Set up automated sync schedule
7. ⏳ Monitor sync logs for errors
