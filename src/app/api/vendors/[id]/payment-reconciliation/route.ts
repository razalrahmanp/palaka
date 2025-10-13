import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendorId = params.id;

    // Fetch from expenses table (VendorBillsTab source)
    const { data: expenses, error: expensesError } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('entity_id', vendorId)
      .eq('entity_type', 'vendor')
      .order('date', { ascending: false });

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError);
      return NextResponse.json(
        { success: false, error: expensesError.message },
        { status: 500 }
      );
    }

    // Fetch from vendor_payment_history table (DetailedLedgerView source)
    const { data: vendorPayments, error: paymentsError } = await supabaseAdmin
      .from('vendor_payment_history')
      .select('*')
      .eq('supplier_id', vendorId)
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching vendor payments:', paymentsError);
      return NextResponse.json(
        { success: false, error: paymentsError.message },
        { status: 500 }
      );
    }

    // Calculate totals
    const expensesTotal = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
    const vendorPaymentsTotal = vendorPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    // Find missing transactions
    const expenseIds = new Set(expenses?.map(exp => exp.id) || []);
    const vendorPaymentIds = new Set(vendorPayments?.map(payment => payment.id) || []);

    const onlyInExpenses = expenses?.filter(exp => !vendorPaymentIds.has(exp.id)) || [];
    const onlyInVendorPayments = vendorPayments?.filter(payment => !expenseIds.has(payment.id)) || [];

    // Detailed comparison
    const reconciliation = {
      summary: {
        expensesCount: expenses?.length || 0,
        vendorPaymentsCount: vendorPayments?.length || 0,
        expensesTotal,
        vendorPaymentsTotal,
        difference: expensesTotal - vendorPaymentsTotal,
        onlyInExpensesCount: onlyInExpenses.length,
        onlyInVendorPaymentsCount: onlyInVendorPayments.length
      },
      expenses: expenses || [],
      vendorPayments: vendorPayments || [],
      discrepancies: {
        onlyInExpenses,
        onlyInVendorPayments
      }
    };

    return NextResponse.json({
      success: true,
      data: reconciliation
    });

  } catch (error) {
    console.error('Error in payment reconciliation API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}