/**
 * ESSL Device Test Connection API
 * Tests connectivity to the ESSL biometric device
 */

import { NextResponse } from 'next/server';
import { createESSLConnector } from '@/lib/essl/connector';

export async function POST(request: Request) {
  try {
    const { ip, port = 4370 } = await request.json();

    if (!ip) {
      return NextResponse.json(
        { error: 'IP address is required' },
        { status: 400 }
      );
    }

    console.log(`Testing connection to device at ${ip}:${port}`);

    const connector = createESSLConnector(ip, port);
    
    // Test connection
    await connector.connect();
    const deviceInfo = await connector.getDeviceInfo();
    await connector.disconnect();

    return NextResponse.json({
      success: true,
      message: 'Connection successful',
      deviceInfo: {
        serialNumber: deviceInfo.serialNumber,
        firmwareVersion: deviceInfo.firmwareVersion,
        platform: deviceInfo.platform,
        deviceName: deviceInfo.deviceName,
        enrolledUsers: deviceInfo.userCount,
        attendanceLogs: deviceInfo.logCount,
        logCapacity: deviceInfo.logCapacity,
      },
    });
  } catch (error) {
    console.error('Connection test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      },
      { status: 500 }
    );
  }
}
