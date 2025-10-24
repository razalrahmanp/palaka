# ESSL Biometric Device Management UI Guide

## Overview
The ESSL Device Management interface provides a complete visual workflow for managing biometric devices, mapping employees to device users, and synchronizing attendance data. All operations that were previously done via scripts are now available through an intuitive web interface.

## Accessing the Interface

Navigate to: **HR → Biometric Devices** or directly at `/hr/devices`

## Interface Layout

### Dashboard Statistics
The top section displays four key metrics:
- **Total Devices**: Number of registered ESSL devices
- **Active Devices**: Devices currently online and connected
- **Enrolled Users**: Total fingerprints across all devices
- **Mapped Employees**: Employees linked to device user IDs

### Three Main Tabs

## Tab 1: Devices

### Purpose
Manage all registered ESSL biometric devices

### Features

#### 1. Device Registration
**Steps:**
1. Click **"Add Device"** button (top right)
2. Fill in device details:
   - **Device Name** (required): e.g., "Main Office Biometric Scanner"
   - **IP Address** (required): Device IP (e.g., 192.168.1.71)
   - **Port** (required): Default 4370
   - **Location** (optional): Physical location (e.g., "Front Entrance")
3. Click **"Test Connection"** to verify device is reachable
4. If test succeeds, click **"Register Device"**

**What Happens:**
- System connects to device and retrieves device info
- Device saved to `essl_devices` table
- Device appears in devices list with "active" status

#### 2. Device List View
Each device shows:
- Device name and serial number
- IP address and port
- Location
- Status badge (active/inactive/error)
- Number of enrolled users
- Last connection timestamp

#### 3. Device Actions
Three action buttons per device:

**a) Fetch Users (👥 Icon)**
- Retrieves all enrolled users from the device
- Shows user IDs available for employee mapping
- Populates the mapping dropdown in Tab 2

**b) Sync Attendance (🔄 Icon)**
- Syncs all attendance logs from device to database
- Creates entries in `attendance_punch_logs`
- Shows success message with sync statistics
- Creates sync log entry for audit trail

**c) Delete Device (🗑️ Icon)**
- Removes device from system
- Requires confirmation
- **Warning**: Does not delete associated attendance data

## Tab 2: Employee Mapping

### Purpose
Map your employees to device user IDs for automatic attendance sync

### Workflow

#### Step 1: Select Device
1. Use the **"Select Device to Fetch Users"** dropdown
2. Choose the device containing the users you want to map
3. System automatically fetches enrolled users from device

**Expected Output:**
```
Found 23 users on device
```

#### Step 2: Search Employees (Optional)
Use the search box to filter employees by:
- Employee name
- Employee ID
- Department

#### Step 3: Map Employees
**Mapping Table Columns:**
1. **Employee**: Name and employee ID
2. **Department**: Employee's department
3. **Current Device ID**: Shows if already mapped (badge) or "Not mapped"
4. **Map to Device User**: Dropdown with device user IDs
5. **Status**: Visual indicator (Mapped ✓ or Unmapped ⚠️)

**To Map an Employee:**
1. Find the employee row
2. Click the **"Map to Device User"** dropdown
3. Select the corresponding device user ID
4. System automatically saves the mapping
5. Status badge updates to "Mapped" with green checkmark

**To Unmap an Employee:**
1. Click the dropdown for the employee
2. Select "Unmap" (first option)
3. Mapping is removed

**Important Notes:**
- Device user IDs are numeric (1, 2, 3, 5, 6, etc.)
- Some devices show user names, others only show IDs
- You need to identify which device ID corresponds to which employee
- Mapped employees will have attendance automatically synced

#### Identifying Device Users

**Method 1: Physical Verification**
1. Have employee punch in/out on device
2. Note the ID shown on device screen
3. Map that ID to the employee

**Method 2: Test Sync**
1. Sync attendance once
2. Check the unmapped punch logs in database
3. Match timestamps to known employee schedules

**Method 3: Device Display Names**
Some ESSL devices store names. If available, they'll show in the dropdown:
```
ID: 13 - John Doe
ID: 11 - Jane Smith
```

## Tab 3: Sync Logs

### Purpose
View history of all attendance synchronization operations

### Information Displayed

**Table Columns:**
1. **Device**: Which device was synced
2. **Sync Type**: "attendance" (future: "users", "system")
3. **Status**: 
   - ✓ **Completed** (green): Sync finished successfully
   - ✗ **Failed** (red): Error occurred
   - ⏳ **Started** (yellow): In progress
4. **Records Synced**: Number of attendance logs imported
5. **Records Skipped**: Logs skipped (duplicates or unmapped users)
6. **Duration**: How long the sync took (seconds)
7. **Timestamp**: When sync was initiated

### Reading Sync Results

**Example Success:**
```
Device: Main Office Biometric Scanner
Status: completed (green)
Records Synced: 9,415
Records Skipped: 0
Duration: 12.3s
```

**Example Partial Sync:**
```
Device: Main Office Biometric Scanner
Status: completed (green)
Records Synced: 8,200
Records Skipped: 1,215
Duration: 11.8s
```
*Skipped records likely due to unmapped employees*

**Example Failure:**
```
Device: Main Office Biometric Scanner
Status: failed (red)
Records Synced: 0
Records Skipped: 0
Error: Device connection timeout
```

## Complete Workflow Example

### Scenario: Setting up a new ESSL device

#### Phase 1: Device Registration (5 minutes)
1. Navigate to HR → Biometric Devices
2. Click "Add Device"
3. Enter details:
   - Name: "Main Office Scanner"
   - IP: 192.168.1.71
   - Port: 4370
   - Location: "Front Entrance"
4. Click "Test Connection" → Success message
5. Click "Register Device" → Device appears in list

#### Phase 2: Employee Mapping (15-30 minutes)
1. Switch to "Employee Mapping" tab
2. Select "Main Office Scanner" from dropdown
3. System fetches 23 device users
4. For each employee:
   - Identify their device user ID (via physical verification)
   - Select ID from dropdown
   - Confirm "Mapped" status appears
5. Repeat for all 23 employees

**Time-saving tip:** Start with managers/key personnel, map others over time. Attendance will sync for mapped employees immediately.

#### Phase 3: Initial Sync (2-5 minutes)
1. Switch back to "Devices" tab
2. Click 🔄 (Sync) button for the device
3. Wait for sync to complete
4. Check success message: "Sync completed! 9,415 records synced..."
5. Switch to "Sync Logs" tab to verify

#### Phase 4: Verification (5 minutes)
1. Navigate to HR → Attendance
2. Filter by today's date
3. Verify attendance records appear for mapped employees
4. Check punch times match device logs

#### Phase 5: Ongoing Operations
- **Daily Sync**: Click sync button each morning or evening
- **New Employees**: Add to mapping as they're enrolled
- **Troubleshooting**: Check sync logs for errors

## Troubleshooting

### Problem: Device shows "inactive" or "error" status

**Solutions:**
1. Verify device IP hasn't changed (DHCP reassignment)
2. Check network connectivity:
   - Both server and device on same network
   - Firewall allows port 4370
3. Click sync button to test connection
4. If IP changed, delete and re-register device

### Problem: "Records Skipped" is high after sync

**Cause:** Employees not mapped to device user IDs

**Solution:**
1. Go to "Employee Mapping" tab
2. Check "Status" column for "Unmapped" badges
3. Map the unmapped employees
4. Run sync again

### Problem: Sync takes very long or times out

**Causes:**
- Large number of attendance logs on device
- Slow network connection
- Device processing capacity

**Solutions:**
1. Sync more frequently (daily instead of weekly)
2. After successful sync, consider clearing device logs:
   ```typescript
   // Contact developer to enable clear-after-sync option
   ```
3. Check network speed between server and device

### Problem: Duplicate attendance records

**Cause:** Syncing the same device multiple times without clearing

**Solution:**
- System automatically skips duplicates based on:
  - Device ID + Employee ID + Punch Time
- Safe to sync multiple times
- Duplicates will be skipped with no error

### Problem: Employee not appearing in mapping list

**Cause:** Employee status is not "active"

**Solution:**
1. Go to HR → Employees
2. Find the employee
3. Check "Employment Status"
4. Change to "active" if needed
5. Return to device mapping

### Problem: Attendance records not showing in HR → Attendance

**Cause:** Punch logs not processed into attendance records

**Background:**
- Sync creates `attendance_punch_logs` (raw punches)
- Separate process creates `attendance_records` (daily summaries)

**Solution:**
1. Check `attendance_punch_logs` table for raw data
2. Run attendance processing (if implemented)
3. Or manually verify punch logs in database:
   ```sql
   SELECT * FROM attendance_punch_logs 
   WHERE date(punch_time) = CURRENT_DATE
   ORDER BY punch_time DESC;
   ```

## Database Schema Reference

### Tables Used by UI

**essl_devices**
- Stores registered devices
- Updated on: registration, sync, status changes

**attendance_punch_logs**
- Raw punch data from devices
- Created during sync
- Fields: employee_id, device_id, punch_time, punch_type (IN/OUT/BREAK)

**attendance_records**
- Daily attendance summaries
- Processed from punch_logs
- Fields: employee_id, date, check_in_time, check_out_time, total_hours

**device_sync_logs**
- Audit trail of all syncs
- View in "Sync Logs" tab

**employees.essl_device_id**
- Mapping field
- Updated in "Employee Mapping" tab

## Security Notes

### Permissions Required
- Access: `employee:manage` permission
- All operations: Same permission (for now)
- Future: Separate permissions for device management

### Network Security
- Devices communicate over TCP (port 4370)
- No encryption by default in ZKTeco protocol
- Recommendation: Use private network/VLAN

### Data Privacy
- Biometric templates stored on device, not in database
- Database stores:
  - User IDs (not fingerprint data)
  - Attendance timestamps
  - Employee mappings

## API Endpoints Used

The UI calls these APIs (for developer reference):

```
GET  /api/essl/devices              - List all devices
POST /api/essl/devices              - Register new device
DELETE /api/essl/devices?id={id}    - Delete device

POST /api/essl/test-connection      - Test device connectivity
POST /api/essl/device-users         - Fetch enrolled users from device
POST /api/essl/sync-attendance      - Sync attendance logs

POST /api/hr/employees/map-device-user - Map employee to device user ID

GET  /api/essl/sync-logs            - Fetch sync history
```

## Best Practices

### 1. Regular Syncing
- **Frequency**: Daily (morning or evening)
- **Timing**: Off-peak hours to avoid network congestion
- **Automation**: Future enhancement (scheduled syncs)

### 2. Employee Mapping
- Map new employees immediately after enrollment
- Verify mapping with test punch
- Keep a spreadsheet backup of mappings

### 3. Device Maintenance
- Monitor "Last Connected" timestamp
- Investigate devices offline for >24 hours
- Test connection monthly
- Update device firmware as needed

### 4. Data Verification
- Spot-check attendance records weekly
- Compare with manual logs
- Investigate discrepancies promptly

### 5. Troubleshooting Process
1. Check "Sync Logs" tab first
2. Verify device status in "Devices" tab
3. Check employee mappings
4. Test device connection
5. Review network connectivity

## Future Enhancements

### Planned Features
- **Scheduled Syncs**: Automatic daily/hourly sync
- **Real-time Monitoring**: Live attendance stream
- **Bulk Mapping**: Import employee mappings from CSV
- **Device Health Dashboard**: Monitor device capacity, firmware, errors
- **Attendance Reports**: Built-in reports in UI
- **Multi-site Support**: Group devices by location/branch
- **Mobile App**: Sync and monitor from mobile device

### Current Limitations
- Manual sync only (no scheduling yet)
- One-by-one employee mapping
- No real-time attendance feed
- No device firmware update from UI

## Support

### Common Questions

**Q: How often should I sync?**
A: Daily is recommended. More frequent if you need real-time data.

**Q: Can I sync from multiple computers?**
A: Yes, any authorized user can initiate sync.

**Q: What happens if I sync twice in a row?**
A: Duplicates are automatically skipped. Safe to sync multiple times.

**Q: Do I need to map all employees at once?**
A: No. Map them gradually. Unmapped employees will be skipped during sync.

**Q: Can I unmap an employee?**
A: Yes. Select "Unmap" from the dropdown in Employee Mapping tab.

**Q: How do I know which device user ID is which employee?**
A: Use physical verification (have employee punch in and note ID shown on device).

**Q: Can I connect multiple devices?**
A: Yes. Register each device separately. They can all sync to same employee database.

### Getting Help

1. **Sync Logs Tab**: Check for error messages
2. **Browser Console**: F12 → Console tab (for technical users)
3. **Database Logs**: Check `device_sync_logs` table
4. **Documentation**: Review `/docs/ESSL_BIOMETRIC_INTEGRATION.md`

---

**Last Updated:** October 24, 2025
**Version:** 1.0
**Tested On:** ESSL Device SN: NFZ8242502197 (IP: 192.168.1.71)
