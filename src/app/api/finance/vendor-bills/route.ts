// src/app/api/finance/vendor-bills/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface VendorBill {
  id?: string;
  bill_number: string;
  supplier_id: string;
  purchase_order_id?: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  paid_amount?: number;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue';
  description?: string;
  reference_number?: string;
  notes?: string;
  created_by?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplier_id');
    const status = searchParams.get('status');
    const includeSupplier = searchParams.get('include_supplier') === 'true';

    console.log('📋 Fetching vendor bills...');

    let query = supabase
      .from('vendor_bills')
      .select(`
        id,
        bill_number,
        supplier_id,
        purchase_order_id,
        bill_date,
        due_date,
        total_amount,
        paid_amount,
        status,
        description,
        reference_number,
        notes,
        created_at,
        ${includeSupplier ? `
        suppliers:supplier_id (
          id,
          name,
          company_name,
          email,
          phone,
          address
        ),
        purchase_orders:purchase_order_id (
          id,
          order_number,
          status
        )` : ''}
      `)
      .order('bill_date', { ascending: false });

    // Apply filters
    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: vendorBills, error } = await query;

    if (error) {
      console.error('❌ Error fetching vendor bills:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ Found ${vendorBills?.length || 0} vendor bills`);

    return NextResponse.json({
      success: true,
      data: vendorBills || [],
      count: vendorBills?.length || 0
    });

  } catch (error) {
    console.error('❌ Error in vendor bills API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const billData: VendorBill = await request.json();

    console.log('📝 Creating vendor bill:', billData);

    // Get system user for created_by
    const { data: systemUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();

    // Generate bill number if not provided
    let billNumber = billData.bill_number;
    if (!billNumber) {
      const timestamp = Date.now();
      billNumber = `VB-${timestamp.toString().slice(-8)}`;
    }

    // Calculate due date if not provided (30 days default)
    let dueDate = billData.due_date;
    if (!dueDate) {
      const billDate = new Date(billData.bill_date);
      billDate.setDate(billDate.getDate() + 30);
      dueDate = billDate.toISOString().split('T')[0];
    }

    // Create vendor bill
    const { data: vendorBill, error: billError } = await supabase
      .from('vendor_bills')
      .insert({
        bill_number: billNumber,
        supplier_id: billData.supplier_id,
        purchase_order_id: billData.purchase_order_id || null,
        bill_date: billData.bill_date,
        due_date: dueDate,
        total_amount: billData.total_amount,
        paid_amount: billData.paid_amount || 0,
        status: billData.status || 'pending',
        description: billData.description,
        reference_number: billData.reference_number,
        notes: billData.notes,
        created_by: systemUser?.id
      })
      .select()
      .single();

    if (billError) {
      console.error('❌ Error creating vendor bill:', billError);
      return NextResponse.json({ error: billError.message }, { status: 500 });
    }

    console.log('✅ Created vendor bill:', vendorBill.id);

    // Create accounting journal entry for the bill
    try {
      await createVendorBillJournalEntry(vendorBill);
    } catch (journalError) {
      console.warn('⚠️ Journal entry creation failed:', journalError);
      // Don't fail the bill creation if journal entry fails
    }

    return NextResponse.json({
      success: true,
      data: vendorBill,
      message: 'Vendor bill created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating vendor bill:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Helper function to create journal entry for vendor bill
async function createVendorBillJournalEntry(vendorBill: VendorBill & { id: string; created_by: string }) {
  try {
    const journalNumber = `JE-VB-${vendorBill.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

    // Create journal entry
    const { data: journalEntry, error: journalError } = await supabase
      .from('journal_entries')
      .insert({
        journal_number: journalNumber,
        date: vendorBill.bill_date,
        description: `Vendor Bill ${vendorBill.bill_number} - ${vendorBill.description || 'Vendor Bill'}`,
        reference_number: vendorBill.bill_number,
        source_document_type: 'VENDOR_BILL',
        source_document_id: vendorBill.id,
        total_amount: vendorBill.total_amount,
        created_by: vendorBill.created_by
      })
      .select()
      .single();

    if (journalError) throw journalError;

    // Get chart of accounts
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name')
      .in('account_code', ['2100', '5100']); // Accounts Payable, Cost of Goods Sold

    const accountsPayable = accounts?.find(acc => acc.account_code === '2100');
    const costOfGoods = accounts?.find(acc => acc.account_code === '5100');

    if (!accountsPayable || !costOfGoods) {
      throw new Error('Required accounts not found');
    }

    // Create journal entry lines
    const journalLines = [
      {
        journal_entry_id: journalEntry.id,
        account_id: costOfGoods.id,
        debit_amount: vendorBill.total_amount,
        credit_amount: 0,
        description: `Cost of Goods - ${vendorBill.description || 'Vendor Bill'}`
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: accountsPayable.id,
        debit_amount: 0,
        credit_amount: vendorBill.total_amount,
        description: `Accounts Payable - ${vendorBill.bill_number}`
      }
    ];

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(journalLines);

    if (linesError) throw linesError;

    // Update chart of accounts balances
    await Promise.all([
      // Increase Cost of Goods Sold (Debit)
      supabase.rpc('increment_account_balance', {
        account_id: costOfGoods.id,
        amount: vendorBill.total_amount
      }),
      // Increase Accounts Payable (Credit)
      supabase.rpc('increment_account_balance', {
        account_id: accountsPayable.id,
        amount: vendorBill.total_amount
      })
    ]);

    console.log('✅ Created vendor bill journal entry:', journalEntry.journal_number);

  } catch (error) {
    console.error('❌ Error creating vendor bill journal entry:', error);
    throw error;
  }
}
