import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // First get all accounts
    const { data: accounts, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .order('account_code', { ascending: true });

    if (error) {
      console.error('Error fetching accounts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate current balances from journal entries for each account
    const accountsWithBalances = await Promise.all(
      accounts?.map(async (account) => {
        // Get all journal entry lines for this account
        const { data: journalLines, error: linesError } = await supabase
          .from('journal_entry_lines')
          .select(`
            debit_amount,
            credit_amount,
            journal_entries!inner(status)
          `)
          .eq('account_id', account.id);

        if (linesError) {
          console.error('Error fetching journal lines for account:', account.account_code, linesError);
          return { ...account, calculated_balance: 0 };
        }

        // Calculate balance based on account's normal balance and posted entries
        let calculatedBalance = 0;
        
        if (journalLines?.length > 0) {
          const totalDebits = journalLines.reduce((sum, line) => 
            sum + (parseFloat(String(line.debit_amount || 0))), 0);
          const totalCredits = journalLines.reduce((sum, line) => 
            sum + (parseFloat(String(line.credit_amount || 0))), 0);

          // Calculate balance based on normal balance type
          if (account.normal_balance === 'DEBIT') {
            // For debit accounts: debits increase, credits decrease
            calculatedBalance = totalDebits - totalCredits;
          } else {
            // For credit accounts: credits increase, debits decrease  
            calculatedBalance = totalCredits - totalDebits;
          }
        }

        return {
          ...account,
          calculated_balance: calculatedBalance,
          total_debits: journalLines?.reduce((sum, line) => 
            sum + (parseFloat(String(line.debit_amount || 0))), 0) || 0,
          total_credits: journalLines?.reduce((sum, line) => 
            sum + (parseFloat(String(line.credit_amount || 0))), 0) || 0
        };
      }) || []
    );

    return NextResponse.json({ data: accountsWithBalances });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { account_code, account_name, account_type, parent_account_id, description } = body;

    // Validate required fields
    if (!account_code || !account_name || !account_type) {
      return NextResponse.json(
        { error: 'Account code, name, and type are required' },
        { status: 400 }
      );
    }

    // Check if account code already exists
    const { data: existingAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('account_code', account_code)
      .single();

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Account code already exists' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('chart_of_accounts')
      .insert([{
        account_code,
        account_name,
        account_type,
        parent_account_id: parent_account_id || null,
        description: description || null,
        current_balance: 0,
        is_active: true,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating account:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, account_code, account_name, account_type, parent_account_id, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Check if new account code conflicts with existing accounts (excluding current)
    if (account_code) {
      const { data: existingAccount } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('account_code', account_code)
        .neq('id', id)
        .single();

      if (existingAccount) {
        return NextResponse.json(
          { error: 'Account code already exists' },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('chart_of_accounts')
      .update({
        account_code,
        account_name,
        account_type,
        parent_account_id: parent_account_id || null,
        description: description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating account:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Check if account has transactions
    const { data: transactions } = await supabase
      .from('journal_entry_lines')
      .select('id')
      .eq('account_id', id)
      .limit(1);

    if (transactions && transactions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with existing transactions. Consider deactivating instead.' },
        { status: 400 }
      );
    }

    // Check if account has child accounts
    const { data: childAccounts } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('parent_account_id', id)
      .limit(1);

    if (childAccounts && childAccounts.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with child accounts. Move or delete child accounts first.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('chart_of_accounts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting account:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
