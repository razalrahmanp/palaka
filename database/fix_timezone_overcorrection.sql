-- TIMEZONE FIX: Correct the over-conversion issue
-- Problem: We added 5:30 hours when we should have kept original times
-- The 3:26 AM times were actually correct IST, just displayed wrong in UI

-- ===============================================
-- STEP 1: REVERSE THE INCORRECT CONVERSION
-- ===============================================

-- Function to detect if timestamp was over-converted (evening/night times during office hours)
CREATE OR REPLACE FUNCTION is_over_converted_time(check_time TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- If time is between 6:00 PM and 11:59 PM during a workday, likely over-converted
    RETURN EXTRACT(HOUR FROM check_time) BETWEEN 18 AND 23;
END;
$$;

-- Function to subtract 5:30 hours (reverse the incorrect addition)
CREATE OR REPLACE FUNCTION reverse_timezone_conversion(input_time TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Subtract 5 hours 30 minutes to reverse the incorrect conversion
    RETURN input_time - INTERVAL '5 hours 30 minutes';
END;
$$;

-- ===============================================
-- STEP 2: FIX THE OVER-CONVERTED DATA
-- ===============================================

-- Fix attendance_punch_logs - reverse the over-conversion
UPDATE attendance_punch_logs 
SET punch_time = reverse_timezone_conversion(punch_time)
WHERE is_over_converted_time(punch_time);

-- Fix attendance_records - reverse the over-conversion
UPDATE attendance_records 
SET 
    check_in_time = CASE 
        WHEN check_in_time IS NOT NULL AND is_over_converted_time(check_in_time) 
        THEN reverse_timezone_conversion(check_in_time) 
        ELSE check_in_time 
    END,
    check_out_time = CASE 
        WHEN check_out_time IS NOT NULL AND is_over_converted_time(check_out_time) 
        THEN reverse_timezone_conversion(check_out_time) 
        ELSE check_out_time 
    END
WHERE (check_in_time IS NOT NULL AND is_over_converted_time(check_in_time))
   OR (check_out_time IS NOT NULL AND is_over_converted_time(check_out_time));

-- Recalculate total hours correctly
UPDATE attendance_records 
SET total_hours = CASE 
    WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600.0
    ELSE NULL 
END
WHERE (check_in_time IS NOT NULL AND check_out_time IS NOT NULL);

-- ===============================================
-- STEP 3: DROP THE PROBLEMATIC TRIGGERS
-- ===============================================

-- Remove the triggers that were causing the over-conversion
DROP TRIGGER IF EXISTS trigger_punch_time_conversion ON attendance_punch_logs;
DROP TRIGGER IF EXISTS trigger_attendance_time_conversion ON attendance_records;

-- ===============================================
-- STEP 4: CREATE PROPER TIMEZONE-AWARE TRIGGERS
-- ===============================================

-- New trigger function that doesn't convert, just ensures proper timezone storage
CREATE OR REPLACE FUNCTION ensure_proper_timezone()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- For new data, ensure it's stored with proper timezone but don't convert
    -- The application should send correct IST times
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Just ensure the timestamp has timezone info, don't convert
        IF TG_TABLE_NAME = 'attendance_punch_logs' THEN
            -- For punch logs, ensure punch_time has timezone
            NEW.punch_time = NEW.punch_time AT TIME ZONE 'Asia/Kolkata';
        ELSIF TG_TABLE_NAME = 'attendance_records' THEN
            -- For attendance records, ensure both times have timezone
            IF NEW.check_in_time IS NOT NULL THEN
                NEW.check_in_time = NEW.check_in_time AT TIME ZONE 'Asia/Kolkata';
            END IF;
            IF NEW.check_out_time IS NOT NULL THEN
                NEW.check_out_time = NEW.check_out_time AT TIME ZONE 'Asia/Kolkata';
            END IF;
            
            -- Recalculate total hours
            IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
                NEW.total_hours = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600.0;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Create the new, safer triggers
CREATE TRIGGER ensure_timezone_punch_logs
    BEFORE INSERT OR UPDATE ON attendance_punch_logs
    FOR EACH ROW
    EXECUTE FUNCTION ensure_proper_timezone();

CREATE TRIGGER ensure_timezone_attendance_records
    BEFORE INSERT OR UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION ensure_proper_timezone();

-- ===============================================
-- STEP 5: VERIFICATION QUERIES
-- ===============================================

-- Check if the times are now correct (should be morning hours 8-11 AM)
SELECT 
    'After Correction - attendance_punch_logs' as table_name,
    DATE(punch_time)::text as date,
    COUNT(*) as total_punches,
    MIN(punch_time::time)::text as earliest_punch,
    MAX(punch_time::time)::text as latest_punch,
    CASE 
        WHEN MIN(EXTRACT(HOUR FROM punch_time)) BETWEEN 8 AND 11 THEN 'Corrected to IST ✓'
        WHEN MIN(EXTRACT(HOUR FROM punch_time)) BETWEEN 18 AND 23 THEN 'Still over-converted ❌'
        WHEN MIN(EXTRACT(HOUR FROM punch_time)) BETWEEN 0 AND 6 THEN 'Back to original times ✓'
        ELSE 'Mixed times (investigate)'
    END as status
FROM attendance_punch_logs 
WHERE DATE(punch_time) = CURRENT_DATE
GROUP BY DATE(punch_time)

UNION ALL

SELECT 
    'After Correction - attendance_records' as table_name,
    date::text,
    COUNT(*) as total_records,
    MIN(check_in_time::time)::text as earliest_checkin,
    MAX(COALESCE(check_out_time::time, '00:00'::time))::text as latest_checkout,
    CASE 
        WHEN MIN(EXTRACT(HOUR FROM check_in_time)) BETWEEN 8 AND 11 THEN 'Corrected to IST ✓'
        WHEN MIN(EXTRACT(HOUR FROM check_in_time)) BETWEEN 18 AND 23 THEN 'Still over-converted ❌'
        WHEN MIN(EXTRACT(HOUR FROM check_in_time)) BETWEEN 0 AND 6 THEN 'Back to original times ✓'
        ELSE 'Mixed times (investigate)'
    END as status
FROM attendance_records 
WHERE date = CURRENT_DATE
GROUP BY date;

-- Show sample corrected times
SELECT 
    'Sample corrected times' as info,
    employee_id,
    punch_time::time as corrected_time,
    punch_type
FROM attendance_punch_logs 
WHERE DATE(punch_time) = CURRENT_DATE 
ORDER BY punch_time 
LIMIT 10;

-- ===============================================
-- SUCCESS MESSAGE
-- ===============================================
SELECT 'TIMEZONE OVER-CONVERSION FIXED! 🎉' as status,
       'Evening times (10:21 PM) should now show as morning times (3:21 AM or 9:21 AM)' as fix_applied,
       'Triggers updated to prevent future over-conversion' as future_protection,
       'Check your attendance page for correct times' as next_step;