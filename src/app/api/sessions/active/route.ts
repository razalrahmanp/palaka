import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    const { sessionId } = body;

    // Get client IP and user agent
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Parse user agent for device info
    const deviceInfo = {
      userAgent,
      browser: parseBrowser(userAgent),
      os: parseOS(userAgent),
    };

    // Upsert session (insert or update last_seen)
    const { error } = await supabase
      .from('active_app_instances')
      .upsert({
        session_id: sessionId,
        client_ip: clientIp,
        user_agent: userAgent,
        device_info: deviceInfo,
        last_seen: new Date().toISOString(),
        is_active: true,
      }, {
        onConflict: 'session_id',
      });

    if (error) {
      console.error('Error tracking session:', error);
      return NextResponse.json({ error: 'Failed to track session' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session tracking error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    // Cleanup stale sessions first
    await supabase.rpc('cleanup_stale_sessions');

    // Get all active instances
    const { data: instances, error } = await supabase
      .from('active_app_instances')
      .select('*')
      .eq('is_active', true)
      .order('last_seen', { ascending: false });

    if (error) {
      console.error('Error fetching active instances:', error);
      return NextResponse.json({ error: 'Failed to fetch instances' }, { status: 500 });
    }

    return NextResponse.json({
      instances: instances || [],
      total: instances?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching active instances:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function parseBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
}

function parseOS(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
}
