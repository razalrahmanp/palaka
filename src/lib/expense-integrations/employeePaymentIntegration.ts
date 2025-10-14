// lib/expense-integrations/employeePaymentIntegration.ts
import { supabase } from "@/lib/supabaseAdmin";

export interface EmployeePaymentParams {
  expenseId: string;
  employeeId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  bankAccountId?: string;
  description: string;
  createdBy: string;
  paymentType: 'salary' | 'bonus' | 'allowance' | 'overtime' | 'incentive' | 'reimbursement';
  payrollRecordId?: string;
}

export interface EmployeePaymentResult {
  success: boolean;
  error?: string;
  payrollUpdateId?: string;
  bonusRecordId?: string;
}

/**
 * Creates employee payment integration and updates payroll records
 */
export async function createEmployeePaymentIntegration(params: EmployeePaymentParams): Promise<EmployeePaymentResult> {
  const { 
    expenseId, 
    employeeId, 
    amount, 
    paymentDate, 
    // paymentMethod, // Reserved for future use
    // bankAccountId, // Reserved for future use
    // description, // Reserved for future use
    createdBy,
    paymentType,
    payrollRecordId 
  } = params;

  try {
    console.log('👥 Creating employee payment integration for expense:', expenseId);

    let payrollUpdateId = null;
    let bonusRecordId = null;

    // Handle different payment types
    if (paymentType === 'salary' && payrollRecordId) {
      // Update existing payroll record status
      const { data: updatedPayroll, error: payrollError } = await supabase
        .from('payroll_records')
        .update({
          status: 'paid',
          processed_at: new Date().toISOString()
        })
        .eq('id', payrollRecordId)
        .eq('employee_id', employeeId)
        .select()
        .single();

      if (payrollError) {
        console.error('Error updating payroll record:', payrollError);
        return { success: false, error: 'Failed to update payroll record' };
      }

      payrollUpdateId = updatedPayroll.id;
      console.log('✅ Updated payroll record status to paid:', payrollUpdateId);

    } else if (paymentType === 'salary' && !payrollRecordId) {
      // Create a new salary payroll record
      const payPeriodStart = new Date(paymentDate);
      const payPeriodEnd = new Date(paymentDate);
      
      const { data: salaryPayroll, error: salaryError } = await supabase
        .from('payroll_records')
        .insert({
          employee_id: employeeId,
          pay_period_start: payPeriodStart.toISOString().split('T')[0],
          pay_period_end: payPeriodEnd.toISOString().split('T')[0],
          basic_salary: amount,
          total_allowances: 0,
          total_deductions: 0,
          gross_salary: amount,
          net_salary: amount,
          working_days: 30, // Default for monthly salary
          present_days: 30,
          leave_days: 0,
          overtime_hours: 0,
          overtime_amount: 0,
          bonus: 0,
          status: 'paid',
          processed_by: createdBy,
          processed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (salaryError) {
        console.error('Error creating salary payroll record:', salaryError);
        return { success: false, error: 'Failed to create salary payroll record' };
      }

      payrollUpdateId = salaryPayroll.id;
      console.log('✅ Created new salary payroll record:', payrollUpdateId);

    } else if (['bonus', 'allowance', 'overtime', 'incentive', 'reimbursement'].includes(paymentType)) {
      // Create a separate bonus/allowance/incentive payroll record
      const payPeriodStart = new Date(paymentDate);
      const payPeriodEnd = new Date(paymentDate);
      
      const { data: bonusPayroll, error: bonusError } = await supabase
        .from('payroll_records')
        .insert({
          employee_id: employeeId,
          pay_period_start: payPeriodStart.toISOString().split('T')[0],
          pay_period_end: payPeriodEnd.toISOString().split('T')[0],
          basic_salary: 0,
          total_allowances: paymentType === 'allowance' ? amount : 0,
          total_deductions: 0,
          gross_salary: amount,
          net_salary: amount,
          working_days: 1,
          present_days: 1,
          leave_days: 0,
          overtime_hours: paymentType === 'overtime' ? 8 : 0,
          overtime_amount: paymentType === 'overtime' ? amount : 0,
          bonus: (paymentType === 'bonus' || paymentType === 'incentive') ? amount : 0,
          status: 'paid',
          processed_by: createdBy,
          processed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (bonusError) {
        console.error('Error creating bonus payroll record:', bonusError);
        return { success: false, error: 'Failed to create bonus payroll record' };
      }

      bonusRecordId = bonusPayroll.id;
      console.log(`✅ Created ${paymentType} payroll record:`, bonusRecordId);
    }

    // Update expense record to link with employee payment
    await supabase
      .from('expenses')
      .update({
        entity_type: 'employee',
        entity_id: employeeId,
        entity_reference_id: payrollUpdateId || bonusRecordId,
        updated_at: new Date().toISOString()
      })
      .eq('id', expenseId);

    console.log('✅ Linked expense to employee payment');

    return {
      success: true,
      payrollUpdateId: payrollUpdateId,
      bonusRecordId: bonusRecordId
    };

  } catch (error) {
    console.error('Error in employee payment integration:', error);
    return { success: false, error: 'Failed to create employee payment integration' };
  }
}

/**
 * Gets pending payroll records for an employee
 */
export async function getPendingPayrollForEmployee(employeeId: string) {
  try {
    const { data: payrollRecords, error } = await supabase
      .from('payroll_records')
      .select(`
        id,
        pay_period_start,
        pay_period_end,
        basic_salary,
        total_allowances,
        total_deductions,
        gross_salary,
        net_salary,
        bonus,
        overtime_amount,
        status,
        salary_structures (
          structure_name,
          basic_salary
        )
      `)
      .eq('employee_id', employeeId)
      .eq('status', 'processed')
      .order('pay_period_start', { ascending: false });

    if (error) {
      console.error('Error fetching pending payroll:', error);
      return { success: false, error: 'Failed to fetch pending payroll' };
    }

    return { success: true, payrollRecords: payrollRecords || [] };
  } catch (error) {
    console.error('Error in getPendingPayrollForEmployee:', error);
    return { success: false, error: 'Failed to fetch pending payroll' };
  }
}

/**
 * Gets employee payment history
 */
export async function getEmployeePaymentHistory(employeeId: string) {
  try {
    const { data: payments, error } = await supabase
      .from('payroll_records')
      .select(`
        id,
        pay_period_start,
        pay_period_end,
        basic_salary,
        total_allowances,
        total_deductions,
        gross_salary,
        net_salary,
        bonus,
        overtime_amount,
        overtime_hours,
        status,
        processed_at,
        salary_structures (
          structure_name
        )
      `)
      .eq('employee_id', employeeId)
      .eq('status', 'paid')
      .order('processed_at', { ascending: false });

    if (error) {
      console.error('Error fetching employee payment history:', error);
      return { success: false, error: 'Failed to fetch payment history' };
    }

    return { success: true, payments: payments || [] };
  } catch (error) {
    console.error('Error in getEmployeePaymentHistory:', error);
    return { success: false, error: 'Failed to fetch payment history' };
  }
}

/**
 * Gets employee details with current salary structure
 */
export async function getEmployeeDetails(employeeId: string) {
  try {
    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        id,
        name,
        employee_id,
        position,
        salary,
        department,
        salary_structures (
          id,
          structure_name,
          basic_salary,
          allowances,
          deductions
        )
      `)
      .eq('id', employeeId)
      .single();

    if (error) {
      console.error('Error fetching employee details:', error);
      return { success: false, error: 'Failed to fetch employee details' };
    }

    return { success: true, employee };
  } catch (error) {
    console.error('Error in getEmployeeDetails:', error);
    return { success: false, error: 'Failed to fetch employee details' };
  }
}
