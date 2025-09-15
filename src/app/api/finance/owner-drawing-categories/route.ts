import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    const { data: categories, error } = await supabase
      .from('owner_drawing_categories')
      .select('*')
      .eq('is_active', true)
      .order('category_name');

    if (error) {
      console.error('Error fetching owner drawing categories:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories: categories || [] });
  } catch (error) {
    console.error('Error in owner drawing categories API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { category_name, description } = await request.json();

    if (!category_name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const { data: newCategory, error } = await supabase
      .from('owner_drawing_categories')
      .insert({
        category_name,
        description
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating owner drawing category:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ category: newCategory }, { status: 201 });
  } catch (error) {
    console.error('Error in owner drawing categories POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}