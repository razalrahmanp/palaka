import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

interface OpeningBalance {
  id: string;
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  chart_of_accounts?: {
    account_type: string;
  };
}

interface SummaryAcc {
  [key: string]: { total: number; count: number };
}

export async function GET() {
  try {
    const { data: openingBalances, error } = await supabase
      .from('opening_balances')
      .select(`
        *,
        chart_of_accounts(
          id,
          account_code,
          account_name,
          account_type,
          normal_balance
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Calculate total opening balances by account type
    const summary = (openingBalances as OpeningBalance[])?.reduce((acc: SummaryAcc, balance: OpeningBalance) => {
      const accountType = balance.chart_of_accounts?.account_type || 'UNKNOWN';
      if (!acc[accountType]) {
        acc[accountType] = { total: 0, count: 0 };
      }
      const balanceAmount = (balance.debit_amount || 0) - (balance.credit_amount || 0);
      acc[accountType].total += balanceAmount;
      acc[accountType].count += 1;
      return acc;
    }, {} as SummaryAcc) || {};
    
    return NextResponse.json({ 
      data: openingBalances,
      summary,
      total_count: openingBalances?.length || 0
    });
  } catch (error) {
    console.error('Opening balances fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const balanceData = await request.json();
    
    // Validate required fields - accept balance_amount for backward compatibility
    const balanceAmount = balanceData.balance_amount || ((balanceData.debit_amount || 0) - (balanceData.credit_amount || 0));
    
    if (!balanceData.account_id || !balanceAmount || !balanceData.opening_date) {
      return NextResponse.json(
        { error: 'Account ID, balance amount, and opening date are required' }, 
        { status: 400 }
      );
    }
    
    // Check if opening balance already exists for this account
    const { data: existing, error: checkError } = await supabase
      .from('opening_balances')
      .select('id')
      .eq('account_id', balanceData.account_id)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    if (existing) {
      return NextResponse.json(
        { error: 'Opening balance already exists for this account. Use PUT to update.' },
        { status: 409 }
      );
    }
    
    // Determine debit/credit based on balance amount
    const debitAmount = balanceAmount > 0 ? balanceAmount : 0;
    const creditAmount = balanceAmount < 0 ? Math.abs(balanceAmount) : 0;
    
    // Create opening balance record directly
    const { data, error } = await supabase
      .from('opening_balances')
      .insert({
        account_id: balanceData.account_id,
        debit_amount: debitAmount,
        credit_amount: creditAmount,
        opening_date: balanceData.opening_date || balanceData.balance_date,
        fiscal_year: new Date(balanceData.opening_date || balanceData.balance_date).getFullYear(),
        created_by: balanceData.created_by
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Opening balance created successfully'
    });
  } catch (error) {
    console.error('Opening balance creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...updateData } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Opening balance ID is required for update' },
        { status: 400 }
      );
    }
    
    // Update opening balance
    const { data, error } = await supabase
      .from('opening_balances')
      .update({
        balance_amount: updateData.balance_amount,
        balance_date: updateData.balance_date,
        description: updateData.description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        chart_of_accounts(account_code, account_name, account_type)
      `)
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Opening balance updated successfully'
    });
  } catch (error) {
    console.error('Opening balance update error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Opening balance ID is required' },
        { status: 400 }
      );
    }
    
    // Delete opening balance (this should also delete related journal entries)
    const { error } = await supabase
      .from('opening_balances')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true,
      message: 'Opening balance deleted successfully'
    });
  } catch (error) {
    console.error('Opening balance deletion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
