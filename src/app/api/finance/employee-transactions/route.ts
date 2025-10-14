import { NextResponse, NextRequest } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employee_id = searchParams.get('employee_id');

    if (!employee_id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching employee transactions for employee:', employee_id);

    // First, get the employee details to understand the relationship
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, name, employee_id, position')
      .eq('id', employee_id)
      .single();

    if (employeeError) {
      console.error('Error fetching employee:', employeeError);
      return NextResponse.json(
        { success: false, error: 'Employee not found', details: employeeError },
        { status: 404 }
      );
    }

    console.log('✅ Employee data found:', employeeData);

    // Also check if payroll_records table exists and has any data
    const { data: allPayrollRecords, error: payrollTableError } = await supabaseAdmin
      .from('payroll_records')
      .select('id, employee_id')
      .limit(5);

    console.log('📊 Payroll table check:', {
      error: payrollTableError,
      recordCount: allPayrollRecords?.length || 0,
      sampleRecords: allPayrollRecords?.slice(0, 3)
    });

    // Fetch payroll records - try both possible relationships
    // Fetch payroll records for the employee (Professional approach)
    const { data: payrollRecords, error: payrollError } = await supabaseAdmin
      .from('payroll_records')
      .select(`
        id,
        employee_id,
        pay_period_start,
        pay_period_end,
        net_salary,
        status,
        processed_at,
        payment_type
      `)
      .eq('employee_id', employee_id)
      .order('pay_period_start', { ascending: false });

    console.log('💰 Payroll query result (employee_id):', {
      error: payrollError,
      recordCount: payrollRecords?.length || 0,
      records: payrollRecords?.slice(0, 3).map(r => ({
        id: r.id,
        period: `${r.pay_period_start} to ${r.pay_period_end}`,
        net_salary: r.net_salary,
        status: r.status,
        payment_type: r.payment_type
      }))
    });



    if (payrollError) {
      console.error('Error fetching payroll records:', payrollError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payroll records' },
        { status: 500 }
      );
    }

    // Fetch incentives and overtime from expenses table
    const employeeName = employeeData.name || '';
    console.log('🔍 Looking for incentives/overtime expenses for employee:', employeeName);
    
    let { data: expenseRecords } = await supabaseAdmin
      .from('expenses')
      .select(`
        id,
        amount,
        date,
        created_at,
        description,
        category,
        status,
        expense_type,
        entity_type,
        entity_id
      `)
      .eq('category', 'Salaries & Benefits')
      .order('date', { ascending: false });

    // Filter expenses for this employee (both by entity_id and name matching)
    if (expenseRecords && expenseRecords.length > 0) {
      expenseRecords = expenseRecords.filter(expense => {
        // First priority: Direct entity_id match
        if (expense.entity_type === 'employee' && expense.entity_id === employee_id) {
          return true;
        }
        
        // Second priority: Name matching in description for older records
        const desc = expense.description?.toLowerCase() || '';
        const empName = employeeName.toLowerCase();
        
        // Check if description contains employee name parts
        const nameMatches = empName.split(' ').some((namePart: string) => {
          if (namePart.length < 3) return false;
          return desc.includes(namePart.toLowerCase());
        });
        
        // Special cases for common name variations
        const anilMatch = empName.includes('anil') && desc.includes('anil');
        
        return nameMatches || anilMatch;
      });
      
      console.log('💰 Employee expense filtering results:', {
        employeeName,
        filteredCount: expenseRecords.length,
        matchedDescriptions: expenseRecords.map(e => e.description).slice(0, 5)
      });
    }

    console.log(`Found ${payrollRecords?.length || 0} payroll records and ${expenseRecords?.length || 0} incentive/OT expenses for employee: ${employee_id}`);

    const transactions = {
      salary_payments: [] as Array<{
        id: string;
        type: string;
        description: string;
        reference: string;
        amount: number;
        date: string;
        transaction_type: string;
        status: string;
        payroll_record_id?: string;
        can_delete?: boolean;
      }>,
      expense_reimbursements: [] as Array<{
        id: string;
        type: string;
        description: string;
        reference: string;
        amount: number;
        date: string;
        transaction_type: string;
        status: string;
      }>
    };

    // PRIMARY: Process payroll records (net_salary only)
    if (payrollRecords && payrollRecords.length > 0) {
      console.log('✅ Using payroll_records as primary data source');
      
      payrollRecords.forEach((record) => {
        // Only net salary payment
        if (record.net_salary && record.net_salary > 0) {
          // Format payment type for display
          const paymentType = record.payment_type || 'salary';
          const formattedPaymentType = paymentType.charAt(0).toUpperCase() + paymentType.slice(1);
          
          // Create appropriate description based on payment type
          let description = '';
          let transactionType = '';
          
          switch (paymentType.toLowerCase()) {
            case 'salary':
              description = `Monthly Salary - ${employeeData.name} (${record.pay_period_start} to ${record.pay_period_end})`;
              transactionType = 'Salary Payment';
              break;
            case 'overtime':
              description = `Overtime Payment - ${employeeData.name} (${record.pay_period_start} to ${record.pay_period_end})`;
              transactionType = 'Overtime Payment';
              break;
            case 'incentive':
              description = `Incentive Payment - ${employeeData.name} (${record.pay_period_start} to ${record.pay_period_end})`;
              transactionType = 'Incentive Payment';
              break;
            case 'bonus':
              description = `Bonus Payment - ${employeeData.name} (${record.pay_period_start} to ${record.pay_period_end})`;
              transactionType = 'Bonus Payment';
              break;
            case 'allowance':
              description = `Allowance Payment - ${employeeData.name} (${record.pay_period_start} to ${record.pay_period_end})`;
              transactionType = 'Allowance Payment';
              break;
            default:
              description = `${formattedPaymentType} Payment - ${employeeData.name} (${record.pay_period_start} to ${record.pay_period_end})`;
              transactionType = `${formattedPaymentType} Payment`;
          }
          
          transactions.salary_payments.push({
            id: record.id.toString(),
            type: transactionType,
            description: description,
            reference: `PAY-${record.id.slice(-6)}`,
            amount: record.net_salary,
            date: record.pay_period_start || record.pay_period_end,
            transaction_type: 'credit',
            status: record.status === 'paid' ? 'completed' : record.status,
            payroll_record_id: record.id, // For deletion
            can_delete: true // Allow deletion
          });
        }
      });
    }

    
    // Process ALL employee expenses (salary, incentives, overtime, bonuses)
    if (expenseRecords && expenseRecords.length > 0) {
      console.log(`✅ Adding ${expenseRecords.length} employee transactions from expenses`);
      
      expenseRecords.forEach((record) => {
        const desc = record.description?.toLowerCase() || '';
        let transactionType = 'Employee Payment';
        
        // Determine transaction type based on description
        if (desc.includes('salary')) {
          transactionType = 'Salary Payment';
        } else if (desc.includes('incentive')) {
          transactionType = 'Incentive Payment';
        } else if (desc.includes('overtime') || desc.includes('ot')) {
          transactionType = 'Overtime Payment';
        } else if (desc.includes('bonus')) {
          transactionType = 'Bonus Payment';
        } else if (desc.includes('allowance')) {
          transactionType = 'Allowance Payment';
        }
        
        transactions.salary_payments.push({
          id: record.id.toString(),
          type: transactionType,
          description: record.description || `${transactionType} - ${employeeData.name}`,
          reference: `EXP-${record.id}`,
          amount: record.amount || 0,
          date: record.date || record.created_at?.split('T')[0] || '',
          transaction_type: 'credit',
          status: record.status || 'completed'
        });
      });
    }
    
    // Log if no data found
    if ((!payrollRecords || payrollRecords.length === 0) && (!expenseRecords || expenseRecords.length === 0)) {
      console.log('❌ No payroll records or incentive expenses found for employee:', employee_id);
    }

    // Calculate summary - only showing actual payments made (credits)
    const totalSalaryPayments = transactions.salary_payments.reduce((sum: number, txn) => sum + txn.amount, 0);
    const totalExpenses = transactions.expense_reimbursements.reduce((sum: number, txn) => sum + txn.amount, 0);
    
    const summary = {
      totalDebit: 0, // No artificial obligations
      totalCredit: totalSalaryPayments + totalExpenses, // Actual payments made to employee
      netBalance: -(totalSalaryPayments + totalExpenses), // Negative balance shows money paid out
      transactionCount: transactions.salary_payments.length + transactions.expense_reimbursements.length,
      salaryPayments: totalSalaryPayments,
      expenseTotal: totalExpenses
    };

    console.log('✅ Employee transaction summary:', {
      employee_id,
      summary,
      transactionTypes: {
        salary_payments: transactions.salary_payments.length,
        expense_reimbursements: transactions.expense_reimbursements.length
      }
    });

    return NextResponse.json({
      success: true,
      transactions,
      summary
    });

  } catch (error) {
    console.error('Error in employee transactions API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}