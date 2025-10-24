import { NextRequest, NextResponse } from 'next/server';
import { ESSLConnector } from '@/lib/essl/connector';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Device users API received body:', body);
    const { ip, port } = body;
    console.log('Extracted IP:', ip, 'Port:', port);

    if (!ip || !port) {
      return NextResponse.json(
        { success: false, error: 'IP address and port are required' },
        { status: 400 }
      );
    }

    const connector = new ESSLConnector({ ip, port });

    try {
      // Connect to device
      await connector.connect();

      // Get enrolled users
      const users = await connector.getUsers();

      // Disconnect
      await connector.disconnect();

      return NextResponse.json({
        success: true,
        users: users,
        message: `Successfully fetched ${users.length} users`,
      });
    } catch (error) {
      await connector.disconnect();
      throw error;
    }
  } catch (error: unknown) {
    console.error('Device users fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch device users',
      },
      { status: 500 }
    );
  }
}
