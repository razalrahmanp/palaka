// app/api/finance/bank-accounts/route.ts
import { NextResponse, NextRequest } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountType = searchParams.get('type');

    let query = supabase
      .from("bank_accounts")
      .select("id, name, account_number, current_balance, account_type, is_active")
      .eq("is_active", true);

    // Filter by account type if specified
    if (accountType) {
      query = query.eq("account_type", accountType);
    }

    const { data, error } = await query.order("name", { ascending: true });

    if (error) {
      console.error('Error fetching bank accounts:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    // Enhance each account with payment statistics
    const enhancedData = await Promise.all(
      (data || []).map(async (account) => {
        // Get payment count and methods from payments table
        const { data: payments, error: paymentsError } = await supabase
          .from("payments")
          .select("method")
          .eq("bank_account_id", account.id);

        if (paymentsError) {
          console.error(`Error fetching payments for account ${account.id}:`, paymentsError);
        }

        const payment_count = payments?.length || 0;
        const payment_methods = payments ? 
          [...new Set(payments.map(p => p.method).filter(Boolean))] : [];

        return {
          ...account,
          account_name: account.name,
          payment_count,
          payment_methods,
          currency: 'INR'
        };
      })
    );

    return NextResponse.json({ 
      success: true, 
      data: enhancedData 
    });
  } catch (error) {
    console.error('Unexpected error fetching bank accounts:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch bank accounts" 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const {
      name, // Using 'name' to match the database schema
      account_number,
      current_balance = 0,
      account_type = 'BANK',
      upi_id,
      linked_bank_account_id
    } = await req.json();

    const { data, error } = await supabase
      .from("bank_accounts")
      .insert([{
        name,
        account_number,
        current_balance,
        account_type,
        upi_id,
        linked_bank_account_id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating bank account:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data,
      message: "Bank account created successfully"
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error creating bank account:', error);
    return NextResponse.json({ error: "Failed to create bank account" }, { status: 500 });
  }
}
