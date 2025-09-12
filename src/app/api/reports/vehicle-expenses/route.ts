// app/api/reports/vehicle-expenses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getVehicleExpenseHistory,
  getVehicleMaintenanceHistory,
  getVehicleExpenseSummary 
} from '@/lib/expense-integrations/vehicleExpenseIntegration';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const truckId = searchParams.get('truck_id');
  const reportType = searchParams.get('type') || 'summary';
  const period = searchParams.get('period') as '30d' | '90d' | '1y' | undefined;

  if (!truckId) {
    return NextResponse.json({ error: 'truck_id is required' }, { status: 400 });
  }

  try {
    let result;

    switch (reportType) {
      case 'expenses':
        result = await getVehicleExpenseHistory(truckId);
        break;
      case 'maintenance':
        result = await getVehicleMaintenanceHistory(truckId);
        break;
      case 'summary':
      default:
        result = await getVehicleExpenseSummary(truckId, period);
        break;
    }

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching vehicle expense report:', error);
    return NextResponse.json({ error: 'Failed to fetch vehicle expense report' }, { status: 500 });
  }
}
