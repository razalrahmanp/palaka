// app/api/reports/vendor-payments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get('supplier_id');
  const reportType = searchParams.get('type') || 'payments';

  try {
    if (supplierId) {
      // Single vendor payment history
      const { 
        getVendorPaymentHistory,
        getVendorBillsForSupplier 
      } = await import('@/lib/expense-integrations/vendorPaymentIntegration');

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
    } else {
      // All vendor payments for cash flow
      console.log('🏪 Fetching all vendor payments for cash flow...');
      
      const { data: vendorPayments, error } = await supabase
        .from('vendor_payment_history')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          reference_number,
          notes,
          status,
          created_at,
          suppliers!inner(
            id,
            name
          )
        `)
        .eq('status', 'completed')
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching all vendor payments:', error);
        return NextResponse.json({ error: 'Failed to fetch vendor payments' }, { status: 500 });
      }

      // Format the data for cash flow consumption
      const formattedPayments = vendorPayments?.map(payment => {
        // Handle suppliers relationship - could be array or object
        let supplierName = 'Unknown Vendor';
        if (payment.suppliers) {
          if (Array.isArray(payment.suppliers) && payment.suppliers.length > 0) {
            supplierName = payment.suppliers[0].name || 'Unknown Vendor';
          } else if (!Array.isArray(payment.suppliers)) {
            supplierName = (payment.suppliers as { name?: string }).name || 'Unknown Vendor';
          }
        }

        return {
          id: payment.id,
          amount: payment.amount,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
          reference_number: payment.reference_number,
          description: payment.notes || 'Vendor payment',
          supplier_name: supplierName,
          created_at: payment.created_at
        };
      }) || [];

      console.log(`✅ Found ${formattedPayments.length} vendor payments for cash flow`);
      return NextResponse.json(formattedPayments);
    }
  } catch (error) {
    console.error('Error fetching vendor payment report:', error);
    return NextResponse.json({ error: 'Failed to fetch vendor payment report' }, { status: 500 });
  }
}
