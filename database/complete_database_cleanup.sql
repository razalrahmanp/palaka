-- COMPREHENSIVE DATABASE CLEANUP: Remove ALL attendance data for fresh start
-- This will clean all punch logs and attendance records completely

-- ===============================================
-- STEP 1: SHOW CURRENT DATA COUNT (BEFORE CLEANUP)
-- ===============================================

SELECT 'BEFORE CLEANUP - Data Count' as status;

SELECT 
    'attendance_punch_logs' as table_name,
    COUNT(*) as total_records,
    MIN(DATE(punch_time))::text as earliest_date,
    MAX(DATE(punch_time))::text as latest_date
FROM attendance_punch_logs

UNION ALL

SELECT 
    'attendance_records' as table_name,
    COUNT(*) as total_records,
    MIN(date)::text as earliest_date,
    MAX(date)::text as latest_date
FROM attendance_records

UNION ALL

SELECT 
    'device_sync_logs' as table_name,
    COUNT(*) as total_records,
    MIN(DATE(sync_timestamp))::text as earliest_date,
    MAX(DATE(sync_timestamp))::text as latest_date
FROM device_sync_logs;

-- ===============================================
-- STEP 2: COMPLETE DATABASE CLEANUP
-- ===============================================

-- Remove ALL attendance data (complete clean slate)
DELETE FROM attendance_records;
DELETE FROM attendance_punch_logs;
DELETE FROM device_sync_logs;

-- ===============================================
-- STEP 3: VERIFY CLEANUP COMPLETE
-- ===============================================

SELECT 'AFTER CLEANUP - Verification' as status;

SELECT 
    'attendance_punch_logs' as table_name,
    COUNT(*) as remaining_records,
    CASE 
        WHEN COUNT(*) = 0 THEN 'CLEANED ✓'
        ELSE 'CLEANUP FAILED ❌'
    END as cleanup_status
FROM attendance_punch_logs

UNION ALL

SELECT 
    'attendance_records' as table_name,
    COUNT(*) as remaining_records,
    CASE 
        WHEN COUNT(*) = 0 THEN 'CLEANED ✓'
        ELSE 'CLEANUP FAILED ❌'
    END as cleanup_status
FROM attendance_records

UNION ALL

SELECT 
    'device_sync_logs' as table_name,
    COUNT(*) as remaining_records,
    CASE 
        WHEN COUNT(*) = 0 THEN 'CLEANED ✓'
        ELSE 'CLEANUP FAILED ❌'
    END as cleanup_status
FROM device_sync_logs;

-- ===============================================
-- STEP 4: DROP ALL PROBLEMATIC TIMEZONE FUNCTIONS/TRIGGERS
-- ===============================================

-- Remove all timezone conversion triggers
DROP TRIGGER IF EXISTS trigger_punch_time_conversion ON attendance_punch_logs;
DROP TRIGGER IF EXISTS trigger_attendance_time_conversion ON attendance_records;
DROP TRIGGER IF EXISTS ensure_timezone_punch_logs ON attendance_punch_logs;
DROP TRIGGER IF EXISTS ensure_timezone_attendance_records ON attendance_records;
DROP TRIGGER IF EXISTS calculate_hours_trigger ON attendance_records;

-- Remove all timezone conversion functions
DROP FUNCTION IF EXISTS convert_utc_to_ist(TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS is_likely_utc_time(TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS smart_timezone_convert(TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS trigger_convert_punch_time();
DROP FUNCTION IF EXISTS trigger_convert_attendance_times();
DROP FUNCTION IF EXISTS is_over_converted_time(TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS reverse_timezone_conversion(TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS ensure_proper_timezone();
DROP FUNCTION IF EXISTS calculate_total_hours();

-- ===============================================
-- STEP 5: CREATE CLEAN, SIMPLE TRIGGER FOR TOTAL HOURS
-- ===============================================

-- Simple function to calculate total work hours only
CREATE OR REPLACE FUNCTION calculate_work_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Calculate total hours only if both check-in and check-out times exist
    IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
        NEW.total_hours = ROUND(
            EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600.0,
            2
        );
    ELSE
        NEW.total_hours = NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create clean trigger for attendance records (only calculates hours)
CREATE TRIGGER attendance_calculate_hours
    BEFORE INSERT OR UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION calculate_work_hours();

-- ===============================================
-- STEP 6: VERIFY ACTIVE DEVICES ARE READY
-- ===============================================

SELECT 'DEVICE STATUS CHECK' as status;

SELECT 
    device_name,
    ip_address,
    port,
    status,
    last_connected,
    CASE 
        WHEN status = 'active' THEN 'READY FOR SYNC ✓'
        WHEN status = 'inactive' THEN 'DEVICE OFFLINE ❌'
        WHEN status = 'maintenance' THEN 'IN MAINTENANCE ⚠️'
        ELSE 'UNKNOWN STATUS'
    END as sync_readiness
FROM essl_devices
ORDER BY device_name;

-- ===============================================
-- STEP 7: SUCCESS MESSAGE AND NEXT STEPS
-- ===============================================

SELECT 
    '🎉 DATABASE COMPLETELY CLEANED!' as status,
    'All attendance_punch_logs deleted' as step1,
    'All attendance_records deleted' as step2, 
    'All device_sync_logs deleted' as step3,
    'All timezone conversion functions removed' as step4,
    'Clean total hours trigger created' as step5,
    'Go to HR > Attendance page to start fresh sync' as next_action,
    'ESSL devices will sync with correct IST times' as expected_result;

-- Final verification - should show all zeros
SELECT 
    'FINAL COUNT VERIFICATION' as info,
    (SELECT COUNT(*) FROM attendance_punch_logs) as punch_logs_count,
    (SELECT COUNT(*) FROM attendance_records) as attendance_records_count,
    (SELECT COUNT(*) FROM device_sync_logs) as sync_logs_count,
    (SELECT COUNT(*) FROM essl_devices WHERE status = 'active') as active_devices_count;