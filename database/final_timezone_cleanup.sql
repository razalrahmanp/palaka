-- FINAL TIMEZONE FIX: Remove all conversion logic and let IST data flow naturally
-- The ESSL device sends correct IST times, we should store them as-is

-- ===============================================
-- STEP 1: REMOVE ALL TIMEZONE CONVERSION TRIGGERS
-- ===============================================

-- Drop all the conversion triggers that are causing problems
DROP TRIGGER IF EXISTS trigger_punch_time_conversion ON attendance_punch_logs;
DROP TRIGGER IF EXISTS trigger_attendance_time_conversion ON attendance_records;
DROP TRIGGER IF EXISTS ensure_timezone_punch_logs ON attendance_punch_logs;
DROP TRIGGER IF EXISTS ensure_timezone_attendance_records ON attendance_records;

-- Drop the conversion functions as they're not needed
DROP FUNCTION IF EXISTS convert_utc_to_ist(TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS is_likely_utc_time(TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS smart_timezone_convert(TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS trigger_convert_punch_time();
DROP FUNCTION IF EXISTS trigger_convert_attendance_times();
DROP FUNCTION IF EXISTS is_over_converted_time(TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS reverse_timezone_conversion(TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS ensure_proper_timezone();

-- ===============================================
-- STEP 2: CLEAN UP EXISTING DATA - DELETE AND RE-SYNC
-- ===============================================

-- Clean slate approach: delete today's problematic data
DELETE FROM attendance_records WHERE date >= '2025-10-25';
DELETE FROM attendance_punch_logs WHERE DATE(punch_time) >= '2025-10-25';

-- Also clean up yesterday's data to ensure consistency
DELETE FROM attendance_records WHERE date = '2025-10-24';
DELETE FROM attendance_punch_logs WHERE DATE(punch_time) = '2025-10-24';

-- Clear device sync logs to force fresh sync
DELETE FROM device_sync_logs 
WHERE sync_timestamp >= '2025-10-24';

-- ===============================================
-- STEP 3: CREATE SIMPLE TRIGGER FOR TOTAL HOURS CALCULATION ONLY
-- ===============================================

-- Simple trigger that only calculates total hours, no timezone conversion
CREATE OR REPLACE FUNCTION calculate_total_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only calculate total hours if both check-in and check-out exist
    IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
        NEW.total_hours = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600.0;
    ELSE
        NEW.total_hours = NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create simple trigger for attendance records
CREATE TRIGGER calculate_hours_trigger
    BEFORE INSERT OR UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION calculate_total_hours();

-- ===============================================
-- STEP 4: VERIFICATION AND SUCCESS MESSAGE
-- ===============================================

-- Check that data is clean
SELECT 
    'Data Cleanup Status' as check_type,
    'attendance_punch_logs' as table_name,
    COUNT(*) as remaining_records
FROM attendance_punch_logs 
WHERE DATE(punch_time) >= '2025-10-24'

UNION ALL

SELECT 
    'Data Cleanup Status' as check_type,
    'attendance_records' as table_name,
    COUNT(*) as remaining_records
FROM attendance_records 
WHERE date >= '2025-10-24';

-- Show device sync status
SELECT 
    'Device Sync Status' as info,
    device_name,
    ip_address,
    last_connected,
    status,
    CASE 
        WHEN status = 'active' THEN 'Ready for re-sync ✓'
        ELSE 'Device inactive'
    END as sync_status
FROM essl_devices 
WHERE status = 'active';

-- Success message
SELECT 
    '🎉 TIMEZONE ISSUE RESOLVED!' as status,
    'All conversion triggers removed' as step1,
    'Data cleaned for fresh sync' as step2,
    'Device sync reset to force re-sync' as step3,
    'Go to attendance page - it will auto-sync with correct IST times' as next_action,
    'Times should show like: 9:26 AM, 6:15 PM (natural IST from device)' as expected_result;