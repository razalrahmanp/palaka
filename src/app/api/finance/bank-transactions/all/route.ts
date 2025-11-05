import { NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabasePool';

interface BankTransactionDetail {
  id: string;
  date: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  description: string;
  reference: string;
  transaction_type: 'bank_transaction' | 'vendor_payment' | 'withdrawal' | 'liability_payment';
  balance_after?: number;
  bank_account_id: string;
  bank_accounts?: {
    name: string;
    account_number: string;
    account_type: string;
  };
}

export async function GET() {
  try {
    console.log('✅ Fetching ALL bank transactions from all accounts');

    // Fetch all bank transactions with account details
    const { data: bankTransactions, error: bankTransError } = await supabaseAdmin
      .from('bank_transactions')
      .select(`
        id,
        date,
        type,
        amount,
        description,
        reference,
        balance,
        bank_account_id,
        bank_accounts (
          name,
          account_number,
          account_type
        )
      `)
      .order('date', { ascending: true })
      .order('id', { ascending: true });

    if (bankTransError) {
      console.error('Error fetching bank transactions:', bankTransError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    const allTransactions: BankTransactionDetail[] = [];

    if (bankTransactions) {
      // Log unique descriptions to help with categorization
      const uniqueDescriptions = [...new Set(bankTransactions.map(tx => tx.description))];
      console.log('📋 Sample transaction descriptions:', uniqueDescriptions.slice(0, 10));
      
      bankTransactions.forEach(tx => {
        // Determine transaction type from description pattern matching
        let transactionType: 'bank_transaction' | 'vendor_payment' | 'withdrawal' | 'liability_payment' = 'bank_transaction';
        
        const desc = (tx.description || '').toLowerCase();
        
        // More comprehensive pattern matching for categorization
        if (desc.includes('vendor payment') || desc.includes('payment to vendor') || desc.includes('vendor:')) {
          transactionType = 'vendor_payment';
        } else if (
          desc.includes('withdrawal') || 
          desc.includes('owner withdrawal') ||
          desc.includes('cash withdrawal') ||
          desc.includes('atm withdrawal') ||
          (tx.type === 'withdrawal' && desc.includes('withdraw'))
        ) {
          transactionType = 'withdrawal';
        } else if (
          desc.includes('loan payment') || 
          desc.includes('liability payment') ||
          desc.includes('liability:') ||
          desc.includes('emi payment') ||
          desc.includes('debt payment')
        ) {
          transactionType = 'liability_payment';
        } else if (
          desc.includes('fund transfer') ||
          desc.includes('bank transfer') ||
          desc.includes('transfer to') ||
          desc.includes('transfer from')
        ) {
          transactionType = 'bank_transaction';
        }

        allTransactions.push({
          id: `bank_${tx.id}`,
          date: tx.date,
          type: tx.type,
          amount: tx.amount || 0,
          description: tx.description || 'Bank Transaction',
          reference: tx.reference || '',
          transaction_type: transactionType,
          balance_after: tx.balance,
          bank_account_id: tx.bank_account_id,
          bank_accounts: Array.isArray(tx.bank_accounts) && tx.bank_accounts.length > 0 ? {
            name: tx.bank_accounts[0].name,
            account_number: tx.bank_accounts[0].account_number,
            account_type: tx.bank_accounts[0].account_type
          } : undefined
        });
      });
    }

    console.log(`✅ Fetched ${allTransactions.length} total transactions from all bank accounts`);

    // Calculate summary statistics
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let depositCount = 0;
    let withdrawalCount = 0;

    allTransactions.forEach(tx => {
      if (tx.type === 'deposit') {
        totalDeposits += tx.amount;
        depositCount++;
      } else if (tx.type === 'withdrawal') {
        totalWithdrawals += tx.amount;
        withdrawalCount++;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        transactions: allTransactions,
        summary: {
          total_count: allTransactions.length,
          deposit_count: depositCount,
          withdrawal_count: withdrawalCount,
          total_deposits: totalDeposits,
          total_withdrawals: totalWithdrawals,
          net_cash_flow: totalDeposits - totalWithdrawals
        }
      }
    });
  } catch (error) {
    console.error('Error in GET /api/finance/bank-transactions/all:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
