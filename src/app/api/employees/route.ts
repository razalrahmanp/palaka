import { supabase } from '@/lib/supabasePool';
import { NextRequest, NextResponse } from 'next/server';

// Handler for GET requests to fetch employees
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    // This allows fetching specific columns, e.g., for dropdowns
    const select = searchParams.get('select');

    try {
        const query = supabase
            .from('employees')
            .select(select || '*')
            .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('GET /api/employees error:', error);
        return NextResponse.json({ error: error }, { status: 500 });
    }
}

// Handler for POST requests to create a new employee
export async function POST(req: NextRequest) {
    try {
        const { name, email, position, salary } = await req.json();

        if (!name || !email || !position || !salary) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('employees')
            .insert([{ name, email, position, salary }])
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('POST /api/employees error:', error);
        return NextResponse.json({ error: error }, { status: 500 });
    }
}
