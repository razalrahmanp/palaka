// lib/journalHelper.ts
// Helper function to create journal entries for payments
import { supabase } from "@/lib/supabaseAdmin";

export interface CreateJournalEntryParams {
  paymentId: string;
  amount: number;
  date: string;
  reference?: string;
  description?: string;
  paymentMethod?: string;
  bankAccountId?: string;
}

export interface CreateVendorPaymentJournalEntryParams {
  paymentId: string;
  amount: number;
  date: string;
  reference?: string;
  description?: string;
  vendorId?: string;
  paymentMethod?: string;
  bankAccountId?: string;
}

export interface CreateExpenseJournalEntryParams {
  expenseId: string;
  amount: number;
  date: string;
  reference?: string;
  description?: string;
  category: string;
  type: string;
  accountCode?: string;
  paymentMethod?: string;
  bankAccountId?: string;
}

export interface DeletePaymentJournalParams {
  paymentId: string;
  paymentAmount: number;
  description?: string;
}

// Function to reverse journal entries for deleted payments
export async function reversePaymentJournalEntry(params: DeletePaymentJournalParams) {
  const { paymentId } = params;
  
  console.log('🔄 Starting journal entry reversal for payment:', paymentId);
  
  try {
    // Find existing journal entries for this payment
    const { data: journalEntries, error: journalError } = await supabase
      .from('journal_entries')
      .select(`
        id,
        journal_number,
        total_debit,
        total_credit,
        journal_entry_lines(
          id,
          account_id,
          debit_amount,
          credit_amount,
          chart_of_accounts(
            id,
            account_name,
            current_balance,
            account_type
          )
        )
      `)
      .eq('source_document_type', 'PAYMENT')
      .eq('source_document_id', paymentId);

    if (journalError) {
      throw new Error(`Failed to fetch journal entries: ${journalError.message}`);
    }

    if (!journalEntries || journalEntries.length === 0) {
      console.log('⚠️ No journal entries found for payment:', paymentId);
      return { success: true, message: 'No journal entries to reverse' };
    }

    // Reverse the account balances
    for (const entry of journalEntries) {
      const entryLines = entry.journal_entry_lines || [];
      
      for (const line of entryLines) {
        if (line.chart_of_accounts) {
          // Handle both single object and array cases from Supabase
          const account = Array.isArray(line.chart_of_accounts) 
            ? line.chart_of_accounts[0] 
            : line.chart_of_accounts;
          
          if (!account) continue;
          
          const currentBalance = account.current_balance || 0;
          
          // Reverse the effect: subtract debits, add back credits
          const reversalAmount = (line.debit_amount || 0) - (line.credit_amount || 0);
          const newBalance = currentBalance - reversalAmount;
          
          console.log(`💰 Reversing balance for ${account.account_name}:`, {
            currentBalance,
            reversalAmount,
            newBalance
          });

          const { error: balanceUpdateError } = await supabase
            .from('chart_of_accounts')
            .update({
              current_balance: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq('id', account.id);

          if (balanceUpdateError) {
            console.error(`Error updating balance for ${account.account_name}:`, balanceUpdateError);
            throw new Error(`Failed to update account balance: ${balanceUpdateError.message}`);
          } else {
            console.log(`✅ Updated ${account.account_name} balance: ${currentBalance} → ${newBalance}`);
          }
        }
      }

      // Delete journal entry lines
      const { error: linesDeleteError } = await supabase
        .from('journal_entry_lines')
        .delete()
        .eq('journal_entry_id', entry.id);

      if (linesDeleteError) {
        throw new Error(`Failed to delete journal entry lines: ${linesDeleteError.message}`);
      }
    }

    // Delete journal entries
    const { error: journalDeleteError } = await supabase
      .from('journal_entries')
      .delete()
      .eq('source_document_type', 'PAYMENT')
      .eq('source_document_id', paymentId);

    if (journalDeleteError) {
      throw new Error(`Failed to delete journal entries: ${journalDeleteError.message}`);
    }

    console.log('✅ Successfully reversed journal entries for payment:', paymentId);
    
    return {
      success: true,
      message: `Journal entries reversed for payment ${paymentId}`,
      reversedEntries: journalEntries.length
    };

  } catch (error) {
    console.error('❌ Error reversing payment journal entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Function to get the appropriate asset account based on payment method
async function getPaymentAssetAccount(paymentMethod: string, bankAccountId?: string) {
  const { supabase } = await import('@/lib/supabaseClient');
  
  // If bank account is specified, try to get the corresponding chart account
  if (bankAccountId && (paymentMethod === 'bank_transfer' || paymentMethod === 'cheque' || paymentMethod === 'upi' || paymentMethod === 'card')) {
    console.log(`🏦 Looking for chart account for bank account: ${bankAccountId} with method: ${paymentMethod}`);
    
    // First try to get the bank account's corresponding chart account
    const { data: bankAccount } = await supabase
      .from('bank_accounts')
      .select('name, account_type, chart_account_id')
      .eq('id', bankAccountId)
      .single();
    
    if (bankAccount?.chart_account_id) {
      console.log(`📊 Found linked chart account: ${bankAccount.chart_account_id}`);
      const { data: chartAccount } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name')
        .eq('id', bankAccount.chart_account_id)
        .single();
      
      if (chartAccount) {
        console.log(`✅ Using chart account: ${chartAccount.account_code} - ${chartAccount.account_name}`);
        return chartAccount;
      }
    }
    
    // Fallback: Find account by bank name or create generic bank account
    console.log(`🔍 Fallback: Looking for chart account matching bank: ${bankAccount?.name}`);
    const { data: chartByName } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name')
      .ilike('account_name', `%${bankAccount?.name || ''}%`)
      .eq('account_type', 'ASSET')
      .limit(1);
    
    if (chartByName && chartByName.length > 0) {
      console.log(`✅ Found matching chart account by name: ${chartByName[0].account_code} - ${chartByName[0].account_name}`);
      return chartByName[0];
    }
  }
  
  // Default mapping based on payment method
  const accountMappings = {
    'cash': ['1010', '1001'], // Cash accounts
    'bank_transfer': ['1020', '1011', '1010'], // Bank accounts, fallback to cash
    'cheque': ['1020', '1011', '1010'], // Bank accounts, fallback to cash  
    'upi': ['1025', '1020', '1010'], // UPI accounts, fallback to bank, then cash
    'card': ['1030', '1020', '1010'], // Card accounts, fallback to bank, then cash
    'other': ['1010'] // Default to cash
  };
  
  const accountCodes = accountMappings[paymentMethod as keyof typeof accountMappings] || accountMappings['cash'];
  console.log(`📋 Mapping payment method '${paymentMethod}' to account codes: ${accountCodes.join(', ')}`);
  
  // Try to find the account in order of preference
  for (const accountCode of accountCodes) {
    const { data: account } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name')
      .eq('account_code', accountCode)
      .single();
    
    if (account) {
      console.log(`✅ Found account: ${account.account_code} - ${account.account_name}`);
      return account;
    }
  }
  
  // Ultimate fallback - any cash-like account
  console.log('⚠️ No specific account found, using fallback cash account');
  const { data: fallbackAccount } = await supabase
    .from('chart_of_accounts')
    .select('id, account_code, account_name')
    .in('account_code', ['1010', '1001', '1000'])
    .order('account_code')
    .limit(1);
  
  if (fallbackAccount && fallbackAccount.length > 0) {
    console.log(`💰 Using fallback account: ${fallbackAccount[0].account_code} - ${fallbackAccount[0].account_name}`);
    return fallbackAccount[0];
  }
  
  return null;
}

export async function createPaymentJournalEntry(params: CreateJournalEntryParams) {
  const { paymentId, amount, date, reference, description, paymentMethod = 'cash', bankAccountId } = params;
  
  try {
    console.log('📝 Creating journal entry for payment:', paymentId, 'Method:', paymentMethod);
    
    // Get first active user for journal entry
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('is_deleted', false)
      .order('created_at')
      .limit(1);
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return { success: false, error: 'Failed to get user for journal entry' };
    }
    
    const userId = users?.[0]?.id || '00000000-0000-0000-0000-000000000000';
    
    // Get the appropriate payment account based on method and bank account
    const paymentAccount = await getPaymentAssetAccount(paymentMethod, bankAccountId);
    if (!paymentAccount) {
      console.error('No payment account found for method:', paymentMethod);
      return { success: false, error: `No appropriate account found for payment method: ${paymentMethod}` };
    }
    
    // Get Accounts Receivable account
    const { data: arAccounts, error: arError } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name')
      .in('account_code', ['1200', '1100']);
    
    if (arError) {
      console.error('Error fetching AR accounts:', arError);
      return { success: false, error: 'Failed to get Accounts Receivable account' };
    }
    
    const arAccount = arAccounts?.find(acc => acc.account_code === '1200') || arAccounts?.[0];
    
    if (!arAccount) {
      console.error('Accounts Receivable account not found');
      return { success: false, error: 'Accounts Receivable account (1200/1100) not found in chart of accounts' };
    }
    
    // Create journal entry
    const journalDescription = description || 'Payment received';
    const journalReference = reference || `PAY-${paymentId}`;
    
    // Generate journal number in the existing format: JE-PAY-{paymentId}-{date}-{time}
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const journalNumber = `JE-PAY-${paymentId.split('-')[0]}-${dateStr}-${timeStr}`;
    
    const { data: journalEntry, error: journalError } = await supabase
      .from('journal_entries')
      .insert({
        journal_number: journalNumber,
        description: journalDescription,
        entry_date: date,
        reference_number: journalReference,
        source_document_type: 'PAYMENT',
        source_document_id: paymentId,
        created_by: userId,
        updated_by: userId,
        status: 'DRAFT'
      })
      .select('id')
      .single();
    
    if (journalError) {
      console.error('Error creating journal entry:', journalError);
      return { success: false, error: 'Failed to create journal entry' };
    }
    
    // Create journal entry lines - Debit Payment Account, Credit AR
    const journalLines = [
      {
        journal_entry_id: journalEntry.id,
        account_id: paymentAccount.id,
        line_number: 1,
        debit_amount: amount,
        credit_amount: 0,
        description: `Payment received via ${paymentMethod}`
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: arAccount.id,
        line_number: 2,
        debit_amount: 0,
        credit_amount: amount,
        description: 'Accounts receivable settlement'
      }
    ];
    
    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(journalLines);
    
    if (linesError) {
      console.error('Error creating journal entry lines:', linesError);
      // Cleanup - delete the journal entry if lines failed
      await supabase
        .from('journal_entries')
        .delete()
        .eq('id', journalEntry.id);
      
      return { success: false, error: 'Failed to create journal entry lines' };
    }
    
    // Update chart of accounts balances
    console.log('💰 Updating chart of accounts balances...');
    
    // Get current balances first
    const { data: currentAccounts, error: balanceError } = await supabase
      .from('chart_of_accounts')
      .select('id, current_balance')
      .in('id', [paymentAccount.id, arAccount.id]);
    
    if (balanceError) {
      console.error('Error fetching current balances:', balanceError);
    } else {
      const currentPayment = currentAccounts?.find(acc => acc.id === paymentAccount.id);
      const currentAR = currentAccounts?.find(acc => acc.id === arAccount.id);
      
      // Update Payment account (Debit increases balance for asset accounts)
      if (currentPayment) {
        const newPaymentBalance = (currentPayment.current_balance || 0) + amount;
        const { error: paymentUpdateError } = await supabase
          .from('chart_of_accounts')
          .update({
            current_balance: newPaymentBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentAccount.id);
        
        if (paymentUpdateError) {
          console.error('Error updating payment account balance:', paymentUpdateError);
        } else {
          console.log(`💰 Updated ${paymentAccount.account_name} balance: ${currentPayment.current_balance} + ${amount} = ${newPaymentBalance}`);
        }
      }
      
      // Update Accounts Receivable account (Credit decreases balance for asset accounts)
      if (currentAR) {
        const newARBalance = (currentAR.current_balance || 0) - amount;
        const { error: arUpdateError } = await supabase
          .from('chart_of_accounts')
          .update({
            current_balance: newARBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', arAccount.id);
        
        if (arUpdateError) {
          console.error('Error updating AR account balance:', arUpdateError);
        } else {
          console.log(`💰 Updated AR balance: ${currentAR.current_balance} - ${amount} = ${newARBalance}`);
        }
      }
    }
    
    console.log('✅ Successfully created journal entry:', journalEntry.id);
    return { 
      success: true, 
      journalEntryId: journalEntry.id,
      paymentAccount: paymentAccount.account_name,
      arAccount: arAccount.account_name
    };
    
  } catch (error) {
    console.error('Unexpected error creating journal entry:', error);
    return { success: false, error: 'Unexpected error creating journal entry' };
  }
}

// Helper function to create journal entries for vendor payments (procurement)
export async function createVendorPaymentJournalEntry(params: CreateVendorPaymentJournalEntryParams) {
  const { paymentId, amount, date, reference, description, paymentMethod = 'cash', bankAccountId } = params;
  
  try {
    console.log('📝 Creating vendor payment journal entry for payment:', paymentId);
    
    // Get first active user for journal entry
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('is_deleted', false)
      .order('created_at')
      .limit(1);
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return { success: false, error: 'Failed to get user for journal entry' };
    }
    
    const userId = users?.[0]?.id || '00000000-0000-0000-0000-000000000000';
    
    // Get chart of accounts - Cash and Accounts Payable
    const { data: accounts, error: accountError } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name')
      .in('account_code', ['1010', '2010']); // Cash and Accounts Payable
    
    if (accountError) {
      console.error('Error fetching accounts:', accountError);
      return { success: false, error: 'Failed to get chart of accounts' };
    }
    
    const cashAccount = accounts?.find(acc => acc.account_code === '1010');
    const apAccount = accounts?.find(acc => acc.account_code === '2010');
    
    if (!cashAccount || !apAccount) {
      console.error('Required accounts not found. Cash:', cashAccount, 'AP:', apAccount);
      return { success: false, error: 'Required accounts (1010 Cash, 2010 Accounts Payable) not found in chart of accounts' };
    }
    
    // Create journal entry
    const journalDescription = description || 'Vendor payment made';
    const journalReference = reference || `VPAY-${paymentId}`;
    
    // Generate journal number in the existing format: JE-VPAY-{paymentId}-{date}-{time}
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const journalNumber = `JE-VPAY-${paymentId.split('-')[0]}-${dateStr}-${timeStr}`;
    
    // Determine the payment account based on method and bankAccountId
    let paymentAccount = cashAccount; // Default to cash
    
    if (bankAccountId && (paymentMethod === 'bank_transfer' || paymentMethod === 'cheque' || paymentMethod === 'upi')) {
      // Get the selected bank account
      const { data: bankAccount, error: bankError } = await supabase
        .from('bank_accounts')
        .select('id, account_name, account_number')
        .eq('id', bankAccountId)
        .single();
      
      if (!bankError && bankAccount) {
        // Create or find chart of account entry for this bank account
        const bankAccountCode = `1020-${bankAccount.account_number?.slice(-4) || bankAccount.id.slice(-4)}`;
        const { data: existingBankAccount, error: existingError } = await supabase
          .from('chart_of_accounts')
          .select('id, account_code, account_name')
          .eq('account_code', bankAccountCode)
          .single();
        
        if (existingError || !existingBankAccount) {
          // Create new chart of account for this bank account
          const { data: newBankAccount, error: createError } = await supabase
            .from('chart_of_accounts')
            .insert({
              account_code: bankAccountCode,
              account_name: `Bank - ${bankAccount.account_name}`,
              account_type: 'Asset',
              parent_account_id: null,
              is_active: true,
              balance: 0
            })
            .select()
            .single();
          
          if (!createError && newBankAccount) {
            paymentAccount = newBankAccount;
            console.log('✅ Created new bank account in chart of accounts:', newBankAccount.account_name);
          }
        } else {
          paymentAccount = existingBankAccount;
          console.log('✅ Using existing bank account from chart of accounts:', existingBankAccount.account_name);
        }
      }
    }
    
    const { data: journalEntry, error: journalError } = await supabase
      .from('journal_entries')
      .insert({
        journal_number: journalNumber,
        description: journalDescription,
        entry_date: date,
        reference_number: journalReference,
        source_document_type: 'VENDOR_PAYMENT',
        source_document_id: paymentId,
        created_by: userId,
        updated_by: userId,
        status: 'DRAFT'
      })
      .select('id')
      .single();
    
    if (journalError) {
      console.error('Error creating vendor payment journal entry:', journalError);
      return { success: false, error: 'Failed to create vendor payment journal entry' };
    }
    
    // Create journal entry lines - Debit AP, Credit Selected Payment Account
    const journalLines = [
      {
        journal_entry_id: journalEntry.id,
        account_id: apAccount.id,
        line_number: 1,
        debit_amount: amount,
        credit_amount: 0,
        description: 'Accounts payable reduction'
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: paymentAccount.id, // Use selected payment account
        line_number: 2,
        debit_amount: 0,
        credit_amount: amount,
        description: `Payment from ${paymentAccount.account_name}`
      }
    ];
    
    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(journalLines);
    
    if (linesError) {
      console.error('Error creating vendor payment journal entry lines:', linesError);
      // Cleanup - delete the journal entry if lines failed
      await supabase
        .from('journal_entries')
        .delete()
        .eq('id', journalEntry.id);
      
      return { success: false, error: 'Failed to create vendor payment journal entry lines' };
    }
    
    // Update chart of accounts balances
    console.log('💰 Updating chart of accounts balances for vendor payment...');
    
    // Get current balances first
    const { data: currentAccounts, error: balanceError } = await supabase
      .from('chart_of_accounts')
      .select('id, current_balance')
      .in('id', [paymentAccount.id, apAccount.id]);
    
    if (balanceError) {
      console.error('Error fetching current balances:', balanceError);
    } else {
      const currentPaymentAccount = currentAccounts?.find(acc => acc.id === paymentAccount.id);
      const currentAP = currentAccounts?.find(acc => acc.id === apAccount.id);
      
      // Update Payment account (Credit decreases balance for asset accounts)
      if (currentPaymentAccount) {
        const newPaymentBalance = (currentPaymentAccount.current_balance || 0) - amount;
        const { error: paymentUpdateError } = await supabase
          .from('chart_of_accounts')
          .update({
            current_balance: newPaymentBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentAccount.id);
        
        if (paymentUpdateError) {
          console.error(`Error updating ${paymentAccount.account_name} account balance:`, paymentUpdateError);
        } else {
          console.log(`💰 Updated ${paymentAccount.account_name} balance: ${currentPaymentAccount.current_balance} - ${amount} = ${newPaymentBalance}`);
        }
      }
      
      // Update Accounts Payable account (Debit decreases balance for liability accounts)
      if (currentAP) {
        const newAPBalance = (currentAP.current_balance || 0) - amount;
        const { error: apUpdateError } = await supabase
          .from('chart_of_accounts')
          .update({
            current_balance: newAPBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', apAccount.id);
        
        if (apUpdateError) {
          console.error('Error updating AP account balance:', apUpdateError);
        } else {
          console.log(`💰 Updated AP balance: ${currentAP.current_balance} - ${amount} = ${newAPBalance}`);
        }
      }
    }
    
    console.log('✅ Successfully created vendor payment journal entry:', journalEntry.id);
    return { 
      success: true, 
      journalEntryId: journalEntry.id,
      cashAccount: cashAccount.account_name,
      apAccount: apAccount.account_name
    };
    
  } catch (error) {
    console.error('Unexpected error creating vendor payment journal entry:', error);
    return { success: false, error: 'Unexpected error creating vendor payment journal entry' };
  }
}

// Helper function to create journal entries for expenses
export async function createExpenseJournalEntry(params: CreateExpenseJournalEntryParams) {
  const { expenseId, amount, date, reference, description, category, type, accountCode, paymentMethod = 'cash', bankAccountId } = params;
  
  try {
    console.log('📝 Creating expense journal entry for expense:', expenseId);
    
    // Get first active user for journal entry
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('is_deleted', false)
      .order('created_at')
      .limit(1);
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return { success: false, error: 'Failed to get user for journal entry' };
    }
    
    const userId = users?.[0]?.id || '00000000-0000-0000-0000-000000000000';
    
    // Determine the expense account based on category and account code
    let expenseAccountCode = accountCode || '7000'; // Default to OTHER EXPENSES
    
    // Map specific categories to expense accounts if account code not provided
    const categoryToAccountMap: { [key: string]: string } = {
      'Raw Materials': '5100',
      'Direct Labor': '5200',
      'Manufacturing Overhead': '5300',
      'Administrative': '6100',
      'Salaries & Benefits': '6200',
      'Marketing & Sales': '6300',
      'Logistics & Distribution': '6400',
      'Technology': '6500',
      'Insurance': '6600',
      'Maintenance & Repairs': '6700',
      'Travel & Entertainment': '6800',
      'Vehicle Fleet': '6030', // Updated to use Delivery Expenses account
      'Research & Development': '6900',
      'Accounts Payable': '2010', // Updated to use correct Accounts Payable account
      'Prepaid Expenses': '1400', // Updated to use correct Prepaid Expenses account
      'Miscellaneous': '7000' // Updated to use OTHER EXPENSES
    };
    
    if (!accountCode && categoryToAccountMap[category]) {
      expenseAccountCode = categoryToAccountMap[category];
    }
    
    // Get chart of accounts - Expense Account and Payment Account (Cash/Bank)
    const accountCodes = ['1010', expenseAccountCode]; // Cash and Expense Account
    const { data: accounts, error: accountError } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name, account_type')
      .in('account_code', accountCodes);
    
    if (accountError) {
      console.error('Error fetching accounts:', accountError);
      return { success: false, error: 'Failed to get chart of accounts' };
    }
    
    const cashAccount = accounts?.find(acc => acc.account_code === '1010');
    let expenseAccount = accounts?.find(acc => acc.account_code === expenseAccountCode);
    
    if (!cashAccount) {
      console.error('Cash account (1010) not found');
      return { success: false, error: 'Cash account (1010) not found in chart of accounts' };
    }
    
    // Create expense account if it doesn't exist
    if (!expenseAccount) {
      console.log(`Creating expense account ${expenseAccountCode} for category: ${category}`);
      
      // Determine account type and name based on account code
      let accountType = 'Expense';
      let accountName = `${category} Expenses`;
      
      if (expenseAccountCode.startsWith('5')) {
        accountType = 'Cost of Goods Sold';
        accountName = `${category} - COGS`;
      }
      
      const { data: newExpenseAccount, error: createError } = await supabase
        .from('chart_of_accounts')
        .insert({
          account_code: expenseAccountCode,
          account_name: accountName,
          account_type: accountType,
          parent_account_id: null,
          is_active: true,
          current_balance: 0
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating expense account:', createError);
        return { success: false, error: 'Failed to create expense account' };
      }
      
      expenseAccount = newExpenseAccount;
      console.log('✅ Created new expense account:', expenseAccount?.account_name);
    }
    
    if (!expenseAccount) {
      return { success: false, error: 'Failed to find or create expense account' };
    }
    
    // Determine the payment account based on method and bankAccountId
    let paymentAccount = cashAccount; // Default to cash
    
    if (bankAccountId && (paymentMethod === 'bank_transfer' || paymentMethod === 'cheque' || paymentMethod === 'card' || paymentMethod === 'online')) {
      // Get the selected bank account
      const { data: bankAccount, error: bankError } = await supabase
        .from('bank_accounts')
        .select('id, account_name, account_number')
        .eq('id', bankAccountId)
        .single();
      
      if (!bankError && bankAccount) {
        // Create or find chart of account entry for this bank account
        const bankAccountCode = `1020-${bankAccount.account_number?.slice(-4) || bankAccount.id.slice(-4)}`;
        const { data: existingBankAccount, error: existingError } = await supabase
          .from('chart_of_accounts')
          .select('id, account_code, account_name, account_type')
          .eq('account_code', bankAccountCode)
          .single();
        
        if (existingError || !existingBankAccount) {
          // Create new chart of account for this bank account
          const { data: newBankAccount, error: createError } = await supabase
            .from('chart_of_accounts')
            .insert({
              account_code: bankAccountCode,
              account_name: `Bank - ${bankAccount.account_name}`,
              account_type: 'Asset',
              parent_account_id: null,
              is_active: true,
              current_balance: 0
            })
            .select()
            .single();
          
          if (!createError && newBankAccount) {
            paymentAccount = newBankAccount;
            console.log('✅ Created new bank account in chart of accounts:', newBankAccount.account_name);
          }
        } else {
          paymentAccount = existingBankAccount;
          console.log('✅ Using existing bank account from chart of accounts:', existingBankAccount.account_name);
        }
      }
    }
    
    // Create journal entry
    const journalDescription = description || `${category} expense`;
    const journalReference = reference || `EXP-${expenseId}`;
    
    // Generate journal number in the existing format: JE-EXP-{expenseId}-{date}-{time}
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const journalNumber = `JE-EXP-${expenseId.split('-')[0]}-${dateStr}-${timeStr}`;
    
    const { data: journalEntry, error: journalError } = await supabase
      .from('journal_entries')
      .insert({
        journal_number: journalNumber,
        description: journalDescription,
        entry_date: date,
        reference_number: journalReference,
        source_document_type: 'EXPENSE',
        source_document_id: expenseId,
        created_by: userId,
        updated_by: userId,
        status: 'DRAFT'
      })
      .select('id')
      .single();
    
    if (journalError) {
      console.error('Error creating expense journal entry:', journalError);
      return { success: false, error: 'Failed to create expense journal entry' };
    }
    
    // Create journal entry lines - Debit Expense Account, Credit Payment Account
    const journalLines = [
      {
        journal_entry_id: journalEntry.id,
        account_id: expenseAccount.id,
        line_number: 1,
        debit_amount: amount,
        credit_amount: 0,
        description: `${category} expense - ${description}`
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: paymentAccount.id,
        line_number: 2,
        debit_amount: 0,
        credit_amount: amount,
        description: `Payment for ${category} expense`
      }
    ];
    
    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(journalLines);
    
    if (linesError) {
      console.error('Error creating expense journal entry lines:', linesError);
      // Cleanup - delete the journal entry if lines failed
      await supabase
        .from('journal_entries')
        .delete()
        .eq('id', journalEntry.id);
      
      return { success: false, error: 'Failed to create expense journal entry lines' };
    }
    
    // Update chart of accounts balances
    console.log('💰 Updating chart of accounts balances for expense...');
    
    // Get current balances first
    const { data: currentAccounts, error: balanceError } = await supabase
      .from('chart_of_accounts')
      .select('id, current_balance')
      .in('id', [expenseAccount.id, paymentAccount.id]);
    
    if (balanceError) {
      console.error('Error fetching current balances:', balanceError);
    } else {
      const currentExpenseAccount = currentAccounts?.find(acc => acc.id === expenseAccount.id);
      const currentPaymentAccount = currentAccounts?.find(acc => acc.id === paymentAccount.id);
      
      // Update Expense account (Debit increases balance for expense accounts)
      if (currentExpenseAccount) {
        const newExpenseBalance = (currentExpenseAccount.current_balance || 0) + amount;
        const { error: expenseUpdateError } = await supabase
          .from('chart_of_accounts')
          .update({
            current_balance: newExpenseBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', expenseAccount.id);
        
        if (expenseUpdateError) {
          console.error(`Error updating ${expenseAccount.account_name} account balance:`, expenseUpdateError);
        } else {
          console.log(`💰 Updated ${expenseAccount.account_name} balance: ${currentExpenseAccount.current_balance} + ${amount} = ${newExpenseBalance}`);
        }
      }
      
      // Update Payment account (Credit decreases balance for asset accounts)
      if (currentPaymentAccount) {
        const newPaymentBalance = (currentPaymentAccount.current_balance || 0) - amount;
        const { error: paymentUpdateError } = await supabase
          .from('chart_of_accounts')
          .update({
            current_balance: newPaymentBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentAccount.id);
        
        if (paymentUpdateError) {
          console.error(`Error updating ${paymentAccount.account_name} account balance:`, paymentUpdateError);
        } else {
          console.log(`💰 Updated ${paymentAccount.account_name} balance: ${currentPaymentAccount.current_balance} - ${amount} = ${newPaymentBalance}`);
        }
      }
    }
    
    console.log('✅ Successfully created expense journal entry:', journalEntry.id);
    return { 
      success: true, 
      journalEntryId: journalEntry.id,
      expenseAccount: expenseAccount.account_name,
      paymentAccount: paymentAccount.account_name,
      expenseCategory: category,
      expenseType: type
    };
    
  } catch (error) {
    console.error('Unexpected error creating expense journal entry:', error);
    return { success: false, error: 'Unexpected error creating expense journal entry' };
  }
}
