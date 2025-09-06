import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const codes = searchParams.get('codes')?.split(',') || [];
    
    if (codes.length === 0) {
      return NextResponse.json({ error: 'Account codes parameter required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name, account_type')
      .in('account_code', codes);

    if (error) {
      console.error('Error fetching accounts by codes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create a mapping object for easy lookup
    const accountMap: { [key: string]: Account } = {};
    data?.forEach(account => {
      accountMap[account.account_code] = account;
    });

    return NextResponse.json({ data: accountMap });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
