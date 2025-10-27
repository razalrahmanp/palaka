import { supabase } from '@/lib/supabasePool';
import { NextRequest, NextResponse } from 'next/server';

// Handler for GET requests to fetch trucks
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const select = searchParams.get('select');
    const refresh = searchParams.get('refresh') === 'true';
    const timestamp = searchParams.get('_t');
    
    console.log('🚛 Fetching trucks...', {
      refresh,
      timestamp,
      bypassCache: refresh || !!timestamp,
      select
    });

    try {
        const query = supabase
            .from('trucks')
            .select(select || 'id, plate_number, model, year, capacity_items, fuel_type, status, current_driver_id')
            .in('status', ['available', 'in_use', 'maintenance']) // Include trucks that can be used for expenses
            .order('plate_number', { ascending: true });

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        const response = NextResponse.json(data);
        
        // Add cache-busting headers when refresh is requested
        if (refresh || timestamp) {
          response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
          response.headers.set('Pragma', 'no-cache');
          response.headers.set('Expires', '0');
        }
        
        return response;
    } catch (error) {
        console.error('GET /api/trucks error:', error);
        return NextResponse.json({ error: error }, { status: 500 });
    }
}

// Handler for POST requests to create a new truck
export async function POST(req: NextRequest) {
    try {
        const { plate_number, model, year, capacity_items, fuel_type } = await req.json();

        if (!plate_number || !model) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('trucks')
            .insert([{ plate_number, model, year, capacity_items, fuel_type }])
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('POST /api/trucks error:', error);
        return NextResponse.json({ error: 'Failed to create truck' }, { status: 500 });
    }
}
