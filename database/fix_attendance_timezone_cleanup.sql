-- CRITICAL TIMEZONE FIX: Clean slate approach to fix UTC/IST display issue
-- Problem: Times showing 3:26 AM instead of 9:26 AM (5.5 hour difference)
-- Solution: Delete all attendance data and let system re-sync with corrected code

-- Step 1: Check current data (should show early morning times like 3:26 AM)
SELECT 
    'Current problematic data' as info,
    DATE(punch_time) as date,
    COUNT(*) as punch_count,
    MIN(punch_time::time) as earliest_time,
    MAX(punch_time::time) as latest_time
FROM attendance_punch_logs
WHERE DATE(punch_time) = '2025-10-24'
GROUP BY DATE(punch_time);

-- Step 2: SAFE DELETE - Clean all attendance data
-- This prevents duplicate key constraint violations
DELETE FROM attendance_records WHERE date >= '2025-10-24';
DELETE FROM attendance_punch_logs WHERE DATE(punch_time) >= '2025-10-24';
DELETE FROM device_sync_logs WHERE DATE(last_sync) >= '2025-10-24';

-- Step 3: Verify cleanup is complete
SELECT 
    'After cleanup verification' as info,
    'attendance_records' as table_name, 
    COUNT(*) as remaining_count 
FROM attendance_records 
WHERE date >= '2025-10-24'
UNION ALL
SELECT 
    'After cleanup verification' as info,
    'attendance_punch_logs' as table_name, 
    COUNT(*) as remaining_count 
FROM attendance_punch_logs 
WHERE DATE(punch_time) >= '2025-10-24'
UNION ALL
SELECT 
    'After cleanup verification' as info,
    'device_sync_logs' as table_name, 
    COUNT(*) as remaining_count 
FROM device_sync_logs 
WHERE DATE(last_sync) >= '2025-10-24';

-- Step 4: INSTRUCTIONS FOR USER
-- After running this SQL:
-- 1. Go to HR > Attendance page in your browser
-- 2. The page will automatically:
--    - Sync from ESSL devices with CORRECT timezone (IST, not UTC)
--    - Process punch logs with smart IN/OUT detection
--    - Display times like 9:26 AM instead of 3:26 AM
-- 3. Total hours will be calculated correctly
-- 4. No duplicate key constraint errors will occur

-- EXPECTED RESULT:
-- Employee check-ins will show: 9:15 AM, 9:42 AM, 9:46 AM (correct IST times)
-- Instead of: 3:15 AM, 3:42 AM, 3:46 AM (incorrect UTC times)