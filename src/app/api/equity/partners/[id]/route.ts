import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch specific partner
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: partnerId } = await params;

    const { data: partner, error } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .single();

    if (error) {
      console.error('Error fetching partner:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      partner
    });

  } catch (error) {
    console.error('Error in partner GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update partner
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: partnerId } = await params;
    const body = await request.json();
    
    const {
      name,
      email,
      phone,
      partner_type,
      initial_investment,
      equity_percentage,
      notes,
      is_active
    } = body;

    // Validation
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Partner name is required' }, { status: 400 });
    }

    if (initial_investment && (isNaN(parseFloat(initial_investment)) || parseFloat(initial_investment) < 0)) {
      return NextResponse.json({ error: 'Initial investment must be a valid positive number' }, { status: 400 });
    }

    if (equity_percentage && (isNaN(parseFloat(equity_percentage)) || parseFloat(equity_percentage) < 0 || parseFloat(equity_percentage) > 100)) {
      return NextResponse.json({ error: 'Equity percentage must be between 0 and 100' }, { status: 400 });
    }

    // Check if partner exists
    const { data: existingPartner } = await supabase
      .from('partners')
      .select('id')
      .eq('id', partnerId)
      .single();

    if (!existingPartner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Check if email is unique (if provided and changed)
    if (email?.trim()) {
      const { data: emailCheck } = await supabase
        .from('partners')
        .select('id')
        .eq('email', email.trim())
        .neq('id', partnerId)
        .single();

      if (emailCheck) {
        return NextResponse.json({ error: 'Email already exists for another partner' }, { status: 409 });
      }
    }

    // Update partner
    const { data: updatedPartner, error: updateError } = await supabase
      .from('partners')
      .update({
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        partner_type: partner_type || 'partner',
        initial_investment: initial_investment ? parseFloat(initial_investment) : 0,
        equity_percentage: equity_percentage ? parseFloat(equity_percentage) : 0,
        notes: notes?.trim() || null,
        is_active: Boolean(is_active),
        updated_at: new Date().toISOString()
      })
      .eq('id', partnerId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating partner:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      partner: updatedPartner,
      message: 'Partner updated successfully'
    });

  } catch (error) {
    console.error('Error in partner PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete partner
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: partnerId } = await params;

    // Check if partner exists
    const { data: existingPartner } = await supabase
      .from('partners')
      .select('id, name')
      .eq('id', partnerId)
      .single();

    if (!existingPartner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Check for existing investments
    const { data: investments } = await supabase
      .from('investments')
      .select('id')
      .eq('partner_id', partnerId)
      .limit(1);

    // Check for existing withdrawals
    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select('id')
      .eq('partner_id', partnerId)
      .limit(1);

    if (investments && investments.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete partner with existing investment records. Please remove all investments first.' 
      }, { status: 400 });
    }

    if (withdrawals && withdrawals.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete partner with existing withdrawal records. Please remove all withdrawals first.' 
      }, { status: 400 });
    }

    // Delete the partner
    const { error: deleteError } = await supabase
      .from('partners')
      .delete()
      .eq('id', partnerId);

    if (deleteError) {
      console.error('Error deleting partner:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Partner ${existingPartner.name} deleted successfully`
    });

  } catch (error) {
    console.error('Error in partner DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}