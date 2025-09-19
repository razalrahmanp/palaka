// app/api/vendors/[id]/sync-expenses/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;

    console.log('🔄 Starting vendor payment to expense sync for vendor:', vendorId);

    // Get all vendor payments that don't have corresponding expense records
    const { data: vendorPayments, error: paymentsError } = await supabase
      .from('vendor_payment_history')
      .select('*')
      .eq('supplier_id', vendorId)
      .eq('status', 'completed');

    if (paymentsError) {
      console.error('Error fetching vendor payments:', paymentsError);
      return NextResponse.json(
        { error: 'Failed to fetch vendor payments' },
        { status: 500 }
      );
    }

    if (!vendorPayments || vendorPayments.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: 'No vendor payments found to sync'
      });
    }

    // Get existing expense records for this vendor to avoid duplicates
    const { data: existingExpenses, error: expensesError } = await supabase
      .from('expenses')
      .select('entity_reference_id')
      .eq('entity_type', 'supplier')
      .eq('entity_id', vendorId);

    if (expensesError) {
      console.error('Error fetching existing expenses:', expensesError);
      return NextResponse.json(
        { error: 'Failed to fetch existing expenses' },
        { status: 500 }
      );
    }

    const existingReferenceIds = new Set(
      existingExpenses?.map(exp => exp.entity_reference_id).filter(Boolean) || []
    );

    // Get vendor details for expense description
    const { data: vendor } = await supabase
      .from('suppliers')
      .select('name')
      .eq('id', vendorId)
      .single();

    const vendorName = vendor?.name || 'Unknown Vendor';

    // Filter payments that don't have corresponding expense records
    const paymentsToSync = vendorPayments.filter(
      payment => !existingReferenceIds.has(payment.id)
    );

    if (paymentsToSync.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: 'All vendor payments are already synced to expenses'
      });
    }

    console.log(`📋 Found ${paymentsToSync.length} vendor payments to sync to expenses`);

    // Create expense records for unsynced payments
    const expenseRecords = paymentsToSync.map(payment => {
      const expenseDescription = payment.vendor_bill_id 
        ? `Payment for vendor bill - ${vendorName}` 
        : `Vendor payment - ${vendorName}`;

      return {
        date: payment.payment_date || new Date().toISOString().split('T')[0],
        category: 'Manufacturing', // Use valid category from schema
        type: 'Direct',
        description: `${expenseDescription}${payment.notes ? ` (${payment.notes})` : ''}`,
        amount: parseFloat(payment.amount),
        payment_method: payment.payment_method || 'cash',
        entity_type: 'supplier',
        entity_id: vendorId,
        entity_reference_id: payment.id,
        created_by: payment.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    // Insert expense records
    const { data: createdExpenses, error: insertError } = await supabase
      .from('expenses')
      .insert(expenseRecords)
      .select();

    if (insertError) {
      console.error('Error creating expense records:', insertError);
      return NextResponse.json(
        { error: 'Failed to create expense records' },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully synced ${createdExpenses?.length || 0} vendor payments to expenses`);

    return NextResponse.json({
      success: true,
      synced: createdExpenses?.length || 0,
      message: `Successfully synced ${createdExpenses?.length || 0} vendor payments to expenses`
    });

  } catch (error) {
    console.error('Error in vendor payment sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}