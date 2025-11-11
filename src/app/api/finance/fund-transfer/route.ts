import { NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabasePool';

interface FundTransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  reference?: string;
  date?: string;
}

export async function POST(req: Request) {
  try {
    const {
      fromAccountId,
      toAccountId,
      amount,
      description = '',
      reference = '',
      date = new Date().toISOString().split('T')[0]
    }: FundTransferRequest = await req.json();

    // Validation
    if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid transfer details. All fields are required and amount must be positive.'
      }, { status: 400 });
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json({
        success: false,
        error: 'Source and destination accounts must be different.'
      }, { status: 400 });
    }

    // Start a transaction to ensure data consistency
    const { data: fromAccount, error: fromAccountError } = await supabaseAdmin
      .from('bank_accounts')
      .select('id, name, current_balance, account_type, is_active')
      .eq('id', fromAccountId)
      .eq('is_active', true)
      .single();

    if (fromAccountError || !fromAccount) {
      return NextResponse.json({
        success: false,
        error: 'Source account not found or inactive.'
      }, { status: 404 });
    }

    const { data: toAccount, error: toAccountError } = await supabaseAdmin
      .from('bank_accounts')
      .select('id, name, current_balance, account_type, is_active')
      .eq('id', toAccountId)
      .eq('is_active', true)
      .single();

    if (toAccountError || !toAccount) {
      return NextResponse.json({
        success: false,
        error: 'Destination account not found or inactive.'
      }, { status: 404 });
    }

    // Allow negative balances - removed balance check
    // Cash accounts can go negative temporarily
    console.log(`Account ${fromAccount.name} current balance: ₹${fromAccount.current_balance.toLocaleString()}`);
    console.log(`Transfer amount: ₹${amount.toLocaleString()}`);
    console.log(`Balance will be: ₹${(fromAccount.current_balance - amount).toLocaleString()}`);

    const transferDescription = description || `Fund transfer from ${fromAccount.name} to ${toAccount.name}`;
    const transferReference = reference || `TXN-${Date.now()}`;

    // Perform the transfer operations
    console.log(`Processing fund transfer: ₹${amount} from ${fromAccount.name} to ${toAccount.name}`);
    console.log(`Initial balances - From: ₹${fromAccount.current_balance}, To: ₹${toAccount.current_balance}`);
    console.log(`Note: Balances will be automatically updated by database trigger 'trg_update_bank_account_balance'`);

    // Record transaction history for source account (withdrawal)
    // The database trigger will automatically deduct the amount from source account balance
    const { error: debitTransactionError } = await supabaseAdmin
      .from('bank_transactions')
      .insert({
        bank_account_id: fromAccountId,
        date: date,
        type: 'withdrawal',
        amount: amount,
        description: `${transferDescription} (To: ${toAccount.name})`,
        reference: transferReference
      });

    if (debitTransactionError) {
      console.error('Error recording debit transaction:', debitTransactionError);
      console.error('Debit transaction error details:', JSON.stringify(debitTransactionError));
      return NextResponse.json({
        success: false,
        error: 'Failed to record withdrawal transaction.'
      }, { status: 500 });
    } else {
      console.log('✅ Debit transaction recorded successfully');
    }

    // Record transaction history for destination account (deposit)
    // The database trigger will automatically add the amount to destination account balance
    const { error: creditTransactionError } = await supabaseAdmin
      .from('bank_transactions')
      .insert({
        bank_account_id: toAccountId,
        date: date,
        type: 'deposit',
        amount: amount,
        description: `${transferDescription} (From: ${fromAccount.name})`,
        reference: transferReference
      });

    if (creditTransactionError) {
      console.error('Error recording credit transaction:', creditTransactionError);
      console.error('Credit transaction error details:', JSON.stringify(creditTransactionError));
      
      // Note: The withdrawal was already recorded and balance updated by trigger
      // In a production system, you might want to implement a rollback mechanism
      return NextResponse.json({
        success: false,
        error: 'Failed to record deposit transaction. Withdrawal was processed but deposit failed.'
      }, { status: 500 });
    } else {
      console.log('✅ Credit transaction recorded successfully');
    }

    // 5. Get updated account balances
    const { data: updatedFromAccount } = await supabaseAdmin
      .from('bank_accounts')
      .select('current_balance')
      .eq('id', fromAccountId)
      .single();

    const { data: updatedToAccount } = await supabaseAdmin
      .from('bank_accounts')
      .select('current_balance')
      .eq('id', toAccountId)
      .single();

    console.log(`Fund transfer completed successfully:
      - From: ${fromAccount.name} (₹${fromAccount.current_balance} → ₹${updatedFromAccount?.current_balance})
      - To: ${toAccount.name} (₹${toAccount.current_balance} → ₹${updatedToAccount?.current_balance})
      - Amount: ₹${amount}
      - Reference: ${transferReference}`);

    return NextResponse.json({
      success: true,
      message: 'Fund transfer completed successfully',
      data: {
        transferId: transferReference,
        amount: amount,
        fromAccount: {
          id: fromAccount.id,
          name: fromAccount.name,
          previousBalance: fromAccount.current_balance,
          newBalance: updatedFromAccount?.current_balance
        },
        toAccount: {
          id: toAccount.id,
          name: toAccount.name,
          previousBalance: toAccount.current_balance,
          newBalance: updatedToAccount?.current_balance
        },
        date: date,
        description: transferDescription,
        reference: transferReference
      }
    });

  } catch (error) {
    console.error('Unexpected error processing fund transfer:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error occurred while processing fund transfer.'
    }, { status: 500 });
  }
}

// GET endpoint to fetch transfer history
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('account_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    let query = supabaseAdmin
      .from('bank_transactions')
      .select(`
        id, date, type, amount, description, reference, 
        bank_account_id,
        bank_accounts!bank_transactions_bank_account_id_fkey(name, account_type)
      `)
      .order('date', { ascending: false })
      .order('id', { ascending: false });

    if (accountId) {
      query = query.eq('bank_account_id', accountId);
    }

    const offset = (page - 1) * limit;
    const { data: transfers, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching fund transfers:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch fund transfer history.'
      }, { status: 500 });
    }

    // Format the transfer data for display
    const formattedTransfers = transfers?.map(transfer => {
      const bankAccount = transfer.bank_accounts as { name?: string; account_type?: string } | null;
      
      return {
        id: transfer.id,
        date: transfer.date,
        amount: transfer.amount,
        description: transfer.description,
        reference: transfer.reference,
        type: transfer.type,
        accountName: bankAccount?.name || 'Unknown Account',
        accountType: bankAccount?.account_type || 'BANK',
        isIncoming: transfer.type === 'deposit',
        isOutgoing: transfer.type === 'withdrawal'
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: formattedTransfers,
      pagination: {
        page,
        limit,
        total: formattedTransfers.length
      }
    });

  } catch (error) {
    console.error('Error fetching fund transfers:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch fund transfer history.'
    }, { status: 500 });
  }
}