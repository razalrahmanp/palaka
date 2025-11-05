// app/api/finance/account-expenses/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

// Helper function to fetch all records with pagination
async function fetchAllRecords<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  pageSize: number = 1000
): Promise<T[]> {
  let allData: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    
    if (error) {
      console.error('Error fetching records:', error);
      break;
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += pageSize;
      hasMore = data.length === pageSize; // If we got less than pageSize, we're done
    } else {
      hasMore = false;
    }
  }

  return allData;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountCode = searchParams.get('accountCode');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!accountCode) {
      return NextResponse.json(
        { success: false, error: 'Account code is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching expenses for accountCode:', accountCode, 'dateRange:', startDate, '-', endDate);

    // Build the query to fetch from expenses table using ONLY category
    let query = supabase
      .from('expenses')
      .select(`
        id,
        date,
        description,
        amount,
        category,
        subcategory,
        payment_method,
        entity_type,
        entity_id
      `)
      .eq('category', accountCode)
      .order('date', { ascending: false });

    // Apply date filters if provided
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    // Use pagination to fetch all records (Supabase has 1000 row limit)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expenseEntries = await fetchAllRecords<any>(query);

    console.log(`✅ Found ${expenseEntries?.length || 0} expenses for ${accountCode}`);

    // Format the response to match expected structure
    const expenses = (expenseEntries || []).map(entry => ({
      id: entry.id,
      date: entry.date,
      transaction_date: entry.date,
      description: entry.description || `${entry.category || ''} - ${entry.subcategory || ''}`.trim(),
      particulars: entry.payment_method || entry.entity_type,
      amount: entry.amount,
      category: entry.category,
      subcategory: entry.subcategory
    }));

    return NextResponse.json({
      success: true,
      expenses: expenses,
      count: expenses.length
    });

  } catch (error) {
    console.error('Unexpected error in account-expenses API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
