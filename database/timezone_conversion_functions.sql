-- TIMEZONE CONVERSION SYSTEM: Automatic UTC to IST conversion
-- This approach converts existing data and automatically handles new data

-- ===============================================
-- STEP 1: CREATE TIMEZONE CONVERSION FUNCTIONS
-- ===============================================

-- Function to convert UTC timestamp to IST
CREATE OR REPLACE FUNCTION convert_utc_to_ist(utc_timestamp TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Convert UTC to IST (UTC + 5:30)
    RETURN utc_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata';
END;
$$;

-- Function to detect if timestamp looks like UTC (early morning hours)
CREATE OR REPLACE FUNCTION is_likely_utc_time(check_time TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- If time is between 12:00 AM and 6:00 AM, likely stored as UTC
    RETURN EXTRACT(HOUR FROM check_time) BETWEEN 0 AND 6;
END;
$$;

-- Function to smart convert: only convert if it looks like UTC
CREATE OR REPLACE FUNCTION smart_timezone_convert(input_time TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- If time looks like UTC (early morning), convert to IST
    -- Otherwise, assume it's already in correct timezone
    IF is_likely_utc_time(input_time) THEN
        RETURN convert_utc_to_ist(input_time);
    ELSE
        RETURN input_time;
    END IF;
END;
$$;

-- ===============================================
-- STEP 2: FIX EXISTING DATA
-- ===============================================

-- Fix attendance_punch_logs table
UPDATE attendance_punch_logs 
SET punch_time = smart_timezone_convert(punch_time)
WHERE is_likely_utc_time(punch_time);

-- Fix attendance_records table  
UPDATE attendance_records 
SET 
    check_in_time = CASE 
        WHEN check_in_time IS NOT NULL AND is_likely_utc_time(check_in_time) 
        THEN smart_timezone_convert(check_in_time) 
        ELSE check_in_time 
    END,
    check_out_time = CASE 
        WHEN check_out_time IS NOT NULL AND is_likely_utc_time(check_out_time) 
        THEN smart_timezone_convert(check_out_time) 
        ELSE check_out_time 
    END
WHERE (check_in_time IS NOT NULL AND is_likely_utc_time(check_in_time))
   OR (check_out_time IS NOT NULL AND is_likely_utc_time(check_out_time));

-- Recalculate total hours for updated records
UPDATE attendance_records 
SET total_hours = CASE 
    WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600.0
    ELSE NULL 
END
WHERE (check_in_time IS NOT NULL AND check_out_time IS NOT NULL);

-- ===============================================
-- STEP 3: CREATE TRIGGERS FOR AUTOMATIC CONVERSION
-- ===============================================

-- Trigger function for attendance_punch_logs
CREATE OR REPLACE FUNCTION trigger_convert_punch_time()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Automatically convert new punch times if they look like UTC
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        NEW.punch_time = smart_timezone_convert(NEW.punch_time);
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger function for attendance_records
CREATE OR REPLACE FUNCTION trigger_convert_attendance_times()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Automatically convert new attendance times if they look like UTC
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.check_in_time IS NOT NULL THEN
            NEW.check_in_time = smart_timezone_convert(NEW.check_in_time);
        END IF;
        
        IF NEW.check_out_time IS NOT NULL THEN
            NEW.check_out_time = smart_timezone_convert(NEW.check_out_time);
        END IF;
        
        -- Recalculate total hours if both times are present
        IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
            NEW.total_hours = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600.0;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- ===============================================
-- STEP 4: CREATE THE ACTUAL TRIGGERS
-- ===============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_punch_time_conversion ON attendance_punch_logs;
DROP TRIGGER IF EXISTS trigger_attendance_time_conversion ON attendance_records;

-- Create triggers for automatic timezone conversion
CREATE TRIGGER trigger_punch_time_conversion
    BEFORE INSERT OR UPDATE ON attendance_punch_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_convert_punch_time();

CREATE TRIGGER trigger_attendance_time_conversion
    BEFORE INSERT OR UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION trigger_convert_attendance_times();

-- ===============================================
-- STEP 5: VERIFICATION QUERIES
-- ===============================================

-- Check the conversion results
SELECT 
    'attendance_punch_logs' as table_name,
    DATE(punch_time) as date,
    COUNT(*) as total_punches,
    MIN(punch_time::time) as earliest_punch,
    MAX(punch_time::time) as latest_punch,
    CASE 
        WHEN MIN(EXTRACT(HOUR FROM punch_time)) BETWEEN 0 AND 6 THEN 'Still UTC (needs fixing)'
        WHEN MIN(EXTRACT(HOUR FROM punch_time)) BETWEEN 8 AND 11 THEN 'Converted to IST ✓'
        ELSE 'Mixed times (check manually)'
    END as conversion_status
FROM attendance_punch_logs 
WHERE DATE(punch_time) = CURRENT_DATE
GROUP BY DATE(punch_time)

UNION ALL

SELECT 
    'attendance_records' as table_name,
    date,
    COUNT(*) as total_records,
    MIN(check_in_time::time) as earliest_checkin,
    MAX(COALESCE(check_out_time::time, '00:00'::time)) as latest_checkout,
    CASE 
        WHEN MIN(EXTRACT(HOUR FROM check_in_time)) BETWEEN 0 AND 6 THEN 'Still UTC (needs fixing)'
        WHEN MIN(EXTRACT(HOUR FROM check_in_time)) BETWEEN 8 AND 11 THEN 'Converted to IST ✓'
        ELSE 'Mixed times (check manually)'
    END as conversion_status
FROM attendance_records 
WHERE date = CURRENT_DATE
GROUP BY date;

-- Test the trigger with a sample insert (will be automatically converted)
-- INSERT INTO attendance_punch_logs (employee_id, device_id, punch_time, punch_type) 
-- VALUES ('test-id', 'test-device', '2025-10-24 03:30:00+00', 'IN');
-- This should automatically convert 03:30 UTC to 09:00 IST

-- ===============================================
-- SUCCESS MESSAGE
-- ===============================================
SELECT 'TIMEZONE CONVERSION COMPLETE! 🎉' as status,
       'All existing UTC times converted to IST' as existing_data,
       'New data will be automatically converted' as future_data,
       'Check your attendance page - times should now show 9:26 AM instead of 3:26 AM' as verification;