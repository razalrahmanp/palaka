import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function PUT(request: NextRequest) {
  try {
    const { 
      supplier_id, 
      new_amount, 
      description = 'Updated opening balance'
    } = await request.json();

    if (!supplier_id || new_amount === undefined) {
      return NextResponse.json(
        { error: 'supplier_id and new_amount are required' },
        { status: 400 }
      );
    }

    // Get current vendor bills for this supplier with opening balance reference
    const { data: existingBills, error: billsError } = await supabase
      .from('vendor_bills')
      .select('*')
      .eq('supplier_id', supplier_id)
      .ilike('reference_number', 'OB-%')
      .eq('status', 'pending');

    if (billsError) throw billsError;

    // Get supplier info
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('name')
      .eq('id', supplier_id)
      .single();

    if (supplierError) throw supplierError;

    const supplierName = supplier?.name || 'Unknown Supplier';

    // Get system user for entries
    const { data: systemUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();

    if (!systemUser) {
      throw new Error('No users found in system');
    }

    let updatedBill = null;
    let newBill = null;

    if (new_amount === 0) {
      // If new amount is 0, mark existing bills as paid
      if (existingBills && existingBills.length > 0) {
        for (const bill of existingBills) {
          // Update bill to paid
          const { data: paidBill } = await supabase
            .from('vendor_bills')
            .update({
              paid_amount: bill.total_amount,
              remaining_amount: 0,
              status: 'paid',
              updated_by: systemUser.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', bill.id)
            .select()
            .single();

          // Create payment history
          if (paidBill) {
            await supabase
              .from('vendor_payment_history')
              .insert({
                supplier_id: supplier_id,
                vendor_bill_id: bill.id,
                payment_number: `PAY-UPD-${Date.now()}`,
                payment_date: new Date().toISOString().split('T')[0],
                amount: bill.total_amount,
                payment_method: 'ADJUSTMENT',
                status: 'completed',
                description: `Opening balance adjustment - marked as paid`,
                reference_number: `ADJ-${bill.bill_number}`,
                created_by: systemUser.id
              });
          }
        }
      }
    } else {
      // Update or create vendor bill
      if (existingBills && existingBills.length > 0) {
        // Update existing bill
        const existingBill = existingBills[0];
        const { data: updated, error: updateError } = await supabase
          .from('vendor_bills')
          .update({
            total_amount: new_amount,
            remaining_amount: new_amount - (existingBill.paid_amount || 0),
            description: `${description} - ${supplierName}`,
            updated_by: systemUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBill.id)
          .select()
          .single();

        if (updateError) throw updateError;
        updatedBill = updated;
      } else {
        // Create new vendor bill
        const billNumber = `OB-UPD-${supplier_id.substring(0, 8)}-${Date.now()}`;
        
        const { data: created, error: createError } = await supabase
          .from('vendor_bills')
          .insert({
            bill_number: billNumber,
            supplier_id: supplier_id,
            bill_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            total_amount: new_amount,
            paid_amount: 0,
            remaining_amount: new_amount,
            status: 'pending',
            description: `${description} - ${supplierName}`,
            reference_number: `OB-UPD-${supplier_id}`,
            created_by: systemUser.id,
            updated_by: systemUser.id
          })
          .select()
          .single();

        if (createError) throw createError;
        newBill = created;
      }
    }

    // Create journal entry for the adjustment
    const journalNumber = `OB-ADJ-${Date.now()}`;
    const adjustmentAmount = new_amount;

    // Get accounts payable account
    const { data: payableAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('account_code', '2100')
      .single();

    // Get owner's equity account
    const { data: equityAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('account_code', '3000')
      .single();

    if (payableAccount && equityAccount) {
      const { data: journal } = await supabase
        .from('journal_entries')
        .insert({
          journal_number: journalNumber,
          entry_date: new Date().toISOString().split('T')[0],
          description: `Opening balance adjustment - ${supplierName}`,
          entry_type: 'ADJUSTMENT',
          total_debit: adjustmentAmount,
          total_credit: adjustmentAmount,
          status: 'POSTED',
          created_by: systemUser.id
        })
        .select()
        .single();

      if (journal) {
        const lines = [];
        
        if (adjustmentAmount > 0) {
          // Increase liability
          lines.push({
            journal_entry_id: journal.id,
            line_number: 1,
            account_id: equityAccount.id,
            description: `Opening balance increase - ${supplierName}`,
            debit_amount: adjustmentAmount,
            credit_amount: 0
          });
          lines.push({
            journal_entry_id: journal.id,
            line_number: 2,
            account_id: payableAccount.id,
            description: `Opening balance increase - ${supplierName}`,
            debit_amount: 0,
            credit_amount: adjustmentAmount
          });
        } else {
          // Decrease liability (payment)
          lines.push({
            journal_entry_id: journal.id,
            line_number: 1,
            account_id: payableAccount.id,
            description: `Opening balance payment - ${supplierName}`,
            debit_amount: Math.abs(adjustmentAmount),
            credit_amount: 0
          });
          lines.push({
            journal_entry_id: journal.id,
            line_number: 2,
            account_id: equityAccount.id,
            description: `Opening balance payment - ${supplierName}`,
            debit_amount: 0,
            credit_amount: Math.abs(adjustmentAmount)
          });
        }

        await supabase
          .from('journal_entry_lines')
          .insert(lines);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        supplier_id,
        supplier_name: supplierName,
        new_amount,
        action: newBill ? 'created' : updatedBill ? 'updated' : 'marked_paid',
        bill_id: newBill?.id || updatedBill?.id,
        journal_number: journalNumber,
        message: `Supplier opening balance updated. Changes will reflect in Supplier Outstanding tab.`
      }
    });

  } catch (error) {
    console.error('Supplier opening balance update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update supplier opening balance' },
      { status: 500 }
    );
  }
}
