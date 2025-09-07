// Enhanced Payment API Route with User Context
// Place this in: src/app/api/finance/payments/with-user/route.ts

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const body = await req.json();
  const { 
    invoice_id, 
    amount, 
    payment_date, 
    date, 
    method, 
    reference, 
    description, 
    bank_account_id
    // user_id is now optional - will auto-select from users table
  } = body;

  if (!amount || !method) {
    return NextResponse.json({ error: "Missing required fields: amount, method" }, { status: 400 });
  }

  try {
    // Try using the enhanced stored procedure (it will auto-select user)
    const { data: result, error: procError } = await supabase
      .rpc('create_payment_with_user_context', {
        p_invoice_id: invoice_id,
        p_amount: parseFloat(amount),
        p_payment_date: payment_date,
        p_date_fallback: date,
        p_method: method,
        p_reference: reference,
        p_description: description,
        p_bank_account_id: bank_account_id,
        p_user_id: null  // Let the function auto-select any user
      });

    if (procError) {
      console.error('Stored procedure error:', procError);
      // Fall back to manual creation
      return createPaymentManually(body);
    }

    if (result && result.success) {
      console.log(`✅ Payment created with user context: ${result.payment_id}, Journal: ${result.journal_entry_id}, User: ${result.user_id}`);
      
      return NextResponse.json({
        success: true,
        payment_id: result.payment_id,
        journal_entry_id: result.journal_entry_id,
        user_id: result.user_id,
        accounting_integration: true,
        message: result.message
      });
    } else {
      return NextResponse.json({ 
        error: result?.error || "Unknown error in stored procedure",
        accounting_integration: false
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error calling enhanced payment procedure:', error);
    return createPaymentManually(body);
  }
}

// Fallback method when stored procedure is not available
async function createPaymentManually(body: {
  invoice_id?: string;
  amount: number;
  payment_date?: string;
  date?: string;
  method: string;
  reference?: string;
  description?: string;
  bank_account_id?: string;
}) {
  const { invoice_id, amount, payment_date, date, method, reference, description, bank_account_id } = body;
  
  try {
    // Create payment record manually
    const { data: payment, error: insertError } = await supabase
      .from("payments")
      .insert([{ 
        invoice_id, 
        amount: amount, 
        payment_date: payment_date,
        date: date || new Date().toISOString().split('T')[0],
        method,
        reference,
        description,
        bank_account_id
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update invoice paid amount if invoice_id provided
    if (invoice_id) {
      const { data: payments, error: fetchError } = await supabase
        .from("payments")
        .select("amount")
        .eq("invoice_id", invoice_id);

      if (!fetchError && payments) {
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        
        await supabase
          .from("invoices")
          .update({ paid_amount: totalPaid })
          .eq("id", invoice_id);
      }
    }

    console.log(`✅ Manual payment created: ${payment.id}`);

    return NextResponse.json({ 
      success: true,
      payment_id: payment.id,
      accounting_integration: false,
      message: "Payment recorded (manual mode - enhanced automation not available)"
    });

  } catch (error) {
    console.error('Error creating payment manually:', error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}

// Get active users for payment creation
export async function GET() {
  try {
    const { data: users, error } = await supabase
      .rpc('get_active_users_for_payments');

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error in GET users:', error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
