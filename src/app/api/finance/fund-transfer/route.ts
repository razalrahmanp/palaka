import { NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

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

    // Check if source account has sufficient funds
    if (fromAccount.current_balance < amount) {
      return NextResponse.json({
        success: false,
        error: `Insufficient funds in ${fromAccount.name}. Available: ₹${fromAccount.current_balance.toLocaleString()}, Required: ₹${amount.toLocaleString()}`
      }, { status: 400 });
    }

    const transferDescription = description || `Fund transfer from ${fromAccount.name} to ${toAccount.name}`;
    const transferReference = reference || `TXN-${Date.now()}`;

    // Perform the transfer operations
    console.log(`Processing fund transfer: ₹${amount} from ${fromAccount.name} to ${toAccount.name}`);

    // 1. Update source account (debit)
    const { error: debitError } = await supabaseAdmin
      .from('bank_accounts')
      .update({
        current_balance: fromAccount.current_balance - amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', fromAccountId);

    if (debitError) {
      console.error('Error updating source account:', debitError);
      return NextResponse.json({
        success: false,
        error: 'Failed to debit source account.'
      }, { status: 500 });
    }

    // 2. Update destination account (credit)
    const { error: creditError } = await supabaseAdmin
      .from('bank_accounts')
      .update({
        current_balance: toAccount.current_balance + amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', toAccountId);

    if (creditError) {
      console.error('Error updating destination account:', creditError);
      
      // Rollback the source account update
      await supabaseAdmin
        .from('bank_accounts')
        .update({
          current_balance: fromAccount.current_balance,
          updated_at: new Date().toISOString()
        })
        .eq('id', fromAccountId);

      return NextResponse.json({
        success: false,
        error: 'Failed to credit destination account. Transaction rolled back.'
      }, { status: 500 });
    }

    // 3. Record transaction history for source account (withdrawal)
    const { error: debitTransactionError } = await supabaseAdmin
      .from('bank_transactions')
      .insert({
        bank_account_id: fromAccountId,
        date: date,
        type: 'withdrawal',
        amount: amount,
        description: `${transferDescription} (Outgoing)`,
        reference: transferReference,
        transaction_type: 'fund_transfer',
        related_account_id: toAccountId,
        created_at: new Date().toISOString()
      });

    if (debitTransactionError) {
      console.error('Error recording debit transaction:', debitTransactionError);
    }

    // 4. Record transaction history for destination account (deposit)
    const { error: creditTransactionError } = await supabaseAdmin
      .from('bank_transactions')
      .insert({
        bank_account_id: toAccountId,
        date: date,
        type: 'deposit',
        amount: amount,
        description: `${transferDescription} (Incoming)`,
        reference: transferReference,
        transaction_type: 'fund_transfer',
        related_account_id: fromAccountId,
        created_at: new Date().toISOString()
      });

    if (creditTransactionError) {
      console.error('Error recording credit transaction:', creditTransactionError);
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
        bank_account_id, related_account_id,
        bank_accounts!bank_transactions_bank_account_id_fkey(name),
        related_account:bank_accounts!bank_transactions_related_account_id_fkey(name)
      `)
      .eq('transaction_type', 'fund_transfer')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (accountId) {
      query = query.or(`bank_account_id.eq.${accountId},related_account_id.eq.${accountId}`);
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
      const bankAccount = transfer.bank_accounts as { name?: string } | null;
      const relatedAccount = transfer.related_account as { name?: string } | null;
      
      return {
        id: transfer.id,
        date: transfer.date,
        amount: transfer.amount,
        description: transfer.description,
        reference: transfer.reference,
        type: transfer.type,
        accountName: bankAccount?.name || 'Unknown Account',
        relatedAccountName: relatedAccount?.name || 'Unknown Account',
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