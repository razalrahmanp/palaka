import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// GET - Fetch all active partners
export async function GET() {
  try {
    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .eq('is_active', true)
      .order('equity_percentage', { ascending: false })

    if (error) {
      console.error('Error fetching partners:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: partners || []
    })
    
  } catch (error) {
    console.error('Error fetching partners:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch partners' 
      },
      { status: 500 }
    )
  }
}

// POST - Create a new partner
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      email, 
      phone, 
      partner_type, 
      initial_investment, 
      equity_percentage, 
      notes 
    } = body

    if (!name || !partner_type) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Name and partner type are required' 
        },
        { status: 400 }
      )
    }

    // Validate equity percentage
    if (equity_percentage && (equity_percentage < 0 || equity_percentage > 100)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Equity percentage must be between 0 and 100' 
        },
        { status: 400 }
      )
    }

    // Check if email already exists
    if (email) {
      const { data: existing } = await supabase
        .from('partners')
        .select('id')
        .eq('email', email)
        .eq('is_active', true)
        .single()
      
      if (existing) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Email already exists for another partner' 
          },
          { status: 409 }
        )
      }
    }

    // Insert new partner
    const { data: newPartner, error } = await supabase
      .from('partners')
      .insert({
        name,
        email: email || null,
        phone: phone || null,
        partner_type,
        initial_investment: initial_investment || 0,
        equity_percentage: equity_percentage || 0,
        notes: notes || null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating partner:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: newPartner,
      message: 'Partner created successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating partner:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create partner' 
      },
      { status: 500 }
    )
  }
}

// PUT - Update an existing partner
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id, 
      name, 
      email, 
      phone, 
      partner_type, 
      initial_investment, 
      equity_percentage, 
      is_active, 
      notes 
    } = body

    if (!id || !name || !partner_type) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID, name, and partner type are required' 
        },
        { status: 400 }
      )
    }

    // Validate equity percentage
    if (equity_percentage && (equity_percentage < 0 || equity_percentage > 100)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Equity percentage must be between 0 and 100' 
        },
        { status: 400 }
      )
    }

    // Check if email conflicts with another partner
    if (email) {
      const { data: conflict } = await supabase
        .from('partners')
        .select('id')
        .eq('email', email)
        .neq('id', id)
        .eq('is_active', true)
        .single()
      
      if (conflict) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Email already exists for another partner' 
          },
          { status: 409 }
        )
      }
    }

    // Update partner
    const { data: updatedPartner, error } = await supabase
      .from('partners')
      .update({
        name,
        email: email || null,
        phone: phone || null,
        partner_type,
        initial_investment: initial_investment || 0,
        equity_percentage: equity_percentage || 0,
        is_active: is_active !== undefined ? is_active : true,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating partner:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: updatedPartner,
      message: 'Partner updated successfully'
    })
    
  } catch (error) {
    console.error('Error updating partner:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update partner' 
      },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete a partner (mark as inactive)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Partner ID is required' 
        },
        { status: 400 }
      )
    }

    // Check if partner has investments or withdrawals
    const { data: investments } = await supabase
      .from('investments')
      .select('id')
      .eq('partner_id', id)

    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select('id')
      .eq('partner_id', id)
    
    const hasActivity = (investments && investments.length > 0) || (withdrawals && withdrawals.length > 0)
    
    if (hasActivity) {
      // Soft delete - mark as inactive
      const { data: updatedPartner, error } = await supabase
        .from('partners')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('id, name, is_active')
        .single()

      if (error) {
        console.error('Error deactivating partner:', error)
        return NextResponse.json(
          { 
            success: false, 
            error: error.message 
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: updatedPartner,
        message: `Partner deactivated (has ${investments?.length || 0} investments and ${withdrawals?.length || 0} withdrawals)`
      })
    } else {
      // Hard delete if no activity
      const { data: deletedPartner, error } = await supabase
        .from('partners')
        .delete()
        .eq('id', id)
        .select('id, name')
        .single()

      if (error) {
        console.error('Error deleting partner:', error)
        return NextResponse.json(
          { 
            success: false, 
            error: error.message 
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: deletedPartner,
        message: 'Partner deleted successfully'
      })
    }
    
  } catch (error) {
    console.error('Error deleting partner:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete partner' 
      },
      { status: 500 }
    )
  }
}