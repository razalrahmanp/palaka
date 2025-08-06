import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

interface CategoryBreakdown {
  category: string;
  totalQuantity: number;
  totalValue: number;
  items: Array<{
    id: string;
    quantity: number;
    product?: { cost?: number };
    unit_cost?: number;
    itemValue: number;
  }>;
  classification?: string;
  valuePercentage?: number;
  cumulativePercentage?: number;
}

export async function GET() {
  try {
    // Get inventory valuation with detailed breakdown
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_items')
      .select(`
        *,
        product:products(
          id,
          name,
          category,
          cost,
          price,
          description,
          sku
        ),
        location:inventory_locations(
          name,
          location_type
        )
      `)
      .gt('quantity', 0)
      .order('quantity', { ascending: false });

    if (inventoryError) throw inventoryError;

    // Calculate current inventory value
    const inventoryValue = inventoryItems?.reduce((sum, item) => {
      const itemCost = item.product?.cost || item.unit_cost || 0;
      return sum + (item.quantity * itemCost);
    }, 0) || 0;

    // Group by category for breakdown
    const categoryBreakdown = inventoryItems?.reduce((acc, item) => {
      const category = item.product?.category || 'Uncategorized';
      const itemCost = item.product?.cost || item.unit_cost || 0;
      const itemValue = item.quantity * itemCost;

      if (!acc[category]) {
        acc[category] = {
          category,
          totalQuantity: 0,
          totalValue: 0,
          items: []
        };
      }

      acc[category].totalQuantity += item.quantity;
      acc[category].totalValue += itemValue;
      acc[category].items.push({
        ...item,
        itemValue
      });

      return acc;
    }, {} as Record<string, CategoryBreakdown>) || {};

    // Low stock analysis
    const lowStockItems = inventoryItems?.filter(item => 
      item.quantity <= (item.reorder_point || 5)
    ) || [];

    // Get recent inventory movements
    const { data: recentMovements } = await supabase
      .from('inventory_movements')
      .select(`
        *,
        product:products(name, sku),
        location:inventory_locations(name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    // ABC Analysis (based on value)
    const sortedByValue = (Object.values(categoryBreakdown) as CategoryBreakdown[])
      .sort((a, b) => b.totalValue - a.totalValue);

    let cumulativeValue = 0;
    const totalValue = inventoryValue;
    
    const abcAnalysis = sortedByValue.map((category) => {
      cumulativeValue += category.totalValue;
      const cumulativePercentage = (cumulativeValue / totalValue) * 100;
      
      let classification = 'C';
      if (cumulativePercentage <= 80) classification = 'A';
      else if (cumulativePercentage <= 95) classification = 'B';
      
      return {
        ...category,
        classification,
        valuePercentage: (category.totalValue / totalValue) * 100,
        cumulativePercentage
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalValue: inventoryValue,
          totalItems: inventoryItems?.length || 0,
          totalQuantity: inventoryItems?.reduce((sum, item) => sum + item.quantity, 0) || 0,
          categoriesCount: Object.keys(categoryBreakdown).length,
          lowStockCount: lowStockItems.length
        },
        categoryBreakdown: Object.values(categoryBreakdown),
        abcAnalysis,
        lowStockItems: lowStockItems.map(item => ({
          ...item,
          product: item.product,
          shortfall: (item.reorder_point || 5) - item.quantity,
          itemValue: item.quantity * (item.product?.cost || item.unit_cost || 0)
        })),
        recentMovements: recentMovements || [],
        valuation: {
          method: 'Average Cost',
          date: new Date().toISOString(),
          totalAssetValue: inventoryValue,
          breakdown: {
            rawMaterials: 0, // Can be enhanced if you have raw materials tracking
            workInProgress: 0, // Can be enhanced if you have WIP tracking
            finishedGoods: inventoryValue
          }
        }
      }
    });

  } catch (error) {
    console.error('Inventory valuation error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory valuation' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      adjustments, // Array of { item_id, new_quantity, reason, unit_cost }
      adjustment_date,
      notes 
    } = await request.json();

    if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
      return NextResponse.json(
        { error: 'Adjustments array is required' },
        { status: 400 }
      );
    }

    const results = [];
    let totalAdjustmentValue = 0;

    // Process each adjustment
    for (const adjustment of adjustments) {
      const { item_id, new_quantity, reason, unit_cost } = adjustment;

      // Get current item data
      const { data: currentItem, error: itemError } = await supabase
        .from('inventory_items')
        .select('*, product:products(name, cost)')
        .eq('id', item_id)
        .single();

      if (itemError || !currentItem) {
        console.error(`Item ${item_id} not found:`, itemError);
        continue;
      }

      const oldQuantity = currentItem.quantity;
      const quantityDiff = new_quantity - oldQuantity;
      const costPerUnit = unit_cost || currentItem.product?.cost || currentItem.unit_cost || 0;
      const adjustmentValue = quantityDiff * costPerUnit;
      
      totalAdjustmentValue += adjustmentValue;

      // Update inventory quantity
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ 
          quantity: new_quantity,
          unit_cost: unit_cost || currentItem.unit_cost,
          updated_at: new Date().toISOString()
        })
        .eq('id', item_id);

      if (updateError) {
        console.error(`Failed to update item ${item_id}:`, updateError);
        continue;
      }

      // Record inventory movement
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          product_id: currentItem.product_id,
          location_id: currentItem.location_id,
          movement_type: quantityDiff > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          quantity: Math.abs(quantityDiff),
          unit_cost: costPerUnit,
          reference_number: `ADJ-${Date.now()}-${item_id.substring(0, 8)}`,
          notes: `${reason || 'Inventory adjustment'} - ${notes || ''}`,
          movement_date: adjustment_date || new Date().toISOString()
        });

      if (movementError) {
        console.error(`Failed to record movement for ${item_id}:`, movementError);
      }

      results.push({
        item_id,
        product_name: currentItem.product?.name,
        old_quantity: oldQuantity,
        new_quantity,
        quantity_diff: quantityDiff,
        adjustment_value: adjustmentValue,
        success: true
      });
    }

    // Create journal entry for significant adjustments
    if (Math.abs(totalAdjustmentValue) > 0.01) {
      const journalNumber = `INV-ADJ-${Date.now()}`;
      
      // Get or create inventory adjustment account
      let { data: adjustmentAccount } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('account_code', '5200')
        .single();

      if (!adjustmentAccount) {
        const { data: newAccount } = await supabase
          .from('chart_of_accounts')
          .insert({
            account_code: '5200',
            account_name: 'Inventory Adjustments',
            account_type: 'EXPENSE',
            account_subtype: 'OPERATING_EXPENSE',
            normal_balance: 'DEBIT',
            description: 'Inventory write-offs and adjustments'
          })
          .select()
          .single();
        
        adjustmentAccount = newAccount;
      }

      // Get inventory asset account
      const { data: inventoryAccount } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('account_code', '1330')
        .single();

      if (adjustmentAccount && inventoryAccount) {
        const { data: journal } = await supabase
          .from('journal_entries')
          .insert({
            journal_number: journalNumber,
            entry_date: adjustment_date || new Date().toISOString().split('T')[0],
            description: `Inventory adjustment - ${notes || 'Quantity adjustments'}`,
            entry_type: 'ADJUSTMENT',
            total_debit: totalAdjustmentValue > 0 ? totalAdjustmentValue : Math.abs(totalAdjustmentValue),
            total_credit: totalAdjustmentValue > 0 ? totalAdjustmentValue : Math.abs(totalAdjustmentValue),
            status: 'POSTED'
          })
          .select()
          .single();

        if (journal) {
          // Create journal lines
          const lines = [];
          
          if (totalAdjustmentValue > 0) {
            // Inventory increase
            lines.push({
              journal_entry_id: journal.id,
              line_number: 1,
              account_id: inventoryAccount.id,
              description: 'Inventory adjustment - increase',
              debit_amount: totalAdjustmentValue,
              credit_amount: 0
            });
            lines.push({
              journal_entry_id: journal.id,
              line_number: 2,
              account_id: adjustmentAccount.id,
              description: 'Inventory adjustment - increase',
              debit_amount: 0,
              credit_amount: totalAdjustmentValue
            });
          } else {
            // Inventory decrease
            lines.push({
              journal_entry_id: journal.id,
              line_number: 1,
              account_id: adjustmentAccount.id,
              description: 'Inventory adjustment - decrease',
              debit_amount: Math.abs(totalAdjustmentValue),
              credit_amount: 0
            });
            lines.push({
              journal_entry_id: journal.id,
              line_number: 2,
              account_id: inventoryAccount.id,
              description: 'Inventory adjustment - decrease',
              debit_amount: 0,
              credit_amount: Math.abs(totalAdjustmentValue)
            });
          }

          await supabase
            .from('journal_entry_lines')
            .insert(lines);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        adjustments: results,
        total_adjustment_value: totalAdjustmentValue,
        items_processed: results.length,
        journal_created: Math.abs(totalAdjustmentValue) > 0.01
      },
      message: `Successfully processed ${results.length} inventory adjustments`
    });

  } catch (error) {
    console.error('Inventory adjustment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process adjustments' },
      { status: 500 }
    );
  }
}
