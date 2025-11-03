// app/api/finance/bank-accounts/route.ts
import { NextResponse, NextRequest } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

// Disable Next.js caching for real-time data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountType = searchParams.get('type');
    const accountId = searchParams.get('id');
    const refresh = searchParams.get('refresh') === 'true';
    const timestamp = searchParams.get('_t');
    
    console.log('🏦 Fetching bank accounts...', {
      refresh,
      timestamp,
      bypassCache: refresh || !!timestamp,
      accountType,
      accountId
    });

    let query = supabase
      .from("bank_accounts")
      .select("id, name, account_number, current_balance, account_type, is_active")
      .eq("is_active", true);

    // Filter by account ID if specified
    if (accountId) {
      query = query.eq("id", accountId);
    }

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

    const response = NextResponse.json({ 
      success: true, 
      data: enhancedData 
    });
    
    // Add cache-busting headers when refresh is requested
    if (refresh || timestamp) {
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }
    
    return response;
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
