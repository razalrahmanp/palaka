import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabasePool';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bank_account_id, new_balance } = body;

    // Validate input
    if (!bank_account_id) {
      return NextResponse.json(
        { success: false, error: 'Bank account ID is required' },
        { status: 400 }
      );
    }

    if (new_balance === undefined || new_balance === null || isNaN(parseFloat(new_balance))) {
      return NextResponse.json(
        { success: false, error: 'Valid new balance is required' },
        { status: 400 }
      );
    }

    const balanceAmount = parseFloat(new_balance);

    console.log('Updating bank balance:', {
      bank_account_id,
      new_balance: balanceAmount
    });

    // Check if bank account exists
    const { data: existingAccount, error: fetchError } = await supabaseAdmin
      .from('bank_accounts')
      .select('id, name, current_balance')
      .eq('id', bank_account_id)
      .single();

    if (fetchError || !existingAccount) {
      console.error('Bank account not found:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Bank account not found' },
        { status: 404 }
      );
    }

    // Update bank account balance
    const { data: updatedAccount, error: updateError } = await supabaseAdmin
      .from('bank_accounts')
      .update({ 
        current_balance: balanceAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', bank_account_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating bank balance:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update bank balance' },
        { status: 500 }
      );
    }

    console.log('✅ Bank balance updated successfully:', {
      account: existingAccount.name,
      old_balance: existingAccount.current_balance,
      new_balance: balanceAmount
    });

    return NextResponse.json({
      success: true,
      message: 'Bank balance updated successfully',
      data: {
        account_id: updatedAccount.id,
        account_name: existingAccount.name,
        old_balance: existingAccount.current_balance,
        new_balance: updatedAccount.current_balance
      }
    });

  } catch (error) {
    console.error('Error in update-bank-balance API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
