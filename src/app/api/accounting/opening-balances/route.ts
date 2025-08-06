import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseAdmin'

interface InventoryItem {
  quantity: number
  unit_cost: number
}

interface Supplier {
  supplier_id: string
  supplier_name: string
  outstanding_amount?: number  // Optional for backward compatibility
  amount_owed?: number         // Alternative field name
}

interface OpeningBalance {
  account_id: string
  amount: number
  description?: string
}

export async function GET() {
  try {
    // Get all opening balances with related information
    const { data: openingBalances, error } = await supabase
      .from('opening_balances')
      .select(`
        *,
        account:chart_of_accounts(account_code, account_name, account_type),
        period:accounting_periods(period_name, fiscal_year)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: openingBalances || []
    });

  } catch (error) {
    console.error('Error fetching opening balances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opening balances' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { 
      openingBalances, 
      supplierOutstanding, 
      inventoryItems,
      markSuppliersAsPaid = []
    } = await req.json()

    console.log('📝 Processing opening balances:', {
      openingBalances: openingBalances?.length || 0,
      supplierOutstanding: supplierOutstanding?.length || 0,
      inventoryItems: inventoryItems?.length || 0,
      markSuppliersAsPaid: markSuppliersAsPaid.length,
      supplierData: supplierOutstanding // Debug: Log actual supplier data
    })

    // Validate input data
    if (!supplierOutstanding || !Array.isArray(supplierOutstanding) || supplierOutstanding.length === 0) {
      console.log('⚠️ No supplier outstanding data provided')
      return NextResponse.json({
        success: false,
        error: 'No supplier outstanding data provided. Please ensure supplier data is included in the request.'
      }, { status: 400 })
    }

    // Get the first user from users table for system entries
    const { data: systemUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single()

    if (!systemUser) {
      throw new Error('No users found in system for creating journal entries')
    }

    // Calculate totals including ALL suppliers (paid and unpaid)
    const totalInventoryValue = inventoryItems?.reduce(
      (sum: number, item: InventoryItem) => sum + (item.quantity * item.unit_cost), 
      0
    ) || 0

    // Include ALL suppliers for journal entry calculation
    const allSupplierPayables = supplierOutstanding?.reduce(
      (sum: number, supplier: Supplier) => {
        const amount = supplier.outstanding_amount || supplier.amount_owed || 0;
        return sum + amount;
      }, 
      0
    ) || 0

    console.log('💰 Calculated allSupplierPayables:', allSupplierPayables)

    // Only include suppliers that are NOT marked as paid for vendor bill creation
    const unpaidSuppliers = supplierOutstanding?.filter(
      (s: Supplier) => !markSuppliersAsPaid.includes(s.supplier_id)
    ) || []

    // 1. Create the main opening balance journal entry
    const journalEntry = {
      journal_number: `OB-${Date.now()}`,
      entry_date: new Date().toISOString().split('T')[0],
      reference_number: 'OB-001',
      description: 'Opening balances as of system implementation',
      status: 'POSTED',
      created_by: systemUser.id,
      updated_by: systemUser.id
    }

    const { data: journalData, error: journalError } = await supabase
      .from('journal_entries')
      .insert(journalEntry)
      .select()
      .single()

    if (journalError) {
      console.error('❌ Journal entry error:', journalError)
      throw new Error(`Failed to create journal entry: ${journalError.message}`)
    }

    const lines = []
    let lineNumber = 1

    // 2. Inventory Asset Entry
    if (totalInventoryValue > 0) {
      // Ensure Finished Goods account exists
      let { data: inventoryAccount } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('account_code', '1330')
        .single()

      if (!inventoryAccount) {
        const { data: newAccount, error: accountError } = await supabase
          .from('chart_of_accounts')
          .insert({
            account_code: '1330',
            account_name: 'Finished Goods',
            account_type: 'ASSET',
            account_subtype: 'CURRENT_ASSET',
            normal_balance: 'DEBIT',
            description: 'Completed furniture ready for sale',
            created_by: systemUser.id,
            updated_by: systemUser.id
          })
          .select()
          .single()

        if (accountError) {
          console.error('❌ Error creating inventory account:', accountError)
        } else {
          inventoryAccount = newAccount
        }
      }

      if (inventoryAccount) {
        lines.push({
          journal_entry_id: journalData.id,
          line_number: lineNumber++,
          account_id: inventoryAccount.id,
          description: 'Opening inventory - finished goods',
          debit_amount: totalInventoryValue,
          credit_amount: 0,
          updated_by: systemUser.id
        })

        // Update account balance
        await supabase
          .from('chart_of_accounts')
          .update({ 
            current_balance: totalInventoryValue,
            opening_balance: totalInventoryValue 
          })
          .eq('id', inventoryAccount.id)
      }
    }

    // 3. Supplier Payables (use total for journal entry)
    if (allSupplierPayables > 0) {
      console.log('📝 Creating payable account entry for:', allSupplierPayables)
      
      let { data: payableAccount } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('account_code', '2100')
        .single()

      console.log('📝 Payable account found:', payableAccount)

      if (!payableAccount) {
        console.log('📝 Creating new payable account...')
        const { data: newAccount, error: accountError } = await supabase
          .from('chart_of_accounts')
          .insert({
            account_code: '2100',
            account_name: 'Accounts Payable',
            account_type: 'LIABILITY',
            account_subtype: 'CURRENT_LIABILITY',
            normal_balance: 'CREDIT',
            description: 'Money owed to suppliers',
            created_by: systemUser.id,
            updated_by: systemUser.id
          })
          .select()
          .single()

        if (!accountError) {
          payableAccount = newAccount
          console.log('📝 Created new payable account:', payableAccount)
        } else {
          console.error('❌ Error creating payable account:', accountError)
        }
      }

      if (payableAccount) {
        console.log('📝 Adding payable line to journal entry')
        lines.push({
          journal_entry_id: journalData.id,
          line_number: lineNumber++,
          account_id: payableAccount.id,
          description: 'Opening supplier payables',
          debit_amount: 0,
          credit_amount: allSupplierPayables,
          updated_by: systemUser.id
        })

        await supabase
          .from('chart_of_accounts')
          .update({ 
            current_balance: allSupplierPayables,
            opening_balance: allSupplierPayables 
          })
          .eq('id', payableAccount.id)
      }
    }

    // 4. Other opening balances
    if (openingBalances && openingBalances.length > 0) {
      for (const balance of openingBalances as OpeningBalance[]) {
        if (balance.account_id && balance.amount !== 0) {
          lines.push({
            journal_entry_id: journalData.id,
            line_number: lineNumber++,
            account_id: balance.account_id,
            description: balance.description || 'Opening balance',
            debit_amount: balance.amount > 0 ? balance.amount : 0,
            credit_amount: balance.amount < 0 ? Math.abs(balance.amount) : 0,
            updated_by: systemUser.id
          })

          await supabase
            .from('chart_of_accounts')
            .update({ 
              current_balance: balance.amount,
              opening_balance: balance.amount 
            })
            .eq('id', balance.account_id)
        }
      }
    }

    // 5. Balancing entry - Owner's Equity
    const totalDebits = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0)
    const totalCredits = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0)
    const balancingAmount = totalDebits - totalCredits

    if (Math.abs(balancingAmount) > 0.01) {
      let { data: equityAccount } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('account_code', '3000')
        .single()

      if (!equityAccount) {
        const { data: newAccount, error: accountError } = await supabase
          .from('chart_of_accounts')
          .insert({
            account_code: '3000',
            account_name: 'Owners Equity',
            account_type: 'EQUITY',
            account_subtype: 'CAPITAL',
            normal_balance: 'CREDIT',
            description: 'Owner capital investment',
            created_by: systemUser.id,
            updated_by: systemUser.id
          })
          .select()
          .single()

        if (!accountError) {
          equityAccount = newAccount
        }
      }

      if (equityAccount) {
        lines.push({
          journal_entry_id: journalData.id,
          line_number: lineNumber++,
          account_id: equityAccount.id,
          description: 'Opening balance - owner equity',
          debit_amount: balancingAmount < 0 ? Math.abs(balancingAmount) : 0,
          credit_amount: balancingAmount > 0 ? balancingAmount : 0,
          updated_by: systemUser.id
        })

        await supabase
          .from('chart_of_accounts')
          .update({ 
            current_balance: balancingAmount,
            opening_balance: balancingAmount 
          })
          .eq('id', equityAccount.id)
      }
    }

    // Insert all journal lines
    if (lines.length > 0) {
      console.log('📝 Inserting journal lines:', lines.length, 'lines')
      console.log('📝 Sample line structure:', lines[0])
      
      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines)

      if (linesError) {
        console.error('❌ Lines error:', linesError)
        console.error('❌ Full error details:', JSON.stringify(linesError, null, 2))
        throw new Error(`Failed to create journal lines: ${linesError.message}`)
      }

      // Update journal entry totals
      const finalTotalDebits = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0)
      const finalTotalCredits = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0)

      await supabase
        .from('journal_entries')
        .update({
          total_debit: finalTotalDebits,
          total_credit: finalTotalCredits,
          posted_at: new Date().toISOString()
        })
        .eq('id', journalData.id)
    }

    // 6. Create vendor bills for suppliers with outstanding amounts
    for (const supplier of unpaidSuppliers) {
      const supplierAmount = supplier.outstanding_amount || supplier.amount_owed || 0;
      
      if (supplierAmount > 0) {
        console.log(`📝 Creating vendor bill for ${supplier.supplier_name}: ₹${supplierAmount}`)
        
        // Create vendor bill for this supplier
        const billNumber = `OB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        const { error: billError } = await supabase
          .from('vendor_bills')
          .insert({
            bill_number: billNumber,
            supplier_id: supplier.supplier_id,
            bill_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
            total_amount: supplierAmount,
            paid_amount: 0,
            status: 'pending',
            description: `Opening balance - ${supplier.supplier_name}`,
            reference_number: `OB-REF-${Date.now()}`,
            created_by: systemUser.id,
            updated_by: systemUser.id
          })

        if (billError) {
          console.error(`❌ Error creating vendor bill for ${supplier.supplier_name}:`, billError)
        } else {
          console.log(`✅ Created vendor bill ${billNumber} for ${supplier.supplier_name}`)
        }
      }
    }

    // 7. Handle suppliers marked as already paid
    for (const supplierId of markSuppliersAsPaid) {
      const supplier = supplierOutstanding?.find((s: Supplier) => s.supplier_id === supplierId)
      if (supplier) {
        const supplierAmount = supplier.outstanding_amount || supplier.amount_owed || 0;
        
        if (supplierAmount > 0) {
          console.log(`📝 Marking supplier ${supplier.supplier_name} as already paid: ₹${supplierAmount}`)
          
          // Create vendor bill first (to maintain consistency)
          const billNumber = `PAID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          
          const { data: vendorBill } = await supabase
            .from('vendor_bills')
            .insert({
              bill_number: billNumber,
              supplier_id: supplierId,
              bill_date: new Date().toISOString().split('T')[0],
              due_date: new Date().toISOString().split('T')[0],
              total_amount: supplierAmount,
              paid_amount: supplierAmount,
              status: 'paid',
              description: `Opening balance - Already paid to ${supplier.supplier_name}`,
              reference_number: `PAID-REF-${Date.now()}`,
              created_by: systemUser.id,
              updated_by: systemUser.id
            })
            .select()
            .single()

          if (vendorBill) {
            // Create payment history record
            await supabase
              .from('vendor_payment_history')
              .insert({
                supplier_id: supplierId,
                vendor_bill_id: vendorBill.id,
                payment_number: `PAY-${billNumber}`,
                payment_date: new Date().toISOString().split('T')[0],
                amount: supplierAmount,
                payment_method: 'BANK',
                status: 'completed',
                description: `Opening balance payment to ${supplier.supplier_name}`,
                reference_number: `OB-PAY-${supplierId}`,
                created_by: systemUser.id
              })
          }
          
          // Create a payment journal entry
          const paidJournalEntry = {
            journal_number: `PAID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            entry_date: new Date().toISOString().split('T')[0],
            reference_number: `PAID-${Date.now()}`,
            description: `Mark supplier as already paid - ${supplier.supplier_name}`,
            status: 'POSTED',
            created_by: systemUser.id,
            updated_by: systemUser.id
          }

          const { data: paidJournal, error: paidJournalError } = await supabase
            .from('journal_entries')
            .insert(paidJournalEntry)
            .select()
            .single()

          if (!paidJournalError && paidJournal) {
            // This represents that the payment was already made from owner's equity/cash
            const paidLines = [
              {
                journal_entry_id: paidJournal.id,
                line_number: 1,
                account_id: (await supabase.from('chart_of_accounts').select('id').eq('account_code', '2100').single()).data?.id,
                description: `Already paid to ${supplier.supplier_name}`,
                debit_amount: supplierAmount,
                credit_amount: 0,
                updated_by: systemUser.id
              },
              {
                journal_entry_id: paidJournal.id,
                line_number: 2,
                account_id: (await supabase.from('chart_of_accounts').select('id').eq('account_code', '3000').single()).data?.id,
                description: `Payment from owner equity - ${supplier.supplier_name}`,
                debit_amount: 0,
                credit_amount: supplierAmount,
                updated_by: systemUser.id
              }
            ]

            await supabase.from('journal_entry_lines').insert(paidLines)
            
            await supabase
              .from('journal_entries')
              .update({
                total_debit: supplierAmount,
                total_credit: supplierAmount,
                posted_at: new Date().toISOString()
              })
              .eq('id', paidJournal.id)
          }
        }
      }
    }

    console.log('✅ Opening balances processed successfully')

    return NextResponse.json({
      success: true,
      data: {
        journal_entry_id: journalData.id,
        total_inventory_value: totalInventoryValue,
        total_supplier_payables: allSupplierPayables,
        balancing_amount: balancingAmount,
        marked_as_paid_count: markSuppliersAsPaid.length,
        unpaid_suppliers_count: unpaidSuppliers.length,
        vendor_bills_created: unpaidSuppliers.length + markSuppliersAsPaid.length,
        integration_note: "Vendor bills created - changes will now reflect in Supplier Outstanding tab"
      }
    })

  } catch (error) {
    console.error('❌ Error in opening balances:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
}
