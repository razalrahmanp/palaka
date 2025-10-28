import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST() {
  try {
    console.log('🧹 Starting manual cleanup of duplicate bank transactions...');

    // Get all bank transactions with expense references
    const { data: bankTransactions, error: btError } = await supabase
      .from('bank_transactions')
      .select('*')
      .like('reference', 'EXP-%')
      .order('created_at', { ascending: true });

    if (btError) {
      throw new Error(`Failed to fetch bank transactions: ${btError.message}`);
    }

    console.log(`📊 Found ${bankTransactions?.length || 0} expense-related bank transactions`);

    // Group by reference to find duplicates
    const referenceGroups = new Map<string, Array<Record<string, unknown>>>();
    bankTransactions?.forEach(bt => {
      if (bt.reference) {
        if (!referenceGroups.has(bt.reference)) {
          referenceGroups.set(bt.reference, []);
        }
        referenceGroups.get(bt.reference)!.push(bt);
      }
    });

    // Find duplicates and prepare for deletion
    const duplicatesToDelete: string[] = [];

    referenceGroups.forEach((transactions, reference) => {
      if (transactions.length > 1) {
        console.log(`🔍 Found ${transactions.length} duplicates for ${reference}`);
        
        // Sort by created_at and keep the oldest one
        transactions.sort((a, b) => {
          const aTime = new Date((a as { created_at: string }).created_at).getTime();
          const bTime = new Date((b as { created_at: string }).created_at).getTime();
          return aTime - bTime;
        });
        
        // Mark all except the first one for deletion
        const [, ...toDelete] = transactions;
        toDelete.forEach(bt => duplicatesToDelete.push((bt as { id: string }).id));
      }
    });

    console.log(`🧹 Will delete ${duplicatesToDelete.length} duplicate transactions`);

    // Delete duplicates in small batches to avoid timeout
    let deletedCount = 0;
    const batchSize = 25; // Smaller batches to be safe
    const errors: string[] = [];

    for (let i = 0; i < duplicatesToDelete.length; i += batchSize) {
      const batch = duplicatesToDelete.slice(i, i + batchSize);
      console.log(`🗑️  Deleting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(duplicatesToDelete.length / batchSize)} (${batch.length} items)`);
      
      try {
        const { error: deleteError, count } = await supabase
          .from('bank_transactions')
          .delete({ count: 'exact' })
          .in('id', batch);

        if (deleteError) {
          console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, deleteError.message);
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${deleteError.message}`);
        } else {
          deletedCount += count || batch.length;
          console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} deleted ${count || batch.length} transactions`);
        }
      } catch (error) {
        console.error(`💥 Batch ${Math.floor(i / batchSize) + 1} error:`, error);
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verify final state
    const { data: remainingBankTransactions, error: verifyError } = await supabase
      .from('bank_transactions')
      .select('reference')
      .like('reference', 'EXP-%');

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
    }

    // Count remaining duplicates
    const remainingGroups = new Map<string, number>();
    remainingBankTransactions?.forEach(bt => {
      if (bt.reference) {
        remainingGroups.set(bt.reference, (remainingGroups.get(bt.reference) || 0) + 1);
      }
    });

    const stillDuplicated = Array.from(remainingGroups.entries())
      .filter(([, count]) => count > 1)
      .map(([ref, count]) => ({ reference: ref, count }));

    const result = {
      success: true,
      cleanup_summary: {
        totalExpenseTransactionsFound: bankTransactions?.length || 0,
        duplicateReferencesFound: referenceGroups.size - (referenceGroups.size - Array.from(referenceGroups.values()).filter(arr => arr.length > 1).length),
        transactionsMarkedForDeletion: duplicatesToDelete.length,
        transactionsActuallyDeleted: deletedCount,
        errorsEncountered: errors.length,
        stillDuplicatedAfterCleanup: stillDuplicated.length
      },
      details: {
        batchesProcessed: Math.ceil(duplicatesToDelete.length / batchSize),
        errors: errors,
        stillDuplicatedReferences: stillDuplicated.slice(0, 10), // Show first 10
        remainingExpenseTransactions: remainingBankTransactions?.length || 0
      },
      verification: {
        cleanupSuccessful: deletedCount > 0 && stillDuplicated.length === 0,
        cleanupPercentage: duplicatesToDelete.length > 0 ? 
          Math.round((deletedCount / duplicatesToDelete.length) * 100) : 100
      }
    };

    console.log(`✅ Manual cleanup complete: ${deletedCount}/${duplicatesToDelete.length} duplicates removed`);
    console.log(`📊 Remaining duplicated references: ${stillDuplicated.length}`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('💥 Error in manual cleanup:', error);
    return NextResponse.json({
      error: 'Failed to cleanup duplicates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}