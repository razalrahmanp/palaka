// lib/journalHelper.ts
// Helper function to create journal entries for payments
import { supabase } from "@/lib/supabaseAdmin";

export interface CreateJournalEntryParams {
  paymentId: string;
  amount: number;
  date: string;
  reference?: string;
  description?: string;
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

export async function createPaymentJournalEntry(params: CreateJournalEntryParams) {
  const { paymentId, amount, date, reference, description } = params;
  
  try {
    console.log('📝 Creating journal entry for payment:', paymentId);
    
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
    
    // Get chart of accounts - Cash and AR
    const { data: accounts, error: accountError } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name')
      .in('account_code', ['1010', '1200']);
    
    if (accountError) {
      console.error('Error fetching accounts:', accountError);
      return { success: false, error: 'Failed to get chart of accounts' };
    }
    
    const cashAccount = accounts?.find(acc => acc.account_code === '1010');
    const arAccount = accounts?.find(acc => acc.account_code === '1200');
    
    if (!cashAccount || !arAccount) {
      console.error('Required accounts not found. Cash:', cashAccount, 'AR:', arAccount);
      return { success: false, error: 'Required accounts (1010 Cash, 1200 AR) not found in chart of accounts' };
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
    
    // Create journal entry lines - Debit Cash, Credit AR
    const journalLines = [
      {
        journal_entry_id: journalEntry.id,
        account_id: cashAccount.id,
        line_number: 1,
        debit_amount: amount,
        credit_amount: 0,
        description: 'Cash received from payment'
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
      .in('id', [cashAccount.id, arAccount.id]);
    
    if (balanceError) {
      console.error('Error fetching current balances:', balanceError);
    } else {
      const currentCash = currentAccounts?.find(acc => acc.id === cashAccount.id);
      const currentAR = currentAccounts?.find(acc => acc.id === arAccount.id);
      
      // Update Cash account (Debit increases balance for asset accounts)
      if (currentCash) {
        const newCashBalance = (currentCash.current_balance || 0) + amount;
        const { error: cashUpdateError } = await supabase
          .from('chart_of_accounts')
          .update({
            current_balance: newCashBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', cashAccount.id);
        
        if (cashUpdateError) {
          console.error('Error updating cash account balance:', cashUpdateError);
        } else {
          console.log(`💰 Updated Cash balance: ${currentCash.current_balance} + ${amount} = ${newCashBalance}`);
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
      cashAccount: cashAccount.account_name,
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
      .in('account_code', ['1010', '2100']); // Cash and Accounts Payable
    
    if (accountError) {
      console.error('Error fetching accounts:', accountError);
      return { success: false, error: 'Failed to get chart of accounts' };
    }
    
    const cashAccount = accounts?.find(acc => acc.account_code === '1010');
    const apAccount = accounts?.find(acc => acc.account_code === '2100');
    
    if (!cashAccount || !apAccount) {
      console.error('Required accounts not found. Cash:', cashAccount, 'AP:', apAccount);
      return { success: false, error: 'Required accounts (1010 Cash, 2100 Accounts Payable) not found in chart of accounts' };
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
    let expenseAccountCode = accountCode || '6902'; // Default to Miscellaneous Expenses
    
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
      'Research & Development': '6900',
      'Miscellaneous': '6902'
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
