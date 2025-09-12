// src/app/api/finance/expenses/cleanup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { deleteExpenseAndRelatedRecords, createCleanupHelperFunctions } from '@/lib/expense-integrations/expenseCleanupManager';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get('expense_id');
    const entityType = searchParams.get('entity_type') as 'truck' | 'employee' | 'supplier';
    const entityId = searchParams.get('entity_id');

    if (!expenseId) {
      return NextResponse.json({ 
        error: 'expense_id parameter is required' 
      }, { status: 400 });
    }

    console.log(`🗑️ Cleanup request for expense: ${expenseId}, entity: ${entityType}:${entityId}`);

    // Ensure cleanup helper functions exist
    await createCleanupHelperFunctions();
    
    // Delete expense and all related records
    const result = await deleteExpenseAndRelatedRecords({
      expenseId,
      entityType,
      entityId: entityId || undefined
    });

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error,
        deletedRecords: result.deletedRecords
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Expense and all related records deleted successfully',
      expenseId,
      entityType,
      entityId,
      deletedRecords: result.deletedRecords
    });

  } catch (error) {
    console.error('❌ Error in expense cleanup API:', error);
    return NextResponse.json({ 
      error: 'Internal server error during cleanup',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { expenseIds, entityType, entityId } = body;

    if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
      return NextResponse.json({ 
        error: 'expenseIds array is required' 
      }, { status: 400 });
    }

    console.log(`🗑️ Bulk cleanup request for ${expenseIds.length} expenses`);

    // Ensure cleanup helper functions exist
    await createCleanupHelperFunctions();
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each expense deletion
    for (const expenseId of expenseIds) {
      try {
        const result = await deleteExpenseAndRelatedRecords({
          expenseId,
          entityType,
          entityId
        });

        if (result.success) {
          successCount++;
          results.push({
            expenseId,
            success: true,
            deletedRecords: result.deletedRecords
          });
        } else {
          errorCount++;
          results.push({
            expenseId,
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        errorCount++;
        results.push({
          expenseId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: `Bulk cleanup completed: ${successCount} success, ${errorCount} errors`,
      summary: {
        total: expenseIds.length,
        success: successCount,
        errors: errorCount
      },
      results
    });

  } catch (error) {
    console.error('❌ Error in bulk expense cleanup API:', error);
    return NextResponse.json({ 
      error: 'Internal server error during bulk cleanup',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
