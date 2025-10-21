import { NextResponse, NextRequest } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabasePool';

interface PartnerTransaction {
  id: string;
  date: string;
  type: 'investment' | 'withdrawal';
  withdrawal_type?: 'capital_withdrawal' | 'interest_payment' | 'profit_distribution';
  amount: number;
  description: string;
  payment_method: string;
  reference_number?: string;
  upi_reference?: string;
  category?: string;
  subcategory?: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partner_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'Partner ID is required' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;
    
    console.log('Fetching transactions for partner:', { partnerId, page, limit, offset });

    // First, verify partner exists
    const { data: partner, error: partnerError } = await supabaseAdmin
      .from('partners')
      .select('id, name, partner_type, email, phone')
      .eq('id', partnerId)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }

    const transactions: PartnerTransaction[] = [];

    // Fetch investments
    const { data: investments, error: investmentError } = await supabaseAdmin
      .from('investments')
      .select(`
        id, amount, investment_date, description, payment_method, 
        reference_number, upi_reference, created_at,
        investment_categories(category_name)
      `)
      .eq('partner_id', partnerId)
      .order('investment_date', { ascending: false });

    if (investmentError) {
      console.error('Error fetching investments:', investmentError);
    } else if (investments) {
      investments.forEach(inv => {
        transactions.push({
          id: `inv_${inv.id}`,
          date: inv.investment_date,
          type: 'investment',
          amount: inv.amount || 0,
          description: inv.description || 'Investment',
          payment_method: inv.payment_method || 'cash',
          reference_number: inv.reference_number,
          upi_reference: inv.upi_reference,
          category: (inv.investment_categories as { category_name?: string } | null)?.category_name,
          created_at: inv.created_at
        });
      });
    }

    // Fetch withdrawals
    const { data: withdrawals, error: withdrawalError } = await supabaseAdmin
      .from('withdrawals')
      .select(`
        id, amount, withdrawal_date, description, payment_method, 
        reference_number, upi_reference, created_at, withdrawal_type,
        withdrawal_categories(category_name),
        withdrawal_subcategories(subcategory_name)
      `)
      .eq('partner_id', partnerId)
      .order('withdrawal_date', { ascending: false});

    if (withdrawalError) {
      console.error('Error fetching withdrawals:', withdrawalError);
    } else if (withdrawals) {
      withdrawals.forEach(wd => {
        transactions.push({
          id: `wd_${wd.id}`,
          date: wd.withdrawal_date,
          type: 'withdrawal',
          withdrawal_type: wd.withdrawal_type || 'capital_withdrawal', // default to capital
          amount: wd.amount || 0,
          description: wd.description || 'Withdrawal',
          payment_method: wd.payment_method || 'cash',
          reference_number: wd.reference_number,
          upi_reference: wd.upi_reference,
          category: (wd.withdrawal_categories as { category_name?: string } | null)?.category_name,
          subcategory: (wd.withdrawal_subcategories as { subcategory_name?: string } | null)?.subcategory_name,
          created_at: wd.created_at
        });
      });
    }

    // Sort all transactions by date (most recent first)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate summary statistics
    const totalInvestments = transactions
      .filter(t => t.type === 'investment')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalWithdrawals = transactions
      .filter(t => t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate capital withdrawals only (for net equity calculation)
    // Only capital withdrawals reduce investment balance
    // Profit distributions and interest payments don't reduce the investment
    const capitalWithdrawals = withdrawals
      ?.filter(wd => wd.withdrawal_type === 'capital_withdrawal' || !wd.withdrawal_type) // default to capital for null
      .reduce((sum, wd) => sum + (wd.amount || 0), 0) || 0;

    // Fetch opening balance for this partner
    const { data: openingBalance, error: openingBalanceError } = await supabaseAdmin
      .from('opening_balances')
      .select('debit_amount, credit_amount, description')
      .eq('entity_id', partnerId)
      .eq('entity_type', 'partner')
      .single();

    let openingBalanceAmount = 0;
    if (!openingBalanceError && openingBalance) {
      // For partners, opening balance represents what partner owes or is owed
      openingBalanceAmount = (openingBalance.debit_amount || 0) - (openingBalance.credit_amount || 0);
    }

    // Net equity = total investments - only capital withdrawals
    const netEquity = totalInvestments - capitalWithdrawals;
    const balanceDue = openingBalanceAmount + netEquity; // Opening balance + current equity

    // Paginate results
    const paginatedTransactions = transactions.slice(offset, offset + limit);

    console.log(`Found ${transactions.length} total transactions for partner ${partner.name}`);

    return NextResponse.json({
      success: true,
      data: {
        partner: {
          id: partner.id,
          name: partner.name,
          type: partner.partner_type,
          email: partner.email,
          phone: partner.phone
        },
        summary: {
          total_investments: totalInvestments,
          total_withdrawals: totalWithdrawals,
          capital_withdrawals: capitalWithdrawals,
          profit_and_interest_withdrawals: totalWithdrawals - capitalWithdrawals,
          net_equity: netEquity,
          opening_balance: openingBalanceAmount,
          balance_due: balanceDue,
          transaction_count: transactions.length
        },
        transactions: paginatedTransactions,
        pagination: {
          page,
          limit,
          total: transactions.length,
          totalPages: Math.ceil(transactions.length / limit),
          hasMore: (page * limit) < transactions.length
        }
      }
    });

  } catch (error) {
    console.error('Error in partner-transactions API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch partner transactions' },
      { status: 500 }
    );
  }
}