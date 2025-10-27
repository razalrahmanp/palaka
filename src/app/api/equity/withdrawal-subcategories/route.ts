import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// GET - Fetch all active withdrawal subcategories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';
    const timestamp = searchParams.get('_t');
    
    console.log('📤 Fetching withdrawal subcategories...', {
      refresh,
      timestamp,
      bypassCache: refresh || !!timestamp
    });
    const { data: subcategories, error } = await supabase
      .from('withdrawal_subcategories')
      .select(`
        id,
        subcategory_name,
        description,
        category_id,
        is_active,
        withdrawal_categories (
          id,
          category_name
        )
      `)
      .eq('is_active', true)
      .order('subcategory_name')

    if (error) {
      console.error('Error fetching withdrawal subcategories:', error)
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
      data: subcategories || []
    })
    
    // Add cache-busting headers when refresh is requested
    if (refresh || timestamp) {
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }
    
    return response
    
  } catch (error) {
    console.error('Error fetching withdrawal subcategories:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch withdrawal subcategories' 
      },
      { status: 500 }
    )
  }
}

// POST - Create a new withdrawal subcategory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subcategory_name, description, category_id } = body

    // Validation
    if (!subcategory_name || typeof subcategory_name !== 'string' || subcategory_name.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Subcategory name is required and must be a non-empty string' 
        },
        { status: 400 }
      )
    }

    if (!category_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Category ID is required' 
        },
        { status: 400 }
      )
    }

    // Check if subcategory with same name exists in the same category
    const { data: existingSubcategory } = await supabase
      .from('withdrawal_subcategories')
      .select('id, subcategory_name')
      .eq('subcategory_name', subcategory_name.trim())
      .eq('category_id', category_id)
      .eq('is_active', true)
      .single()

    if (existingSubcategory) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Withdrawal subcategory '${subcategory_name.trim()}' already exists in this category` 
        },
        { status: 409 }
      )
    }

    // Create the new subcategory
    const { data: newSubcategory, error: insertError } = await supabase
      .from('withdrawal_subcategories')
      .insert([
        {
          subcategory_name: subcategory_name.trim(),
          description: description?.trim() || null,
          category_id: category_id,
          is_active: true
        }
      ])
      .select()
      .single()

    if (insertError) {
      console.error('Error creating withdrawal subcategory:', insertError)
      return NextResponse.json(
        { 
          success: false, 
          error: insertError.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Withdrawal subcategory created successfully',
      data: newSubcategory
    })

  } catch (error) {
    console.error('Error creating withdrawal subcategory:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create withdrawal subcategory' 
      },
      { status: 500 }
    )
  }
}