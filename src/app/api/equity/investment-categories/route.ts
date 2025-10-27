import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// GET - Fetch all active investment categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';
    const timestamp = searchParams.get('_t');
    
    console.log('💰 Fetching investment categories...', {
      refresh,
      timestamp,
      bypassCache: refresh || !!timestamp
    });
    const { data: categories, error } = await supabase
      .from('investment_categories')
      .select('*')
      .eq('is_active', true)
      .order('category_name')

    if (error) {
      console.error('Error fetching investment categories:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 500 }
      )
    }
    
    const response = NextResponse.json({
      success: true,
      data: categories || []
    })
    
    // Add cache-busting headers when refresh is requested
    if (refresh || timestamp) {
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }
    
    return response
    
  } catch (error) {
    console.error('Error fetching investment categories:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch investment categories' 
      },
      { status: 500 }
    )
  }
}

// POST - Create a new investment category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category_name, description, chart_account_code } = body

    if (!category_name) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Category name is required' 
        },
        { status: 400 }
      )
    }

    // Check if category already exists
    const { data: existing } = await supabase
      .from('investment_categories')
      .select('id')
      .eq('category_name', category_name)
      .single()
    
    if (existing) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Category with this name already exists' 
        },
        { status: 409 }
      )
    }

    // Insert new category
    const { data: newCategory, error } = await supabase
      .from('investment_categories')
      .insert({
        category_name,
        description: description || null,
        chart_account_code: chart_account_code || '3100',
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating investment category:', error)
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
      data: newCategory,
      message: 'Investment category created successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating investment category:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create investment category' 
      },
      { status: 500 }
    )
  }
}