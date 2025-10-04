import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  try {    
    // Get date parameters from URL
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Default to today if no date range provided
    const today = new Date().toISOString().split('T')[0];
    const targetDate = startDate || today;
    const targetEndDate = endDate || today;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log('💸 Spending API Date Range:', {
      startDate: targetDate,
      endDate: targetEndDate,
      isDateRange: startDate && endDate && startDate !== endDate
    });
    
    // Get expenses for the date range
    const { data: todayExpenses, error: expensesError } = await supabase
      .from('expenses')
      .select(`
        id,
        amount,
        category,
        subcategory,
        description,
        payment_method,
        created_at
      `)
      .gte('date', targetDate)
      .lte('date', targetEndDate)
      .order('created_at', { ascending: false });

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError);
    }

    // Get liability payments for the date range
    const { data: liabilityPayments, error: liabilityError } = await supabase
      .from('liability_payments')
      .select(`
        id,
        amount,
        payment_date,
        description,
        payment_method
      `)
      .gte('payment_date', targetDate)
      .lte('payment_date', targetEndDate)
      .order('payment_date', { ascending: false });

    if (liabilityError) {
      console.error('Error fetching liability payments:', liabilityError);
    }

    // Get purchase order payments (vendor payments) for the date range
    const { data: vendorPayments, error: vendorError } = await supabase
      .from('purchase_order_payments')
      .select(`
        id,
        amount,
        payment_date,
        description,
        payment_method
      `)
      .gte('payment_date', targetDate)
      .lte('payment_date', targetEndDate)
      .order('payment_date', { ascending: false });

    if (vendorError) {
      console.error('Error fetching vendor payments:', vendorError);
    }

    // Get withdrawals (partner/owner withdrawals) for the date range
    const { data: todayWithdrawals, error: withdrawalsError } = await supabase
      .from('withdrawals')
      .select(`
        id,
        amount,
        withdrawal_date,
        description,
        payment_method,
        category_name
      `)
      .gte('withdrawal_date', targetDate)
      .lte('withdrawal_date', targetEndDate)
      .order('withdrawal_date', { ascending: false});

    if (withdrawalsError) {
      console.error('Error fetching withdrawals:', withdrawalsError);
    }

    // Get yesterday's total spending for comparison (still use yesterday for comparison)
    const { data: yesterdayExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('date', yesterday);

    const { data: yesterdayLiability } = await supabase
      .from('liability_payments')
      .select('amount')
      .eq('payment_date', yesterday);

    const { data: yesterdayVendor } = await supabase
      .from('purchase_order_payments')
      .select('amount')
      .eq('payment_date', yesterday);

    const { data: yesterdayWithdrawals } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('withdrawal_date', yesterday);

    // Calculate totals
    const totalExpenses = todayExpenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
    const totalLiabilityPayments = liabilityPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const totalVendorPayments = vendorPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const totalWithdrawals = todayWithdrawals?.reduce((sum, withdrawal) => sum + (withdrawal.amount || 0), 0) || 0;
    const totalSpentToday = totalExpenses + totalLiabilityPayments + totalVendorPayments + totalWithdrawals;

    // Calculate yesterday's total for comparison
    const yesterdayExpenseTotal = yesterdayExpenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
    const yesterdayLiabilityTotal = yesterdayLiability?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const yesterdayVendorTotal = yesterdayVendor?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const yesterdayWithdrawalTotal = yesterdayWithdrawals?.reduce((sum, withdrawal) => sum + (withdrawal.amount || 0), 0) || 0;
    const totalSpentYesterday = yesterdayExpenseTotal + yesterdayLiabilityTotal + yesterdayVendorTotal + yesterdayWithdrawalTotal;

    // Calculate percentage change
    const yesterdayComparison = totalSpentYesterday > 0 
      ? ((totalSpentToday - totalSpentYesterday) / totalSpentYesterday) * 100 
      : 0;

    // Categorize spending
    const spendingCategories = [
      {
        category: "Operating Expenses",
        amount: totalExpenses,
        percentage: totalSpentToday > 0 ? (totalExpenses / totalSpentToday) * 100 : 0
      },
      {
        category: "Vendor Payments",
        amount: totalVendorPayments,
        percentage: totalSpentToday > 0 ? (totalVendorPayments / totalSpentToday) * 100 : 0
      },
      {
        category: "Liability Payments",
        amount: totalLiabilityPayments,
        percentage: totalSpentToday > 0 ? (totalLiabilityPayments / totalSpentToday) * 100 : 0
      },
      {
        category: "Withdrawals",
        amount: totalWithdrawals,
        percentage: totalSpentToday > 0 ? (totalWithdrawals / totalSpentToday) * 100 : 0
      }
    ].filter(category => category.amount > 0)
     .sort((a, b) => b.amount - a.amount);

    // Add detailed expense category breakdown if we have expense data
    if (todayExpenses && todayExpenses.length > 0) {
      const expenseByCategory = todayExpenses.reduce((acc, expense) => {
        const category = expense.category || 'Other';
        acc[category] = (acc[category] || 0) + (expense.amount || 0);
        return acc;
      }, {} as Record<string, number>);

      // Replace "Operating Expenses" with detailed breakdown if significant
      if (totalExpenses > totalSpentToday * 0.1) { // If expenses are more than 10% of total
        spendingCategories.splice(
          spendingCategories.findIndex(cat => cat.category === "Operating Expenses"),
          1,
          ...Object.entries(expenseByCategory).map(([category, amount]) => ({
            category,
            amount,
            percentage: totalSpentToday > 0 ? (amount / totalSpentToday) * 100 : 0
          }))
        );
      }
    }

    const spendingData = {
      date: startDate && endDate && startDate !== endDate 
        ? `${targetDate} to ${targetEndDate}` 
        : targetDate,
      total_spent: totalSpentToday,
      categories: spendingCategories.slice(0, 6), // Limit to top 6 categories
      comparison_yesterday: Math.round(yesterdayComparison * 10) / 10,
      comparison_last_week: 0, // Would need week-ago data for this
      debug: {
        breakdown: {
          expenses: totalExpenses,
          liability_payments: totalLiabilityPayments,
          vendor_payments: totalVendorPayments,
          withdrawals: totalWithdrawals
        },
        counts: {
          expenses: todayExpenses?.length || 0,
          liability_payments: liabilityPayments?.length || 0,
          vendor_payments: vendorPayments?.length || 0,
          withdrawals: todayWithdrawals?.length || 0
        },
        yesterday_total: totalSpentYesterday,
        sample_expenses: todayExpenses?.slice(0, 3) || [],
        sample_withdrawals: todayWithdrawals?.slice(0, 3) || []
      }
    };

    console.log('💸 Spending Analysis:', {
      date: today,
      totalSpent: `₹${totalSpentToday.toLocaleString()}`,
      breakdown: {
        expenses: `₹${totalExpenses.toLocaleString()}`,
        liabilityPayments: `₹${totalLiabilityPayments.toLocaleString()}`,
        vendorPayments: `₹${totalVendorPayments.toLocaleString()}`,
        withdrawals: `₹${totalWithdrawals.toLocaleString()}`
      },
      counts: {
        expenses: todayExpenses?.length || 0,
        liabilityPayments: liabilityPayments?.length || 0,
        vendorPayments: vendorPayments?.length || 0,
        withdrawals: todayWithdrawals?.length || 0
      },
      yesterdayComparison: `${Math.round(yesterdayComparison * 10) / 10}%`
    });

    return NextResponse.json({
      success: true,
      data: spendingData
    });

  } catch (error) {
    console.error('Error fetching spending data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch spending data',
        data: null
      },
      { status: 500 }
    );
  }
}