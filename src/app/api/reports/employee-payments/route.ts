// app/api/reports/employee-payments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getEmployeePaymentHistory,
  getPendingPayrollForEmployee,
  getEmployeeDetails 
} from '@/lib/expense-integrations/employeePaymentIntegration';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employee_id');
  const reportType = searchParams.get('type') || 'payments';

  if (!employeeId) {
    return NextResponse.json({ error: 'employee_id is required' }, { status: 400 });
  }

  try {
    let result;

    switch (reportType) {
      case 'pending':
        result = await getPendingPayrollForEmployee(employeeId);
        break;
      case 'details':
        result = await getEmployeeDetails(employeeId);
        break;
      case 'payments':
      default:
        result = await getEmployeePaymentHistory(employeeId);
        break;
    }

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching employee payment report:', error);
    return NextResponse.json({ error: 'Failed to fetch employee payment report' }, { status: 500 });
  }
}
