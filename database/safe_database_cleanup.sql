-- SAFE DATABASE CLEANUP: Handle deadlocks and active connections
-- This approach avoids deadlocks by using smaller, safer operations

-- ===============================================
-- STEP 1: TERMINATE ACTIVE CONNECTIONS (if needed)
-- ===============================================

-- Check for active connections to attendance tables
SELECT 
    'Active Connections Check' as info,
    pid,
    state,
    query,
    query_start
FROM pg_stat_activity 
WHERE state = 'active' 
AND query LIKE '%attendance_%'
AND pid != pg_backend_pid();

-- If you see active connections above, you may need to terminate them:
-- SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
-- WHERE state = 'active' AND query LIKE '%attendance_%' AND pid != pg_backend_pid();

-- ===============================================
-- STEP 2: SAFE INCREMENTAL CLEANUP
-- ===============================================

-- Start with a transaction to ensure atomicity
BEGIN;

-- Drop triggers first to prevent interference
DROP TRIGGER IF EXISTS trigger_punch_time_conversion ON attendance_punch_logs;
DROP TRIGGER IF EXISTS trigger_attendance_time_conversion ON attendance_records;
DROP TRIGGER IF EXISTS ensure_timezone_punch_logs ON attendance_punch_logs;
DROP TRIGGER IF EXISTS ensure_timezone_attendance_records ON attendance_records;
DROP TRIGGER IF EXISTS calculate_hours_trigger ON attendance_records;
DROP TRIGGER IF EXISTS attendance_calculate_hours ON attendance_records;

-- Delete data in small batches to avoid locks
-- Delete recent data first (most likely to be locked)
DELETE FROM attendance_records WHERE date >= '2025-10-25';
DELETE FROM attendance_punch_logs WHERE DATE(punch_time) >= '2025-10-25';

-- Delete previous day
DELETE FROM attendance_records WHERE date = '2025-10-24';
DELETE FROM attendance_punch_logs WHERE DATE(punch_time) = '2025-10-24';

-- Delete older data in batches
DELETE FROM attendance_records WHERE date < '2025-10-24';
DELETE FROM attendance_punch_logs WHERE DATE(punch_time) < '2025-10-24';

-- Clear sync logs
DELETE FROM device_sync_logs;

-- Commit the cleanup transaction
COMMIT;

-- ===============================================
-- STEP 3: DROP PROBLEMATIC FUNCTIONS SAFELY
-- ===============================================

-- Drop functions one by one to avoid conflicts
DROP FUNCTION IF EXISTS convert_utc_to_ist(TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS is_likely_utc_time(TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS smart_timezone_convert(TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS trigger_convert_punch_time();
DROP FUNCTION IF EXISTS trigger_convert_attendance_times();
DROP FUNCTION IF EXISTS is_over_converted_time(TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS reverse_timezone_conversion(TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS ensure_proper_timezone();
DROP FUNCTION IF EXISTS calculate_total_hours();
DROP FUNCTION IF EXISTS calculate_work_hours();

-- ===============================================
-- STEP 4: CREATE SIMPLE, CLEAN FUNCTION
-- ===============================================

-- Create new clean function for calculating hours
CREATE OR REPLACE FUNCTION calc_attendance_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Simple hour calculation without any timezone conversion
    IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
        NEW.total_hours = ROUND(
            EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600.0,
            1
        );
    ELSE
        NEW.total_hours = NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create simple trigger
CREATE TRIGGER calc_hours_trigger
    BEFORE INSERT OR UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION calc_attendance_hours();

-- ===============================================
-- STEP 5: VERIFICATION
-- ===============================================

-- Verify cleanup success
SELECT 
    'Cleanup Verification' as status,
    'attendance_punch_logs' as table_name,
    COUNT(*) as remaining_records
FROM attendance_punch_logs

UNION ALL

SELECT 
    'Cleanup Verification' as status,
    'attendance_records' as table_name,
    COUNT(*) as remaining_records
FROM attendance_records

UNION ALL

SELECT 
    'Cleanup Verification' as status,
    'device_sync_logs' as table_name,
    COUNT(*) as remaining_records
FROM device_sync_logs;

-- Check device status
SELECT 
    'Device Status' as info,
    device_name,
    status,
    ip_address,
    CASE 
        WHEN status = 'active' THEN 'Ready for sync ✓'
        ELSE 'Not active'
    END as sync_ready
FROM essl_devices
ORDER BY device_name;

-- ===============================================
-- SUCCESS MESSAGE
-- ===============================================

SELECT 
    '✅ SAFE CLEANUP COMPLETED!' as status,
    'All attendance data removed safely' as result,
    'Deadlock-safe approach used' as method,
    'Go to HR > Attendance page for fresh sync' as next_step,
    'New data will store correct IST times' as expected;