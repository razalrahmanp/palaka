// lib/accounting-integration.ts
// Centralized functions for creating accounting journal entries from finance operations

import { supabase } from './supabaseAdmin'

interface JournalEntryLine {
  account_id: string
  description: string
  debit_amount: number
  credit_amount: number
  reference?: string
}

interface JournalEntryRequest {
  entry_date: string
  reference_number: string
  description: string
  source_document_type: string
  source_document_id: string
  lines: JournalEntryLine[]
}

/**
 * Create a journal entry for finance operations
 */
export async function createFinanceJournalEntry(request: JournalEntryRequest) {
  try {
    // Validate balanced entry
    const totalDebits = request.lines.reduce((sum, line) => sum + line.debit_amount, 0)
    const totalCredits = request.lines.reduce((sum, line) => sum + line.credit_amount, 0)
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(`Journal entry not balanced: Debits ${totalDebits}, Credits ${totalCredits}`)
    }

    // Generate entry number
    const { data: lastEntry } = await supabase
      .from('journal_entries')
      .select('journal_number')
      .order('journal_number', { ascending: false })
      .limit(1)

    const nextEntryNumber = lastEntry && lastEntry.length > 0 
      ? (parseInt(lastEntry[0].journal_number) + 1).toString().padStart(6, '0')
      : '000001'

    // Create journal entry
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        journal_number: nextEntryNumber,
        entry_date: request.entry_date,
        reference_number: request.reference_number,
        description: request.description,
        source_document_type: request.source_document_type,
        source_document_id: request.source_document_id,
        status: 'POSTED', // Auto-post finance entries
        total_debit: totalDebits,
        total_credit: totalCredits,
        created_by: '00000000-0000-0000-0000-000000000000' // TODO: Get from auth
      })
      .select()
      .single()

    if (entryError) throw entryError

    // Create journal entry lines
    const linesWithEntryId = request.lines.map((line, index) => ({
      journal_entry_id: journalEntry.id,
      line_number: index + 1,
      account_id: line.account_id,
      debit_amount: line.debit_amount || null,
      credit_amount: line.credit_amount || null,
      description: line.description,
      reference: line.reference
    }))

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(linesWithEntryId)

    if (linesError) {
      // Clean up journal entry if lines failed
      await supabase
        .from('journal_entries')
        .delete()
        .eq('id', journalEntry.id)
      
      throw linesError
    }

    return { success: true, journalEntry }
  } catch (error) {
    console.error('Error creating finance journal entry:', error)
    throw error
  }
}

/**
 * Get default account IDs for common finance operations
 */
export async function getDefaultAccounts() {
  const { data: accounts, error } = await supabase
    .from('chart_of_accounts')
    .select('id, account_code, account_name, account_type')
    .eq('is_active', true)

  if (error) throw error

  const accountMap = new Map()
  accounts?.forEach(acc => {
    accountMap.set(acc.account_code, acc.id)
    // Also map by common names for easy lookup
    const name = acc.account_name.toLowerCase()
    if (name.includes('cash')) accountMap.set('cash', acc.id)
    if (name.includes('bank')) accountMap.set('bank', acc.id)
    if (name.includes('accounts receivable')) accountMap.set('ar', acc.id)
    if (name.includes('accounts payable')) accountMap.set('ap', acc.id)
    if (name.includes('sales revenue')) accountMap.set('sales', acc.id)
    if (name.includes('cost of goods')) accountMap.set('cogs', acc.id)
    if (name.includes('inventory')) accountMap.set('inventory', acc.id)
    if (name.includes('office expense')) accountMap.set('office_expense', acc.id)
    if (name.includes('rent expense')) accountMap.set('rent_expense', acc.id)
    if (name.includes('utilities expense')) accountMap.set('utilities_expense', acc.id)
  })

  return accountMap
}

/**
 * Create journal entry for customer invoice
 */
export async function createInvoiceJournalEntry(invoiceData: any) {
  const accounts = await getDefaultAccounts()
  
  return createFinanceJournalEntry({
    entry_date: invoiceData.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    reference_number: `INV-${invoiceData.id}`,
    description: `Customer invoice for ${invoiceData.total}`,
    source_document_type: 'INVOICE',
    source_document_id: invoiceData.id,
    lines: [
      {
        account_id: accounts.get('ar') || accounts.get('1200'), // Accounts Receivable
        description: `Invoice to customer`,
        debit_amount: invoiceData.total,
        credit_amount: 0
      },
      {
        account_id: accounts.get('sales') || accounts.get('4000'), // Sales Revenue
        description: `Sales revenue`,
        debit_amount: 0,
        credit_amount: invoiceData.total
      }
    ]
  })
}

/**
 * Create journal entry for customer payment
 */
export async function createPaymentJournalEntry(paymentData: any, invoiceData: any) {
  const accounts = await getDefaultAccounts()
  
  return createFinanceJournalEntry({
    entry_date: paymentData.date || new Date().toISOString().split('T')[0],
    reference_number: `PAY-${paymentData.id}`,
    description: `Payment received for invoice ${invoiceData.id}`,
    source_document_type: 'PAYMENT',
    source_document_id: paymentData.id,
    lines: [
      {
        account_id: accounts.get('cash') || accounts.get('1000'), // Cash/Bank
        description: `Payment received`,
        debit_amount: paymentData.amount,
        credit_amount: 0
      },
      {
        account_id: accounts.get('ar') || accounts.get('1200'), // Accounts Receivable
        description: `Payment against receivable`,
        debit_amount: 0,
        credit_amount: paymentData.amount
      }
    ]
  })
}

/**
 * Create journal entry for business expense
 */
export async function createExpenseJournalEntry(expenseData: any) {
  const accounts = await getDefaultAccounts()
  
  // Map expense categories to account IDs
  let expenseAccountId = accounts.get('office_expense') // Default
  
  switch (expenseData.category) {
    case 'Office':
      expenseAccountId = accounts.get('office_expense') || accounts.get('6100')
      break
    case 'Rent':
      expenseAccountId = accounts.get('rent_expense') || accounts.get('6200')
      break
    case 'Utilities':
      expenseAccountId = accounts.get('utilities_expense') || accounts.get('6300')
      break
    case 'Manufacturing':
      expenseAccountId = accounts.get('cogs') || accounts.get('5000')
      break
    default:
      expenseAccountId = accounts.get('office_expense') || accounts.get('6100')
  }
  
  return createFinanceJournalEntry({
    entry_date: expenseData.date || new Date().toISOString().split('T')[0],
    reference_number: `EXP-${expenseData.id}`,
    description: expenseData.description,
    source_document_type: 'EXPENSE',
    source_document_id: expenseData.id,
    lines: [
      {
        account_id: expenseAccountId,
        description: expenseData.description,
        debit_amount: expenseData.amount,
        credit_amount: 0
      },
      {
        account_id: accounts.get('cash') || accounts.get('1000'), // Cash/Bank
        description: `Payment for ${expenseData.description}`,
        debit_amount: 0,
        credit_amount: expenseData.amount
      }
    ]
  })
}

/**
 * Create journal entry for purchase order
 */
export async function createPurchaseOrderJournalEntry(poData: any) {
  const accounts = await getDefaultAccounts()
  
  return createFinanceJournalEntry({
    entry_date: poData.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    reference_number: `PO-${poData.id}`,
    description: `Purchase order for ${poData.total}`,
    source_document_type: 'PURCHASE_ORDER',
    source_document_id: poData.id,
    lines: [
      {
        account_id: accounts.get('inventory') || accounts.get('1330'), // Inventory
        description: `Inventory purchase`,
        debit_amount: poData.total,
        credit_amount: 0
      },
      {
        account_id: accounts.get('ap') || accounts.get('2000'), // Accounts Payable
        description: `Amount owed to supplier`,
        debit_amount: 0,
        credit_amount: poData.total
      }
    ]
  })
}

/**
 * Create journal entry for supplier payment
 */
export async function createSupplierPaymentJournalEntry(paymentData: any) {
  const accounts = await getDefaultAccounts()
  
  return createFinanceJournalEntry({
    entry_date: paymentData.payment_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    reference_number: `SUPP-PAY-${paymentData.id}`,
    description: `Payment to supplier`,
    source_document_type: 'SUPPLIER_PAYMENT',
    source_document_id: paymentData.id,
    lines: [
      {
        account_id: accounts.get('ap') || accounts.get('2000'), // Accounts Payable
        description: `Payment to supplier`,
        debit_amount: paymentData.amount,
        credit_amount: 0
      },
      {
        account_id: accounts.get('cash') || accounts.get('1000'), // Cash/Bank
        description: `Cash paid to supplier`,
        debit_amount: 0,
        credit_amount: paymentData.amount
      }
    ]
  })
}
