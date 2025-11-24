import { NextResponse } from 'next/server';
import { createESSLConnector } from '@/lib/essl/connector';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { deviceId } = await request.json();

    // Get device details
    const { data: device, error: deviceError } = await supabase
      .from('essl_devices')
      .select('*')
      .eq('id', deviceId)
      .eq('is_active', true)
      .single();

    if (deviceError || !device) {
      return NextResponse.json({
        reachable: false,
        error: 'Device not found or inactive'
      });
    }

    try {
      // Quick connection test with 3-second timeout
      const connector = createESSLConnector(device.ip_address, device.port || 4370, {
        timeout: 3000,
        maxRetries: 1,
        retryDelay: 1000
      });

      await connector.connect();
      await connector.disconnect();

      return NextResponse.json({
        reachable: true,
        deviceId: device.id,
        deviceName: device.device_name,
        ipAddress: device.ip_address,
        port: device.port || 4370
      });
    } catch (error) {
      // Device not reachable
      return NextResponse.json({
        reachable: false,
        deviceId: device.id,
        deviceName: device.device_name,
        error: error instanceof Error ? error.message : 'Connection failed'
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        reachable: false,
        error: error instanceof Error ? error.message : 'Check failed'
      },
      { status: 500 }
    );
  }
}

// Check all active devices
export async function GET() {
  try {
    const { data: devices, error } = await supabase
      .from('essl_devices')
      .select('*')
      .eq('is_active', true);

    if (error || !devices || devices.length === 0) {
      return NextResponse.json({
        success: false,
        reachableDevices: [],
        totalDevices: 0
      });
    }

    const results = await Promise.all(
      devices.map(async (device) => {
        try {
          const connector = createESSLConnector(device.ip_address, device.port || 4370, {
            timeout: 3000,
            maxRetries: 1,
            retryDelay: 1000
          });

          await connector.connect();
          await connector.disconnect();

          return {
            deviceId: device.id,
            deviceName: device.device_name,
            ipAddress: device.ip_address,
            reachable: true
          };
        } catch {
          return {
            deviceId: device.id,
            deviceName: device.device_name,
            ipAddress: device.ip_address,
            reachable: false
          };
        }
      })
    );

    const reachableDevices = results.filter(r => r.reachable);

    return NextResponse.json({
      success: true,
      reachableDevices,
      totalDevices: devices.length,
      reachableCount: reachableDevices.length
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Check failed'
      },
      { status: 500 }
    );
  }
}
