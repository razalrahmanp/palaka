-- Migration: Add Shift and Overtime Schema Enhancements
-- Date: 2025-11-06
-- Description: Add missing fields for salary structure, overtime tracking, shift management, and individual employee work schedules

-- ========================================
-- 1. Add individual work schedule fields to employees table
-- ========================================

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS work_start_time TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS work_end_time TIME DEFAULT '18:00:00',
ADD COLUMN IF NOT EXISTS work_hours_per_day NUMERIC DEFAULT 8,
ADD COLUMN IF NOT EXISTS working_days_per_week INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS weekly_off_days INTEGER[] DEFAULT ARRAY[0], -- 0=Sunday, 1=Monday, etc.
ADD COLUMN IF NOT EXISTS break_duration_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS grace_period_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS overtime_eligible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS overtime_rate_multiplier NUMERIC DEFAULT 1.5;

COMMENT ON COLUMN employees.work_start_time IS 'Individual employee work start time';
COMMENT ON COLUMN employees.work_end_time IS 'Individual employee work end time';
COMMENT ON COLUMN employees.work_hours_per_day IS 'Expected work hours per day';
COMMENT ON COLUMN employees.working_days_per_week IS 'Number of working days per week';
COMMENT ON COLUMN employees.weekly_off_days IS 'Array of week day numbers for offs (0=Sun, 6=Sat)';
COMMENT ON COLUMN employees.break_duration_minutes IS 'Break duration in minutes';
COMMENT ON COLUMN employees.grace_period_minutes IS 'Grace period for late arrival in minutes';
COMMENT ON COLUMN employees.overtime_eligible IS 'Whether employee is eligible for overtime';
COMMENT ON COLUMN employees.overtime_rate_multiplier IS 'Overtime multiplier (e.g., 1.5 = 1.5x)';

-- ========================================
-- 2. Add hourly rate fields to salary_structures
-- ========================================

ALTER TABLE salary_structures 
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC,
ADD COLUMN IF NOT EXISTS overtime_rate_multiplier NUMERIC DEFAULT 1.5,
ADD COLUMN IF NOT EXISTS overtime_hourly_rate NUMERIC;

-- Create function to calculate hourly rates
CREATE OR REPLACE FUNCTION calculate_hourly_rates()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate hourly rate: Basic salary / 208 hours (8 hours * 26 working days)
  NEW.hourly_rate := NEW.basic_salary / 208.0;
  
  -- Calculate overtime rate: Hourly rate * Multiplier
  NEW.overtime_hourly_rate := (NEW.basic_salary / 208.0) * COALESCE(NEW.overtime_rate_multiplier, 1.5);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate rates
DROP TRIGGER IF EXISTS update_hourly_rates ON salary_structures;
CREATE TRIGGER update_hourly_rates
BEFORE INSERT OR UPDATE ON salary_structures
FOR EACH ROW
EXECUTE FUNCTION calculate_hourly_rates();

-- ========================================
-- 2. Create overtime_records table
-- ========================================

CREATE TABLE IF NOT EXISTS public.overtime_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_record_id UUID REFERENCES attendance_records(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  shift_id UUID REFERENCES work_shifts(id) ON DELETE SET NULL,
  
  -- Shift timing
  scheduled_start_time TIME NOT NULL,
  scheduled_end_time TIME NOT NULL,
  actual_check_in TIME NOT NULL,
  actual_check_out TIME NOT NULL,
  
  -- Break time
  scheduled_break_minutes INTEGER DEFAULT 0,
  actual_break_minutes INTEGER DEFAULT 0,
  
  -- Hours calculation
  scheduled_hours NUMERIC NOT NULL, -- Total shift hours minus break
  actual_hours NUMERIC NOT NULL, -- Total worked hours minus break
  regular_hours NUMERIC NOT NULL, -- Hours within shift (max = scheduled_hours)
  overtime_hours NUMERIC NOT NULL, -- Hours beyond shift + threshold
  overtime_type VARCHAR(50) CHECK (overtime_type IN ('pre_shift', 'post_shift', 'holiday', 'weekend', 'rest_day')),
  
  -- Rates and amounts
  hourly_rate NUMERIC NOT NULL,
  overtime_rate NUMERIC NOT NULL,
  regular_amount NUMERIC NOT NULL,
  overtime_amount NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  
  -- Approval workflow
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  rejected_reason TEXT,
  remarks TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for overtime_records
CREATE INDEX IF NOT EXISTS idx_overtime_employee_date ON overtime_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_overtime_status ON overtime_records(status);
CREATE INDEX IF NOT EXISTS idx_overtime_date ON overtime_records(date);
CREATE INDEX IF NOT EXISTS idx_overtime_shift ON overtime_records(shift_id);
CREATE INDEX IF NOT EXISTS idx_overtime_attendance ON overtime_records(attendance_record_id);

-- ========================================
-- 3. Add overtime tracking fields to attendance_records
-- ========================================

ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES work_shifts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS scheduled_hours NUMERIC,
ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_overtime_approved BOOLEAN DEFAULT false;

-- ========================================
-- 4. Create shift_exceptions table for holidays/special days
-- ========================================

CREATE TABLE IF NOT EXISTS public.shift_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES work_shifts(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  exception_type VARCHAR(50) CHECK (exception_type IN ('holiday', 'half_day', 'closed', 'special_hours')),
  modified_start_time TIME,
  modified_end_time TIME,
  is_working_day BOOLEAN DEFAULT false,
  overtime_multiplier NUMERIC DEFAULT 2.0, -- Holiday overtime rate (e.g., 2x)
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(shift_id, exception_date)
);

CREATE INDEX IF NOT EXISTS idx_shift_exceptions_date ON shift_exceptions(exception_date);
CREATE INDEX IF NOT EXISTS idx_shift_exceptions_shift ON shift_exceptions(shift_id);

-- ========================================
-- 5. Create overtime_approvals table for approval history
-- ========================================

CREATE TABLE IF NOT EXISTS public.overtime_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overtime_record_id UUID NOT NULL REFERENCES overtime_records(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'paid')),
  comments TEXT,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_overtime_approvals_record ON overtime_approvals(overtime_record_id);
CREATE INDEX IF NOT EXISTS idx_overtime_approvals_approver ON overtime_approvals(approver_id);

-- ========================================
-- 6. Create function to calculate overtime automatically
-- ========================================

CREATE OR REPLACE FUNCTION calculate_overtime_hours(
  p_check_in TIMESTAMP,
  p_check_out TIMESTAMP,
  p_shift_start TIME,
  p_shift_end TIME,
  p_break_minutes INTEGER,
  p_overtime_threshold INTEGER
) RETURNS TABLE (
  regular_hours NUMERIC,
  overtime_hours NUMERIC,
  total_hours NUMERIC
) AS $$
DECLARE
  v_shift_start TIMESTAMP;
  v_shift_end TIMESTAMP;
  v_threshold_end TIMESTAMP;
  v_total_minutes NUMERIC;
  v_scheduled_minutes NUMERIC;
  v_overtime_minutes NUMERIC;
BEGIN
  -- Convert shift times to timestamps on the check-in date
  v_shift_start := p_check_in::DATE + p_shift_start;
  v_shift_end := p_check_in::DATE + p_shift_end;
  
  -- Handle overnight shifts
  IF p_shift_end < p_shift_start THEN
    v_shift_end := v_shift_end + INTERVAL '1 day';
  END IF;
  
  -- Add overtime threshold to shift end
  v_threshold_end := v_shift_end + (p_overtime_threshold || ' minutes')::INTERVAL;
  
  -- Calculate total minutes worked (excluding break)
  v_total_minutes := EXTRACT(EPOCH FROM (p_check_out - p_check_in))/60 - p_break_minutes;
  
  -- Calculate scheduled minutes (shift duration - break)
  v_scheduled_minutes := EXTRACT(EPOCH FROM (v_shift_end - v_shift_start))/60 - p_break_minutes;
  
  -- Calculate overtime minutes
  IF p_check_out > v_threshold_end THEN
    v_overtime_minutes := EXTRACT(EPOCH FROM (p_check_out - v_threshold_end))/60;
  ELSE
    v_overtime_minutes := 0;
  END IF;
  
  -- Return results in hours
  RETURN QUERY SELECT 
    LEAST(v_scheduled_minutes / 60.0, v_total_minutes / 60.0) as regular_hours,
    v_overtime_minutes / 60.0 as overtime_hours,
    v_total_minutes / 60.0 as total_hours;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. Update existing records with calculated hourly rates
-- ========================================

UPDATE salary_structures 
SET 
  hourly_rate = basic_salary / 208.0,
  overtime_hourly_rate = (basic_salary / 208.0) * COALESCE(overtime_rate_multiplier, 1.5)
WHERE hourly_rate IS NULL;

-- ========================================
-- 8. Add comments for documentation
-- ========================================

COMMENT ON TABLE overtime_records IS 'Tracks daily overtime work with approval workflow';
COMMENT ON COLUMN overtime_records.overtime_type IS 'Type of overtime: pre_shift, post_shift, holiday, weekend, rest_day';
COMMENT ON COLUMN overtime_records.status IS 'Approval status: pending, approved, rejected, paid';
COMMENT ON COLUMN salary_structures.hourly_rate IS 'Calculated as basic_salary / 208 hours per month';
COMMENT ON COLUMN salary_structures.overtime_rate_multiplier IS 'Multiplier for overtime (typically 1.5x)';
COMMENT ON COLUMN salary_structures.overtime_hourly_rate IS 'Hourly rate × overtime multiplier';

-- ========================================
-- 9. Grant permissions (adjust as needed)
-- ========================================

-- Grant SELECT to all authenticated users
-- Grant INSERT, UPDATE, DELETE to HR role
-- This is a placeholder - adjust based on your RLS policies

COMMENT ON SCHEMA public IS 'Shift and Overtime schema migration completed';
