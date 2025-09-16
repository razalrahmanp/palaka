// lib/expense-integrations/vendorPaymentIntegration.ts
import { supabase } from "@/lib/supabaseAdmin";

export interface VendorPaymentParams {
  expenseId: string;
  supplierId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  bankAccountId?: string;
  description: string;
  createdBy: string;
  vendorBillId?: string;
}

export interface VendorPaymentResult {
  success: boolean;
  error?: string;
  vendorPaymentId?: string;
  updatedVendorBill?: {
    id: string;
    paid_amount: number;
    remaining_amount: number;
    status: string;
    total_amount: number;
  };
}

/**
 * Creates a vendor payment record and updates related vendor bills
 */
export async function createVendorPaymentIntegration(params: VendorPaymentParams): Promise<VendorPaymentResult> {
  const { 
    expenseId, 
    supplierId, 
    amount, 
    paymentDate, 
    paymentMethod, 
    bankAccountId, 
    description, 
    createdBy,
    vendorBillId 
  } = params;

  try {
    console.log('🏪 Creating vendor payment integration for expense:', expenseId);

    // 1. Create vendor payment history record
    const { data: vendorPayment, error: paymentError } = await supabase
      .from('vendor_payment_history')
      .insert({
        supplier_id: supplierId,
        vendor_bill_id: vendorBillId,
        amount: amount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: `EXP-${expenseId}`,
        bank_account_id: bankAccountId,
        notes: `Expense payment: ${description}`,
        status: 'completed',
        created_by: createdBy
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating vendor payment:', paymentError);
      return { success: false, error: 'Failed to create vendor payment record' };
    }

    console.log('✅ Created vendor payment record:', vendorPayment.id);

    // 2. Update vendor bill if specified
    let updatedVendorBill = null;
    if (vendorBillId) {
      // Get current vendor bill
      const { data: currentBill, error: billError } = await supabase
        .from('vendor_bills')
        .select('paid_amount, total_amount, status')
        .eq('id', vendorBillId)
        .single();

      if (!billError && currentBill) {
        const newPaidAmount = (currentBill.paid_amount || 0) + amount;
        
        let newStatus = 'pending';
        if (newPaidAmount >= currentBill.total_amount) {
          newStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'partial';
        }

        const { data: updatedBill, error: updateError } = await supabase
          .from('vendor_bills')
          .update({
            paid_amount: newPaidAmount,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', vendorBillId)
          .select()
          .single();

        if (!updateError) {
          updatedVendorBill = updatedBill;
          console.log(`✅ Updated vendor bill ${vendorBillId}: paid ${newPaidAmount}/${currentBill.total_amount}, status: ${newStatus}`);
        } else {
          console.error('Error updating vendor bill:', updateError);
        }
      }
    }

    // 3. Update expense record to link with vendor payment
    await supabase
      .from('expenses')
      .update({
        entity_type: 'supplier',
        entity_id: supplierId,
        entity_reference_id: vendorPayment.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', expenseId);

    return {
      success: true,
      vendorPaymentId: vendorPayment.id,
      updatedVendorBill: updatedVendorBill
    };

  } catch (error) {
    console.error('Error in vendor payment integration:', error);
    return { success: false, error: 'Failed to create vendor payment integration' };
  }
}

/**
 * Gets available vendor bills for a supplier
 */
export async function getVendorBillsForSupplier(supplierId: string) {
  try {
    const { data: bills, error } = await supabase
      .from('vendor_bills')
      .select('id, bill_number, bill_date, due_date, total_amount, paid_amount, remaining_amount, status, description')
      .eq('supplier_id', supplierId)
      .in('status', ['pending', 'partial'])
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching vendor bills:', error);
      return { success: false, error: 'Failed to fetch vendor bills' };
    }

    return { success: true, bills: bills || [] };
  } catch (error) {
    console.error('Error in getVendorBillsForSupplier:', error);
    return { success: false, error: 'Failed to fetch vendor bills' };
  }
}

/**
 * Gets vendor payment history for a supplier
 */
export async function getVendorPaymentHistory(supplierId: string) {
  try {
    const { data: payments, error } = await supabase
      .from('vendor_payment_history')
      .select(`
        id,
        amount,
        payment_date,
        payment_method,
        reference_number,
        notes,
        status,
        vendor_bills (
          bill_number,
          bill_date,
          total_amount
        )
      `)
      .eq('supplier_id', supplierId)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('Error fetching vendor payment history:', error);
      return { success: false, error: 'Failed to fetch payment history' };
    }

    return { success: true, payments: payments || [] };
  } catch (error) {
    console.error('Error in getVendorPaymentHistory:', error);
    return { success: false, error: 'Failed to fetch payment history' };
  }
}
