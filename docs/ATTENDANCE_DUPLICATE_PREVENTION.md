# Attendance Processing - Duplicate Prevention

## Overview
The attendance processing system has multiple layers of duplicate prevention to ensure data integrity.

## Duplicate Prevention Mechanisms

### 1. Database Level (Recommended - Run First)
**File**: `database/add_attendance_unique_constraint.sql`

Adds a unique constraint on `attendance_records` table:
- Constraint: `attendance_records_employee_date_unique`
- Columns: `(employee_id, date)`
- Effect: Database will prevent duplicate records at the lowest level

**How to apply**:
1. Go to Supabase Dashboard → SQL Editor
2. Paste the content of `add_attendance_unique_constraint.sql`
3. Run the query
4. Constraint will be added (or skip if already exists)

### 2. Application Level - Upsert Logic
**File**: `src/app/api/hr/attendance/process/route.ts`

The process API uses PostgreSQL's UPSERT functionality:
```typescript
.upsert({
  employee_id: employeeId,
  date: targetDate,
  // ... other fields
}, {
  onConflict: 'employee_id,date',
  ignoreDuplicates: false // Update if exists
});
```

**Behavior**:
- If record exists for (employee_id, date) → UPDATE with new values
- If record doesn't exist → INSERT new record
- No duplicates possible

### 3. Punch Log Processing Prevention
**File**: `src/app/api/hr/attendance/process/route.ts`

Punch logs are marked as processed to prevent reprocessing:
```typescript
// Only fetch unprocessed punch logs
.eq('processed', false)

// After processing, mark as processed
.update({ processed: true })
```

**Behavior**:
- Each punch log is only processed once
- Re-running "Process Attendance" won't duplicate data
- Safe to click multiple times

## How It Works - Complete Flow

### Step 1: ESSL Device Sync
1. User clicks "Sync Attendance" in Biometric Devices page
2. System fetches punch logs from ESSL device
3. Punch logs inserted into `attendance_punch_logs` table
4. Each punch log has `processed = false` initially
5. Unique constraint prevents duplicate punch logs: `(employee_id, device_id, punch_time)`

### Step 2: Process Attendance
1. User clicks "Process Attendance" button
2. System finds all unprocessed punch logs (`processed = false`)
3. Groups by date and employee
4. For each employee per date:
   - Find first IN punch (check-in)
   - Find last OUT punch (check-out)
   - Calculate total hours
   - Determine status (present/late/half_day)
   - **UPSERT** into attendance_records (no duplicates!)
5. Mark processed punch logs as `processed = true`

### Step 3: Display
1. Attendance page shows all records from `attendance_records`
2. Calendar shows attendance by date
3. Clicking date filters to that specific day

## Safety Features

### ✅ Can Run Multiple Times Safely
- Processing same date multiple times → Updates existing record
- Punch logs already processed → Skipped (marked as processed)
- Device sync multiple times → Prevented by punch log unique constraint

### ✅ Database Integrity
- Unique constraint at database level (employee_id, date)
- Cannot have 2 attendance records for same employee on same date
- PostgreSQL enforces this at the lowest level

### ✅ Application Logic
- Upsert instead of insert (prevents duplicates)
- Processed flag on punch logs (prevents reprocessing)
- All-or-nothing transactions (no partial data)

## Testing Duplicate Prevention

### Test 1: Process Same Date Twice
```
1. Click "Process Attendance" (processes all dates)
2. Check attendance_records count: N records
3. Click "Process Attendance" again
4. Check attendance_records count: Still N records (no duplicates)
```

### Test 2: Sync Device Twice
```
1. Sync from ESSL device (e.g., 100 punch logs)
2. Check punch_logs count: 100 records
3. Sync again from same device
4. Check punch_logs count: Still 100 records (duplicates prevented)
```

### Test 3: Concurrent Processing
```
1. Open 2 browser tabs
2. Click "Process Attendance" in both tabs simultaneously
3. Result: Unique constraint ensures no duplicates
```

## Verification Queries

### Check for Duplicate Attendance Records
```sql
SELECT 
  employee_id,
  date,
  COUNT(*) as record_count
FROM attendance_records
GROUP BY employee_id, date
HAVING COUNT(*) > 1;
```
**Expected Result**: Empty (no duplicates)

### Check for Duplicate Punch Logs
```sql
SELECT 
  employee_id,
  device_id,
  punch_time,
  COUNT(*) as log_count
FROM attendance_punch_logs
GROUP BY employee_id, device_id, punch_time
HAVING COUNT(*) > 1;
```
**Expected Result**: Empty (no duplicates)

### Check Processing Status
```sql
SELECT 
  processed,
  COUNT(*) as count
FROM attendance_punch_logs
GROUP BY processed;
```
**Expected Result**:
- `true`: All previously processed logs
- `false`: New unprocessed logs (or empty if all processed)

## What to Do If You See Duplicates

### If Duplicates in attendance_records
```sql
-- 1. Find duplicates
SELECT employee_id, date, COUNT(*) as count
FROM attendance_records
GROUP BY employee_id, date
HAVING COUNT(*) > 1;

-- 2. Delete duplicates (keeps latest record)
DELETE FROM attendance_records a
USING attendance_records b
WHERE a.id < b.id
AND a.employee_id = b.employee_id
AND a.date = b.date;

-- 3. Add unique constraint
-- Run: database/add_attendance_unique_constraint.sql
```

### If Duplicates in punch_logs
```sql
-- Already has unique constraint, but if needed:
DELETE FROM attendance_punch_logs a
USING attendance_punch_logs b
WHERE a.id < b.id
AND a.employee_id = b.employee_id
AND a.device_id = b.device_id
AND a.punch_time = b.punch_time;
```

## Summary

**3 Layers of Protection**:
1. 🛡️ Database unique constraint (strongest)
2. 🛡️ Application upsert logic (smart updates)
3. 🛡️ Processed flag (prevents reprocessing)

**Result**: No duplicates possible even if:
- Process button clicked multiple times
- Sync device multiple times
- Multiple users processing simultaneously
- System crashes mid-processing

The system is **safe and idempotent** - running the same operation multiple times produces the same result without creating duplicates.
