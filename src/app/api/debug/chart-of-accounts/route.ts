// API endpoint to check current chart of accounts
// src/app/api/debug/chart-of-accounts/route.ts

import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log('🔍 Fetching chart of accounts...');
    
    // Get all chart of accounts
    const { data: allAccounts, error: allError } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .order('account_code');
    
    if (allError) {
      console.error('Error fetching chart of accounts:', allError);
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }
    
    // Get payment-related accounts specifically
    const { data: paymentAccounts, error: paymentError } = await supabase
      .from('chart_of_accounts')
      .select('account_code, account_name, account_type, account_subtype, current_balance, is_active')
      .in('account_code', ['1001', '1010', '1011', '1012', '1020', '1025', '1026', '1030', '1031', '1100', '1200'])
      .order('account_code');
    
    // Get asset accounts
    const { data: assetAccounts, error: assetError } = await supabase
      .from('chart_of_accounts')
      .select('account_code, account_name, account_type, account_subtype, current_balance, is_active')
      .eq('account_type', 'ASSET')
      .order('account_code');
    
    // Get revenue accounts
    const { data: revenueAccounts } = await supabase
      .from('chart_of_accounts')
      .select('account_code, account_name, account_type, account_subtype, current_balance, is_active')
      .eq('account_type', 'REVENUE')
      .order('account_code');
    
    // Get account types summary
    const { data: accountTypeSummary } = await supabase
      .from('chart_of_accounts')
      .select('account_type, account_subtype')
      .order('account_type, account_subtype');
    
    const typeSummary = accountTypeSummary?.reduce((acc, curr) => {
      const key = `${curr.account_type}${curr.account_subtype ? ` - ${curr.account_subtype}` : ''}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    return NextResponse.json({
      summary: {
        totalAccounts: allAccounts?.length || 0,
        activeAccounts: allAccounts?.filter(acc => acc.is_active)?.length || 0,
        accountTypes: typeSummary
      },
      paymentRelatedAccounts: paymentAccounts || [],
      assetAccounts: assetAccounts || [],
      revenueAccounts: revenueAccounts || [],
      allAccounts: allAccounts || [],
      missingPaymentAccounts: [
        '1001', '1010', '1011', '1012', '1020', '1025', '1026', '1030', '1031', '1100', '1200'
      ].filter(code => !paymentAccounts?.find(acc => acc.account_code === code))
    });
    
  } catch (error) {
    console.error('Debug chart of accounts endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Debug chart of accounts endpoint failed', details: errorMessage },
      { status: 500 }
    );
  }
}
