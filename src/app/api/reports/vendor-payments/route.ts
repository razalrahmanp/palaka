// app/api/reports/vendor-payments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getVendorPaymentHistory,
  getVendorBillsForSupplier 
} from '@/lib/expense-integrations/vendorPaymentIntegration';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get('supplier_id');
  const reportType = searchParams.get('type') || 'payments';

  if (!supplierId) {
    return NextResponse.json({ error: 'supplier_id is required' }, { status: 400 });
  }

  try {
    let result;

    switch (reportType) {
      case 'bills':
        result = await getVendorBillsForSupplier(supplierId);
        break;
      case 'payments':
      default:
        result = await getVendorPaymentHistory(supplierId);
        break;
    }

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching vendor payment report:', error);
    return NextResponse.json({ error: 'Failed to fetch vendor payment report' }, { status: 500 });
  }
}
