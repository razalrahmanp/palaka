import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * API to synchronize inventory values with accounting
 * This endpoint updates the inventory asset accounts based on current stock levels
 */
export async function POST() {
  try {
    // Get all inventory items with their current values
    const { data: inventoryItems, error: inventoryError } = await supabaseAdmin
      .from('inventory_items')
      .select(`
        id,
        quantity,
        products (
          id,
          name,
          price,
          cost,
          sku
        )
      `)
      .gt('quantity', 0)

    if (inventoryError) {
      console.error('Error fetching inventory:', inventoryError)
      return NextResponse.json({ error: inventoryError.message }, { status: 500 })
    }

    // Calculate total inventory value
    let totalInventoryValue = 0
    const inventoryBreakdown = []

    for (const item of inventoryItems || []) {
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      if (product) {
        // Use actual cost price if available, otherwise fall back to price * 0.7 as estimate
        const costPrice = product.cost || (product.price * 0.7)
        const itemValue = item.quantity * costPrice
        totalInventoryValue += itemValue
        
        inventoryBreakdown.push({
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          quantity: item.quantity,
          unit_price: product.price, // MRP for reference
          cost_price: costPrice, // Actual cost
          total_value: item.quantity * product.price, // Total MRP value
          total_cost: itemValue // Total cost value
        })
      }
    }

    // Find or create the main inventory account
    const { data: inventoryAccount, error: accountError } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('*')
      .eq('account_code', '1330')
      .eq('account_name', 'Finished Goods')
      .single()

    if (accountError && accountError.code === 'PGRST116') {
      // Account doesn't exist, create it
      const { data: newAccount, error: createError } = await supabaseAdmin
        .from('chart_of_accounts')
        .insert({
          account_code: '1330',
          account_name: 'Finished Goods',
          account_type: 'ASSET',
          account_subtype: 'CURRENT_ASSET',
          normal_balance: 'DEBIT',
          description: 'Completed furniture ready for sale',
          current_balance: 0,
          opening_balance: 0,
          is_active: true
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating inventory account:', createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      const finalAccount = newAccount
      
      // Update the inventory account balance
      const { error: updateError } = await supabaseAdmin
        .from('chart_of_accounts')
        .update({
          current_balance: totalInventoryValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', finalAccount.id)

      if (updateError) {
        console.error('Error updating inventory account:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: {
          totalInventoryValue,
          previousBalance: 0,
          adjustment: totalInventoryValue,
          itemCount: inventoryItems?.length || 0,
          inventoryBreakdown,
          accountUpdated: finalAccount.account_name
        }
      })
    } else if (accountError) {
      console.error('Error fetching inventory account:', accountError)
      return NextResponse.json({ error: accountError.message }, { status: 500 })
    }

    // Update the inventory account balance
    const { error: updateError } = await supabaseAdmin
      .from('chart_of_accounts')
      .update({
        current_balance: totalInventoryValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryAccount.id)

    if (updateError) {
      console.error('Error updating inventory account:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Create a journal entry for the inventory adjustment if there's a difference
    const previousBalance = inventoryAccount.current_balance || 0
    const adjustment = totalInventoryValue - previousBalance

    if (Math.abs(adjustment) > 0.01) { // Only create entry if difference is significant
      // Create journal entry
      const { data: journalEntry, error: journalError } = await supabaseAdmin
        .from('journal_entries')
        .insert({
          journal_number: `INV-ADJ-${Date.now()}`,
          reference_number: `INVENTORY-SYNC-${new Date().toISOString().split('T')[0]}`,
          description: 'Inventory valuation adjustment',
          transaction_date: new Date().toISOString(),
          total_debit: Math.abs(adjustment),
          total_credit: Math.abs(adjustment),
          status: 'posted',
          entry_type: 'GENERAL'
        })
        .select()
        .single()

      if (journalError) {
        console.error('Error creating journal entry:', journalError)
      } else {
        // Create general ledger entries
        const ledgerEntries = []

        if (adjustment > 0) {
          // Inventory increased
          ledgerEntries.push(
            {
              journal_entry_id: journalEntry.id,
              account_id: inventoryAccount.id,
              transaction_date: new Date().toISOString(),
              debit_amount: adjustment,
              credit_amount: 0,
              description: 'Inventory increase adjustment',
              reference: journalEntry.reference_number
            }
          )

          // Credit to inventory adjustment account (create if not exists)
          let { data: adjustmentAccount } = await supabaseAdmin
            .from('chart_of_accounts')
            .select('*')
            .eq('account_code', '5900')
            .single()

          if (!adjustmentAccount) {
            const { data: newAdjAccount } = await supabaseAdmin
              .from('chart_of_accounts')
              .insert({
                account_code: '5900',
                account_name: 'Inventory Adjustments',
                account_type: 'EXPENSE',
                account_subtype: 'OTHER_EXPENSE',
                normal_balance: 'DEBIT',
                description: 'Inventory valuation adjustments',
                current_balance: 0,
                is_active: true
              })
              .select()
              .single()

            adjustmentAccount = newAdjAccount
          }

          if (adjustmentAccount) {
            ledgerEntries.push({
              journal_entry_id: journalEntry.id,
              account_id: adjustmentAccount.id,
              transaction_date: new Date().toISOString(),
              debit_amount: 0,
              credit_amount: adjustment,
              description: 'Inventory adjustment credit',
              reference: journalEntry.reference_number
            })
          }
        } else {
          // Inventory decreased - reverse the entries
          ledgerEntries.push(
            {
              journal_entry_id: journalEntry.id,
              account_id: inventoryAccount.id,
              transaction_date: new Date().toISOString(),
              debit_amount: 0,
              credit_amount: Math.abs(adjustment),
              description: 'Inventory decrease adjustment',
              reference: journalEntry.reference_number
            }
          )
        }

        if (ledgerEntries.length > 0) {
          await supabaseAdmin
            .from('general_ledger')
            .insert(ledgerEntries)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalInventoryValue,
        previousBalance,
        adjustment,
        itemCount: inventoryItems?.length || 0,
        inventoryBreakdown,
        accountUpdated: inventoryAccount.account_name
      }
    })

  } catch (error) {
    console.error('Error syncing inventory:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to sync inventory with accounting' 
    }, { status: 500 })
  }
}

/**
 * GET endpoint to retrieve current inventory accounting status
 */
export async function GET() {
  try {
    // Get inventory account details
    const { data: inventoryAccount, error: accountError } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('*')
      .eq('account_code', '1330')
      .single()

    if (accountError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Inventory account not found. Please sync inventory first.' 
      }, { status: 404 })
    }

    // Get inventory breakdown
    const { data: inventoryItems } = await supabaseAdmin
      .from('inventory_items')
      .select(`
        id,
        quantity,
        products (
          id,
          name,
          price,
          cost,
          sku
        )
      `)
      .gt('quantity', 0)

    let calculatedValue = 0
    const inventoryBreakdown = []

    for (const item of inventoryItems || []) {
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      if (product) {
        // Use actual cost price if available, otherwise fall back to price * 0.7 as estimate
        const costPrice = product.cost || (product.price * 0.7)
        const itemValue = item.quantity * costPrice
        calculatedValue += itemValue
        
        inventoryBreakdown.push({
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          quantity: item.quantity,
          unit_price: product.price, // MRP for reference
          cost_price: costPrice, // Actual cost
          total_value: item.quantity * product.price, // Total MRP value
          total_cost: itemValue // Total cost value
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        inventoryAccount,
        calculatedValue,
        recordedValue: inventoryAccount.current_balance || 0,
        variance: calculatedValue - (inventoryAccount.current_balance || 0),
        inventoryBreakdown,
        lastUpdated: inventoryAccount.updated_at
      }
    })

  } catch (error) {
    console.error('Error fetching inventory status:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch inventory status' 
    }, { status: 500 })
  }
}
