# Work Shift, Salary Structure & Overtime Analysis

## Current Schema Analysis

### ✅ Existing Tables

#### 1. **work_shifts**
```sql
- id (uuid, PK)
- shift_name (varchar)
- start_time (time) - Shift start time
- end_time (time) - Shift end time
- break_duration (integer, default 0) - Break duration in minutes
- grace_period_in (integer, default 15) - Grace period for check-in (minutes)
- grace_period_out (integer, default 15) - Grace period for check-out (minutes)
- overtime_threshold (integer, default 0) - Minutes after shift to start overtime
- is_active (boolean)
- created_at (timestamp)
```

#### 2. **employee_shifts**
```sql
- id (uuid, PK)
- employee_id (uuid, FK -> employees)
- shift_id (uuid, FK -> work_shifts)
- effective_from (date) - Start date of shift assignment
- effective_to (date) - End date of shift assignment (nullable)
- is_active (boolean)
- created_at (timestamp)
```

#### 3. **salary_structures**
```sql
- id (uuid, PK)
- employee_id (uuid, FK -> employees)
- basic_salary (numeric)
- house_rent_allowance (numeric, default 0)
- transport_allowance (numeric, default 0)
- medical_allowance (numeric, default 0)
- other_allowances (jsonb, default '{}') - Flexible allowances
- provident_fund_deduction (numeric, default 0)
- tax_deduction (numeric, default 0)
- other_deductions (jsonb, default '{}') - Flexible deductions
- effective_from (date)
- effective_to (date, nullable)
- is_active (boolean)
- created_by (uuid, FK -> users)
- created_at (timestamp)
```

#### 4. **payroll_records**
```sql
- id (uuid, PK)
- employee_id (uuid, FK -> employees)
- salary_structure_id (uuid, FK -> salary_structures)
- pay_period_start (date)
- pay_period_end (date)
- basic_salary (numeric)
- total_allowances (numeric)
- total_deductions (numeric)
- gross_salary (numeric)
- net_salary (numeric)
- working_days (integer)
- present_days (integer)
- leave_days (integer)
- overtime_hours (numeric, default 0) ✅ Already exists!
- overtime_amount (numeric, default 0) ✅ Already exists!
- bonus (numeric, default 0)
- status (text: draft/processed/paid)
- payment_type (varchar: salary/overtime/incentive/bonus/allowance/reimbursement)
- processed_by (uuid, FK -> users)
- processed_at (timestamp)
- created_at (timestamp)
```

#### 5. **attendance_records**
```sql
- id (uuid, PK)
- employee_id (uuid, FK -> employees)
- date (date)
- check_in_time (timestamp)
- check_out_time (timestamp)
- total_hours (numeric)
- break_start_time (timestamp) ✅ Already exists!
- break_finish_time (timestamp) ✅ Already exists!
- break_duration_minutes (integer) ✅ Already exists!
- status (text: present/absent/half_day/late/on_leave)
- notes (text)
- device_id (uuid, FK -> essl_devices)
- punch_type (varchar: auto/manual/correction)
- verification_method (varchar: fingerprint/face/rfid/password)
- verification_quality (integer, 1-100)
- raw_log_data (jsonb)
- sync_status (varchar: pending/synced/failed)
- location_coordinates (point)
- created_at (timestamp)
```

#### 6. **attendance_punch_logs**
```sql
- id (uuid, PK)
- employee_id (uuid, FK -> employees)
- device_id (uuid, FK -> essl_devices)
- punch_time (timestamp)
- punch_type (varchar: IN/OUT/BREAK)
- verification_method (varchar)
- verification_quality (integer)
- device_user_id (varchar)
- raw_data (jsonb)
- processed (boolean, default false)
- attendance_record_id (uuid, FK -> attendance_records)
- created_at (timestamp)
```

#### 7. **attendance_policies**
```sql
- id (uuid, PK)
- policy_name (varchar)
- late_arrival_policy (jsonb)
- early_departure_policy (jsonb)
- overtime_policy (jsonb) ✅ Policy structure exists!
- break_policy (jsonb)
- minimum_hours_policy (jsonb)
- is_active (boolean)
- effective_from (date)
- effective_to (date)
- created_at (timestamp)
```

---

## 📋 Implementation Requirements

### Phase 1: Shift Management Enhancement ✅
**Schema Status:** Ready - Tables exist

**Requirements:**
1. ✅ Create/Edit work shifts with:
   - Shift name (Morning/Evening/Night)
   - Start time and End time
   - Break duration
   - Grace periods for check-in/out
   - Overtime threshold

2. ✅ Assign employees to shifts with:
   - Effective date ranges
   - Support for shift rotations
   - Multiple shift assignments over time

**Missing Fields:** NONE - Schema is complete!

---

### Phase 2: Salary Structure Enhancement ⚠️
**Schema Status:** Mostly Ready - Need overtime rate field

**Requirements:**
1. ✅ Basic salary components (all exist)
2. ✅ Allowances (HRA, Transport, Medical, Other)
3. ✅ Deductions (PF, Tax, Other)
4. ❌ **MISSING: Hourly/Overtime rate calculation fields**

**Schema Changes Needed:**
```sql
ALTER TABLE salary_structures 
ADD COLUMN hourly_rate NUMERIC GENERATED ALWAYS AS (basic_salary / 208) STORED,
ADD COLUMN overtime_rate_multiplier NUMERIC DEFAULT 1.5,
ADD COLUMN overtime_hourly_rate NUMERIC GENERATED ALWAYS AS ((basic_salary / 208) * overtime_rate_multiplier) STORED;

-- Note: 208 = average working hours per month (8 hours * 26 days)
```

---

### Phase 3: Overtime Calculation ⚠️
**Schema Status:** Partial - Need dedicated overtime tracking table

**Current State:**
- ✅ `payroll_records.overtime_hours` exists
- ✅ `payroll_records.overtime_amount` exists
- ❌ **MISSING: Daily overtime tracking table**

**Schema Changes Needed:**
```sql
CREATE TABLE public.overtime_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  attendance_record_id UUID REFERENCES attendance_records(id),
  date DATE NOT NULL,
  shift_id UUID REFERENCES work_shifts(id),
  
  -- Shift timing
  scheduled_start_time TIME NOT NULL,
  scheduled_end_time TIME NOT NULL,
  actual_check_in TIME NOT NULL,
  actual_check_out TIME NOT NULL,
  
  -- Overtime calculation
  regular_hours NUMERIC NOT NULL, -- Hours within shift
  overtime_hours NUMERIC NOT NULL, -- Hours beyond shift + threshold
  overtime_type VARCHAR CHECK (overtime_type IN ('pre_shift', 'post_shift', 'holiday', 'weekend')),
  
  -- Rates
  hourly_rate NUMERIC NOT NULL,
  overtime_rate NUMERIC NOT NULL,
  regular_amount NUMERIC NOT NULL,
  overtime_amount NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  
  -- Approval
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  remarks TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_overtime_employee_date ON overtime_records(employee_id, date);
CREATE INDEX idx_overtime_status ON overtime_records(status);
```

---

### Phase 4: Attendance Processing with Shift Logic ✅
**Schema Status:** Ready - All fields exist

**Enhanced Attendance Processing Logic:**

```typescript
// Pseudo-code for attendance processing with shift
async function processAttendanceWithShift(employeeId, date, punchLogs) {
  // 1. Get employee's active shift for the date
  const shift = await getEmployeeShift(employeeId, date);
  
  if (!shift) {
    // No shift assigned - use default processing
    return processWithoutShift(employeeId, date, punchLogs);
  }
  
  // 2. Get punch times
  const checkIn = punchLogs.find(p => p.punch_type === 'IN' || first);
  const checkOut = punchLogs.find(p => p.punch_type === 'OUT' || last);
  
  // 3. Calculate times relative to shift
  const shiftStart = combineDateTime(date, shift.start_time);
  const shiftEnd = combineDateTime(date, shift.end_time);
  const graceIn = shiftStart + shift.grace_period_in;
  const graceOut = shiftEnd + shift.grace_period_out;
  
  // 4. Determine status
  let status = 'present';
  if (checkIn > graceIn) {
    status = 'late';
  }
  
  // 5. Calculate regular hours
  const regularHours = calculateRegularHours(
    checkIn, 
    checkOut, 
    shiftStart, 
    shiftEnd,
    shift.break_duration
  );
  
  // 6. Calculate overtime
  const overtimeHours = calculateOvertime(
    checkIn,
    checkOut,
    shiftStart,
    shiftEnd,
    shift.overtime_threshold
  );
  
  // 7. Create attendance record
  await createAttendanceRecord({
    employee_id: employeeId,
    date: date,
    check_in_time: checkIn,
    check_out_time: checkOut,
    total_hours: regularHours,
    status: status,
    // ... other fields
  });
  
  // 8. Create overtime record if overtime exists
  if (overtimeHours > 0) {
    const salaryStructure = await getSalaryStructure(employeeId, date);
    await createOvertimeRecord({
      employee_id: employeeId,
      date: date,
      shift_id: shift.id,
      overtime_hours: overtimeHours,
      hourly_rate: salaryStructure.hourly_rate,
      overtime_rate: salaryStructure.overtime_hourly_rate,
      overtime_amount: overtimeHours * salaryStructure.overtime_hourly_rate,
      // ... other fields
    });
  }
}
```

---

### Phase 5: Payroll Integration ✅
**Schema Status:** Ready

**Payroll Calculation Flow:**

```typescript
async function calculatePayroll(employeeId, periodStart, periodEnd) {
  // 1. Get salary structure
  const salary = await getSalaryStructure(employeeId, periodStart);
  
  // 2. Get attendance records
  const attendance = await getAttendanceRecords(employeeId, periodStart, periodEnd);
  
  // 3. Calculate working days
  const workingDays = calculateWorkingDays(periodStart, periodEnd);
  const presentDays = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const leaveDays = attendance.filter(a => a.status === 'on_leave').length;
  
  // 4. Calculate overtime
  const overtimeRecords = await getApprovedOvertimeRecords(employeeId, periodStart, periodEnd);
  const totalOvertimeHours = overtimeRecords.reduce((sum, r) => sum + r.overtime_hours, 0);
  const totalOvertimeAmount = overtimeRecords.reduce((sum, r) => sum + r.overtime_amount, 0);
  
  // 5. Calculate gross salary
  const basicSalary = (salary.basic_salary / workingDays) * presentDays;
  const totalAllowances = salary.house_rent_allowance + salary.transport_allowance + salary.medical_allowance;
  const grossSalary = basicSalary + totalAllowances + totalOvertimeAmount;
  
  // 6. Calculate deductions
  const totalDeductions = salary.provident_fund_deduction + salary.tax_deduction;
  
  // 7. Calculate net salary
  const netSalary = grossSalary - totalDeductions;
  
  // 8. Create payroll record
  return await createPayrollRecord({
    employee_id: employeeId,
    salary_structure_id: salary.id,
    pay_period_start: periodStart,
    pay_period_end: periodEnd,
    basic_salary: basicSalary,
    total_allowances: totalAllowances,
    total_deductions: totalDeductions,
    gross_salary: grossSalary,
    net_salary: netSalary,
    working_days: workingDays,
    present_days: presentDays,
    leave_days: leaveDays,
    overtime_hours: totalOvertimeHours,
    overtime_amount: totalOvertimeAmount,
    status: 'draft'
  });
}
```

---

## 🎯 Implementation Roadmap

### Step 1: Database Schema Updates
```sql
-- Add overtime rate fields to salary_structures
ALTER TABLE salary_structures 
ADD COLUMN hourly_rate NUMERIC,
ADD COLUMN overtime_rate_multiplier NUMERIC DEFAULT 1.5,
ADD COLUMN overtime_hourly_rate NUMERIC;

-- Create overtime_records table
CREATE TABLE public.overtime_records (
  -- See Phase 3 above for full schema
);

-- Add computed columns function
CREATE OR REPLACE FUNCTION calculate_hourly_rates()
RETURNS TRIGGER AS $$
BEGIN
  NEW.hourly_rate := NEW.basic_salary / 208;
  NEW.overtime_hourly_rate := (NEW.basic_salary / 208) * NEW.overtime_rate_multiplier;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hourly_rates
BEFORE INSERT OR UPDATE ON salary_structures
FOR EACH ROW
EXECUTE FUNCTION calculate_hourly_rates();
```

### Step 2: API Endpoints to Create

#### Shift Management
- `GET /api/hr/shifts` - List all shifts
- `POST /api/hr/shifts` - Create shift
- `PUT /api/hr/shifts/[id]` - Update shift
- `DELETE /api/hr/shifts/[id]` - Delete shift
- `GET /api/hr/shifts/[id]/employees` - Get employees on shift
- `POST /api/hr/shifts/assign` - Assign employee to shift
- `GET /api/hr/employees/[id]/shifts` - Get employee shift history

#### Salary Structure
- `GET /api/hr/salary-structures` - List all salary structures
- `GET /api/hr/employees/[id]/salary-structure` - Get active salary structure
- `POST /api/hr/salary-structures` - Create salary structure
- `PUT /api/hr/salary-structures/[id]` - Update salary structure
- `GET /api/hr/salary-structures/[id]/history` - Get salary history

#### Overtime Management
- `GET /api/hr/overtime` - List overtime records (with filters)
- `GET /api/hr/overtime/pending` - Get pending approvals
- `POST /api/hr/overtime/approve` - Approve overtime
- `POST /api/hr/overtime/reject` - Reject overtime
- `GET /api/hr/employees/[id]/overtime` - Get employee overtime summary

#### Payroll
- `POST /api/hr/payroll/calculate` - Calculate payroll for period
- `GET /api/hr/payroll/[id]` - Get payroll details
- `POST /api/hr/payroll/[id]/process` - Process payroll (mark as paid)
- `GET /api/hr/payroll/summary` - Get payroll summary by period

### Step 3: UI Components to Create

#### 1. Shift Management Page
- Shift list with add/edit/delete
- Shift assignment interface
- Employee shift schedule calendar
- Shift rotation planner

#### 2. Salary Structure Page
- Salary component configuration
- Allowances and deductions management
- Overtime rate calculator
- Salary history timeline

#### 3. Overtime Management Page
- Daily overtime records table
- Approval workflow interface
- Overtime summary dashboard
- Export overtime reports

#### 4. Payroll Page
- Payroll calculation wizard
- Period selector
- Employee-wise breakdown
- Payroll summary cards
- Export payslips

### Step 4: Enhanced Attendance Display

**Update Attendance Table to Show:**
```typescript
// Column additions
- Shift Name (e.g., "Morning Shift 9 AM - 6 PM")
- Scheduled Hours (from shift)
- Actual Hours Worked
- Regular Hours (within shift)
- Overtime Hours (beyond shift + threshold)
- Late/Early indicators with grace period consideration
- Overtime amount (if approved)

// Color coding
- Green: On-time (within grace period)
- Yellow: Late (beyond grace but within threshold)
- Red: Significant late
- Blue: Overtime worked
```

---

## 📊 Sample Data Structure

### Example Shifts
```json
{
  "Morning Shift": {
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "break_duration": 60,
    "grace_period_in": 15,
    "grace_period_out": 15,
    "overtime_threshold": 30
  },
  "Evening Shift": {
    "start_time": "14:00:00",
    "end_time": "23:00:00",
    "break_duration": 60,
    "grace_period_in": 15,
    "grace_period_out": 15,
    "overtime_threshold": 30
  },
  "Night Shift": {
    "start_time": "22:00:00",
    "end_time": "07:00:00",
    "break_duration": 60,
    "grace_period_in": 15,
    "grace_period_out": 15,
    "overtime_threshold": 30
  }
}
```

### Example Salary Structure
```json
{
  "employee_id": "xxx",
  "basic_salary": 50000,
  "house_rent_allowance": 10000,
  "transport_allowance": 3000,
  "medical_allowance": 2000,
  "other_allowances": {
    "food_allowance": 1000,
    "mobile_allowance": 500
  },
  "provident_fund_deduction": 6000,
  "tax_deduction": 8000,
  "other_deductions": {
    "loan_deduction": 2000
  },
  "hourly_rate": 240.38,
  "overtime_rate_multiplier": 1.5,
  "overtime_hourly_rate": 360.58
}
```

### Example Overtime Record
```json
{
  "employee_id": "xxx",
  "date": "2025-11-05",
  "shift_id": "morning-shift-id",
  "scheduled_start_time": "09:00:00",
  "scheduled_end_time": "18:00:00",
  "actual_check_in": "09:05:00",
  "actual_check_out": "20:30:00",
  "regular_hours": 8,
  "overtime_hours": 2.5,
  "overtime_type": "post_shift",
  "hourly_rate": 240.38,
  "overtime_rate": 360.58,
  "regular_amount": 1923.04,
  "overtime_amount": 901.45,
  "total_amount": 2824.49,
  "status": "approved"
}
```

---

## ✅ Summary

### What Exists ✅
1. ✅ Work shifts table with all required fields
2. ✅ Employee shift assignment table
3. ✅ Salary structure table with allowances and deductions
4. ✅ Payroll records with overtime fields
5. ✅ Attendance records with break time tracking
6. ✅ Attendance punch logs
7. ✅ Attendance policies with overtime policy

### What Needs to be Added ⚠️
1. ❌ Hourly rate and overtime rate fields in salary_structures
2. ❌ Dedicated overtime_records table for daily tracking
3. ❌ Trigger/function to auto-calculate hourly rates

### What Needs to be Built 🔨
1. 🔨 Shift management UI and APIs
2. 🔨 Salary structure management UI and APIs
3. 🔨 Overtime tracking and approval system
4. 🔨 Enhanced attendance processing with shift logic
5. 🔨 Payroll calculation system
6. 🔨 Overtime reports and dashboards
7. 🔨 Payroll reports and payslip generation

---

## 🚀 Quick Start Implementation Order

1. **Week 1**: Database schema updates (overtime_records table, hourly rate fields)
2. **Week 2**: Shift management (UI + APIs)
3. **Week 3**: Salary structure management (UI + APIs)
4. **Week 4**: Enhanced attendance processing with shift logic
5. **Week 5**: Overtime tracking and approval system
6. **Week 6**: Payroll calculation system
7. **Week 7**: Reports and dashboards
8. **Week 8**: Testing and refinement

Total estimated time: **2 months** for complete implementation.
