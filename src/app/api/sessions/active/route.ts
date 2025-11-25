import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    const { sessionId, localIp } = body;

    if (!sessionId) {
      console.error('Missing sessionId in request body');
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

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
      localIp: localIp || null, // Store local IP in device_info
    };

    // Upsert session (insert or update last_seen)
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('active_app_instances')
      .upsert({
        session_id: sessionId,
        client_ip: clientIp,
        user_agent: userAgent,
        device_info: deviceInfo,
        location_hint: localIp || null, // Store local IP in location_hint column
        last_seen: now,
        first_seen: now, // Will be ignored on update due to DEFAULT
        is_active: true,
      }, {
        onConflict: 'session_id',
        ignoreDuplicates: false, // Always update on conflict
      });

    if (error) {
      console.error('Error tracking session:', error);
      console.error('Session data:', { sessionId, clientIp, localIp });
      return NextResponse.json({ error: 'Failed to track session', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session tracking error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal error', details: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    // Try to cleanup stale sessions (optional - don't fail if RPC doesn't exist)
    try {
      await supabase.rpc('cleanup_stale_sessions');
    } catch (cleanupError) {
      console.warn('Cleanup function not available:', cleanupError);
      // Continue anyway - cleanup is optional
    }

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
