// app/api/finance/bank_accounts/route.ts
import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountType = searchParams.get('type'); // 'BANK', 'UPI', or 'CASH'

  let query = supabase
    .from("bank_accounts")
    .select(`
      id, 
      name, 
      account_number, 
      current_balance, 
      currency,
      account_type,
      upi_id,
      linked_bank_account_id,
      is_active,
      created_at
    `)
    .order("name", { ascending: true });

  // Filter by account type if specified
  if (accountType === 'BANK') {
    query = query.eq('account_type', 'BANK');
  } else if (accountType === 'UPI') {
    query = query.eq('account_type', 'UPI');
  } else if (accountType === 'CASH') {
    query = query.eq('account_type', 'CASH');
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching bank accounts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate actual balances from bank transactions AND payments
  if (data) {
    const enrichedData = await Promise.all(
      data.map(async (account) => {
        // Get all bank transactions for this account
        const { data: transactions, error: transError } = await supabase
          .from('bank_transactions')
          .select('type, amount')
          .eq('bank_account_id', account.id);

        let transactionBalance = 0;
        if (!transError && transactions) {
          transactionBalance = transactions.reduce((balance, transaction) => {
            if (transaction.type === 'deposit') {
              return balance + Number(transaction.amount);
            } else if (transaction.type === 'withdrawal') {
              return balance - Number(transaction.amount);
            }
            return balance;
          }, 0);
        }

        // Get all payments that should be attributed to this account based on method
        let paymentMethods: string[] = [];
        if (account.account_type === 'BANK') {
          paymentMethods = ['BANK TRANSFER', 'CARD'];
        } else if (account.account_type === 'UPI') {
          paymentMethods = ['UPI'];
        } else if (account.account_type === 'CASH') {
          paymentMethods = ['CASH'];
        }

        let paymentsBalance = 0;
        let paymentCount = 0;
        if (paymentMethods.length > 0) {
          const { data: payments, error: paymentsError } = await supabase
            .from('payments')
            .select('amount, method')
            .in('method', paymentMethods);

          if (!paymentsError && payments) {
            paymentCount = payments.length;
            // For bank accounts, divide payments among all bank accounts
            // For UPI accounts, divide UPI payments among all UPI accounts
            const accountsOfSameType = data.filter(acc => acc.account_type === account.account_type);
            const totalPayments = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
            paymentsBalance = totalPayments / (accountsOfSameType.length || 1);
          }
        }

        // For UPI accounts, also get the linked bank account balance
        let linkedBankBalance = 0;
        if (account.account_type === 'UPI' && account.linked_bank_account_id) {
          const { data: linkedTransactions } = await supabase
            .from('bank_transactions')
            .select('type, amount')
            .eq('bank_account_id', account.linked_bank_account_id);

          if (linkedTransactions) {
            linkedBankBalance = linkedTransactions.reduce((balance, transaction) => {
              if (transaction.type === 'deposit') {
                return balance + Number(transaction.amount);
              } else if (transaction.type === 'withdrawal') {
                return balance - Number(transaction.amount);
              }
              return balance;
            }, 0);
          }
        }

        const totalCalculatedBalance = transactionBalance + paymentsBalance + linkedBankBalance;

        return {
          ...account,
          calculated_balance: totalCalculatedBalance,
          transaction_balance: transactionBalance,
          payments_balance: paymentsBalance,
          linked_bank_balance: linkedBankBalance,
          transaction_count: transactions?.length || 0,
          payment_count: paymentCount,
          payment_methods: paymentMethods
        };
      })
    );

    // If fetching UPI accounts, also join with linked bank account info
    if (accountType === 'UPI') {
      const finalData = await Promise.all(
        enrichedData.map(async (upiAccount) => {
          if (upiAccount.linked_bank_account_id) {
            const { data: linkedBank } = await supabase
              .from("bank_accounts")
              .select("name, account_number")
              .eq("id", upiAccount.linked_bank_account_id)
              .single();
            
            return {
              ...upiAccount,
              linked_bank_name: linkedBank?.name,
              linked_account_number: linkedBank?.account_number
            };
          }
          return upiAccount;
        })
      );
      return NextResponse.json({ data: finalData });
    }

    return NextResponse.json({ data: enrichedData });
  }

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();

  const { 
    name, 
    account_number, 
    currency, 
    current_balance, 
    account_type,
    upi_id,
    linked_bank_account_id
  } = body;

  if (!name || typeof current_balance !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate account type specific fields
  if (account_type === 'UPI' && !upi_id) {
    return NextResponse.json({ error: "UPI ID is required for UPI accounts" }, { status: 400 });
  }

  if (account_type === 'BANK' && !account_number) {
    return NextResponse.json({ error: "Account number is required for bank accounts" }, { status: 400 });
  }

  const insertData: {
    name: string;
    currency: string;
    current_balance: number;
    account_type: string;
    is_active: boolean;
    account_number?: string;
    upi_id?: string;
    linked_bank_account_id?: string;
  } = {
    name,
    currency: currency || "INR",
    current_balance,
    account_type: account_type || "BANK",
    is_active: true
  };

  // Add type-specific fields
  if (account_type === 'BANK') {
    insertData.account_number = account_number;
  } else if (account_type === 'UPI') {
    insertData.upi_id = upi_id;
    // Only add linked_bank_account_id if it's a valid UUID, not "none" or empty string
    if (linked_bank_account_id && linked_bank_account_id !== 'none' && linked_bank_account_id.trim() !== '') {
      insertData.linked_bank_account_id = linked_bank_account_id;
    }
  }

  const { error } = await supabase
    .from("bank_accounts")
    .insert([insertData]);

  if (error) {
    console.error("Error inserting bank account:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}



export async function DELETE(req: Request) {
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  const { error } = await supabase.from("expenses").delete().eq("id", id);

  if (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
