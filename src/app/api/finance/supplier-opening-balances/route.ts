import { NextResponse, NextRequest } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      entity_id,
      entity_type,
      debit_amount,
      credit_amount,
      description,
      reference_number
    } = data;

    // Validate required fields
    if (!entity_id || !entity_type) {
      return NextResponse.json(
        { success: false, error: 'Entity ID and type are required' },
        { status: 400 }
      );
    }

    // Check if opening balance already exists for this supplier/entity
    const { data: existingBalance } = await supabaseAdmin
      .from('opening_balances')
      .select('id')
      .eq('entity_id', entity_id)
      .eq('entity_type', entity_type)
      .single();

    if (existingBalance) {
      // Update existing opening balance
      const { data: updatedBalance, error } = await supabaseAdmin
        .from('opening_balances')
        .update({
          debit_amount: parseFloat(debit_amount) || 0,
          credit_amount: parseFloat(credit_amount) || 0,
          description,
          reference_number,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingBalance.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating supplier opening balance:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to update opening balance' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: updatedBalance,
        message: 'Opening balance updated successfully'
      });
    } else {
      // Create new opening balance
      const { data: newBalance, error } = await supabaseAdmin
        .from('opening_balances')
        .insert({
          entity_id,
          entity_type,
          debit_amount: parseFloat(debit_amount) || 0,
          credit_amount: parseFloat(credit_amount) || 0,
          description,
          reference_number,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating supplier opening balance:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to create opening balance' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: newBalance,
        message: 'Opening balance created successfully'
      });
    }

  } catch (error) {
    console.error('Error in supplier opening balances API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entity_id = searchParams.get('entity_id');
    const entity_type = searchParams.get('entity_type');

    let query = supabaseAdmin
      .from('opening_balances')
      .select('*')
      .order('created_at', { ascending: false });

    if (entity_id) {
      query = query.eq('entity_id', entity_id);
    }

    if (entity_type) {
      query = query.eq('entity_type', entity_type);
    }

    const { data: openingBalances, error } = await query;

    if (error) {
      console.error('Error fetching supplier opening balances:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch opening balances' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: openingBalances
    });

  } catch (error) {
    console.error('Error in supplier opening balances GET API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
