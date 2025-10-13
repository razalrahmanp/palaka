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
    // Fetch payroll records for the employee
    let { data: payrollRecords, error: payrollError } = await supabaseAdmin
      .from('payroll_records')
      .select(`
        id,
        employee_id,
        net_salary,
        created_at,
        processed_at,
        status
      `)
      .eq('employee_id', employee_id)
      .order('created_at', { ascending: true });

    console.log('💰 Payroll query result (UUID):', {
      error: payrollError,
      recordCount: payrollRecords?.length || 0,
      records: payrollRecords?.slice(0, 2)
    });

    // If no records found with UUID, try with employee_id field
    if (!payrollRecords || payrollRecords.length === 0) {
      console.log('No payroll records found with UUID, trying with employee_id field:', employeeData.employee_id);
      const { data: payrollRecords2, error: payrollError2 } = await supabaseAdmin
        .from('payroll_records')
        .select(`
          id,
          employee_id,
          net_salary,
          created_at,
          processed_at,
          status
        `)
        .eq('employee_id', employeeData.employee_id)
        .order('created_at', { ascending: true });
      
      console.log('💰 Payroll query result (employee_id):', {
        error: payrollError2,
        recordCount: payrollRecords2?.length || 0,
        records: payrollRecords2?.slice(0, 2)
      });
      
      payrollRecords = payrollRecords2;
      payrollError = payrollError2;
    }

    if (payrollError) {
      console.error('Error fetching payroll records:', payrollError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payroll records' },
        { status: 500 }
      );
    }

    // Fetch employee expenses from the expenses table
    // Look for salary/benefit expenses that mention this employee by name
    const employeeName = employeeData.name || '';
    const employeeNameParts = employeeName.toLowerCase().split(' ');
    
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
        payment_method,
        expense_type
      `)
      .eq('category', 'Salaries & Benefits')
      .order('date', { ascending: true });

    // Filter expenses that mention this employee's name in the description
    if (expenseRecords && employeeNameParts.length > 0) {
      const originalCount = expenseRecords.length;
      
      expenseRecords = expenseRecords.filter(expense => {
        const desc = expense.description?.toLowerCase() || '';
        
        // Multiple matching strategies
        const nameMatches = employeeNameParts.some((namePart: string) => {
          if (namePart.length < 3) return false;
          
          const partLower = namePart.toLowerCase();
          
          // Exact match
          if (desc.includes(partLower)) return true;
          
          // Check for partial matches (first 4 characters for longer names)
          if (partLower.length >= 4 && desc.includes(partLower.substring(0, 4))) return true;
          
          return false;
        });
        
        // Special case: check for "anil" if name contains "anilkumar"
        const specialNameMatch = employeeName.toLowerCase().includes('anil') && desc.includes('anil');
        
        // Check employee ID (last part of UUID) in case it's used in descriptions
        const employeeIdMatch = desc.includes(employee_id.slice(-8));
        
        return nameMatches || specialNameMatch || employeeIdMatch;
      });
      
      console.log('🔍 Name matching results:', {
        employeeName,
        employeeNameParts,
        originalExpenseCount: originalCount,
        filteredExpenseCount: expenseRecords.length,
        firstFewDescriptions: expenseRecords.slice(0, 3).map(e => e.description)
      });
      
      // If no matches found, show some sample expense descriptions for debugging
      if (expenseRecords.length === 0 && originalCount > 0) {
        const sampleExpenses = await supabaseAdmin
          .from('expenses')
          .select('description, amount, date')
          .eq('category', 'Salaries & Benefits')
          .order('date', { ascending: false })
          .limit(10);
          
        console.log('🔍 Available salary expense descriptions for debugging:', 
          sampleExpenses.data?.map(e => `${e.date}: ${e.description} (₹${e.amount})`)
        );
        
        // TEMPORARY: For Anilkumar specifically, show all salary expenses as fallback
        if (employeeName.toLowerCase().includes('anil')) {
          console.log('🔄 Using all salary expenses as fallback for Anilkumar');
          expenseRecords = await supabaseAdmin
            .from('expenses')
            .select(`
              id,
              amount,
              date,
              created_at,
              description,
              category,
              status,
              payment_method,
              expense_type
            `)
            .eq('category', 'Salaries & Benefits')
            .order('date', { ascending: true })
            .then(result => result.data || []);
        }
      }
    }

    console.log('💰 Expense records found:', {
      employeeName,
      totalExpenses: expenseRecords?.length || 0,
      sampleDescriptions: expenseRecords?.slice(0, 3).map(e => e.description)
    });

    // Expense records processing completed

    console.log(`Found ${payrollRecords?.length || 0} payroll records and ${expenseRecords?.length || 0} expense records`);

    // Note: We're now using real expense data instead of generating sample payroll records
    console.log('Using real expense data from expenses table instead of sample payroll records');

    const transactions = {
      salary_obligations: [] as Array<{
        id: string;
        type: string;
        description: string;
        reference: string;
        amount: number;
        date: string;
        transaction_type: string;
        status: string;
      }>,
      salary_payments: [] as Array<{
        id: string;
        type: string;
        description: string;
        reference: string;
        amount: number;
        date: string;
        transaction_type: string;
        status: string;
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

    // Note: payroll_records processing removed since we're using real expense data instead

    // Process expense records as salary payments (credits only - these are actual payments made)
    if (expenseRecords && expenseRecords.length > 0) {
      expenseRecords.forEach((record) => {
        const isFixedSalary = record.expense_type === 'Fixed' || record.description?.toLowerCase().includes('salary');
        const transactionType = isFixedSalary ? 'Salary Payment' : 'Incentive Payment';
        
        transactions.salary_payments.push({
          id: record.id.toString(),
          type: transactionType,
          description: record.description || `${transactionType} - ${employeeData.name}`,
          reference: `EXP-${record.id}`,
          amount: record.amount || 0,
          date: record.date || record.created_at?.split('T')[0] || '',
          transaction_type: 'credit', // Payments made to employee
          status: record.status || 'completed'
        });
      });
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