import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (deviceId) {
      // Get status for specific device
      const { data, error } = await supabase
        .rpc('get_latest_sync_status', { p_device_id: deviceId });

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: data && data.length > 0 ? data[0] : null
      });
    } else {
      // Get status for all devices
      const { data, error } = await supabase
        .rpc('get_all_devices_sync_status');

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: data || []
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sync status'
      },
      { status: 500 }
    );
  }
}
