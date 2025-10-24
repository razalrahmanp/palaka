import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {

    // Get sync logs with device information
    const { data: logs, error } = await supabase
      .from('device_sync_logs')
      .select(`
        *,
        device:essl_devices(device_name)
      `)
      .order('sync_timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching sync logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sync logs' },
        { status: 500 }
      );
    }

    return NextResponse.json(logs || []);
  } catch (error) {
    console.error('Sync logs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync logs' },
      { status: 500 }
    );
  }
}
