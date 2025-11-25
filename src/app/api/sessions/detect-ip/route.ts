import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to help detect client's local IP
 * Returns the IP that reached this endpoint (may be public or private depending on network)
 */
export async function GET(request: NextRequest) {
  try {
    // Try to get the real client IP from various headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0] || realIp || 'unknown';

    return NextResponse.json({
      localIp: clientIp,
      headers: {
        'x-forwarded-for': forwardedFor,
        'x-real-ip': realIp,
      },
    });
  } catch (error) {
    console.error('Error detecting IP:', error);
    return NextResponse.json(
      { error: 'Failed to detect IP' },
      { status: 500 }
    );
  }
}
