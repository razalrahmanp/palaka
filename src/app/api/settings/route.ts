import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Group settings by category for easier consumption
    const groupedSettings = settings.reduce((acc: Record<string, unknown[]>, setting: Record<string, unknown>) => {
      const category = setting.category as string;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(setting);
      return acc;
    }, {});

    return NextResponse.json(groupedSettings);
  } catch (error) {
    console.error('Error in settings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, category, description, data_type = 'string' } = body;

    if (!key || value === undefined || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: key, value, category' },
        { status: 400 }
      );
    }

    const { data: setting, error } = await supabase
      .from('system_settings')
      .insert([{
        key,
        value: JSON.stringify(value),
        category,
        description,
        data_type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating setting:', error);
      return NextResponse.json({ error: 'Failed to create setting' }, { status: 500 });
    }

    return NextResponse.json(setting, { status: 201 });
  } catch (error) {
    console.error('Error in settings POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
